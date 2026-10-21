# Security Documentation

## Overview

Guess X implements security controls aligned with the OWASP Top 10 (2021). This document outlines the security architecture, configuration requirements, and operational best practices.

---

## Environment Variables

### Required

| Variable | Description | Services |
|----------|-------------|----------|
| `JWT_SECRET` | 64+ char hex string for JWT signing (HS256). Must be identical across all services. | identity, auction-engine, query-service |
| `JWT_REFRESH_SECRET` | 64+ char hex string for refresh token signing. Must differ from `JWT_SECRET`. | identity-service |
| `INTERNAL_API_KEY` | Shared secret for service-to-service authentication. Must be identical across identity-service and auction-engine. | identity, auction-engine |
| `DATABASE_URL` | PostgreSQL connection string. | all |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000,http://localhost` | Comma-separated allowed CORS origins |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `IDENTITY_SERVICE_URL` | `http://localhost:3001` | Internal URL for identity-service |

### Generating Strong Secrets

```bash
# Generate 64-char hex strings
openssl rand -hex 32
```

Generate three unique values for `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `INTERNAL_API_KEY`. Never reuse a secret across different purposes.

---

## Authentication & Authorization

### JWT Tokens
- **Algorithm**: HS256 (symmetric)
- **Access token expiry**: 15 minutes
- **Refresh token expiry**: 7 days
- **Refresh token rotation**: old token is hashed with bcrypt and replaced on each refresh
- **Paylod**: `sub` (user ID), `phone`, `role`, `wallet_balance`

### Hardcoded Secret Protection
The application **refuses to start** if `JWT_SECRET` equals the well-known default `guessx-jwt-secret`. The env validation and app config in each service explicitly check for and reject default values.

### Fail-Closed JWT Guards
All services (`identity-service`, `auction-engine`, `query-service`) enforce a strict fail-closed authentication pattern:
- If `JwtService` is uninitialized or unconfigured in the request context, `JwtAuthGuard` explicitly denies requests with `401 Unauthorized` (`Authentication service unavailable`).
- Unauthenticated passthrough is strictly disallowed.

### Deposit Idempotency
- `POST /wallet/deposit` accepts an optional client-provided `reference_id` (idempotency key).
- Retried requests containing an existing `reference_id` return the user's current wallet balance without re-applying the balance increment.
- When omitted, references default to cryptographically unique user-scoped keys: `deposit_${userId}_${Date.now()}_${randomNonce}`.

### Ban Enforcement
JWT validation in identity-service queries `user.is_banned` from the database. Auction-engine maintains a Redis set `guessx:banned-users` checked on every authenticated request.

### Wallet PIN
- 4-6 digit numeric PIN
- Hashed with bcrypt (cost factor 10)
- Lockout after 5 failed attempts, 30-minute duration
- Attempt counter resets on successful verification
- **Payment Verification Session**: Successful verification via `POST /api/v1/wallet/verify-pin` sets a 300-second single-use session in shared Redis (`guessx:wallet:pin-verified:${userId}`). `POST /payments/bid-fee/:id/wallet-pay` and `POST /payments/:id/wallet-pay` enforce this session, rejecting unverified wallet payments with `403 Forbidden` and consuming the key immediately upon payment to prevent stolen JWT wallet drain.

---

## Internal Service Communication

Service-to-service calls (auction-engine -> identity-service) use a shared `INTERNAL_API_KEY` sent via the `x-internal-api-key` header.

### Endpoints Requiring Internal Auth

| Endpoint | Service | Purpose |
|----------|---------|---------|
| `POST /api/v1/notify/*` | identity | Push/SMS/in-app notifications |
| `POST /api/v1/admin/audit/log` | identity | Audit log ingestion |
| `GET /api/v1/wallet/user/:id/internal` | identity | Winner info resolution |

All internal fetch calls include:

```
x-internal-api-key: <INTERNAL_API_KEY>
```

**Never expose the `INTERNAL_API_KEY` to clients or the browser.**

---

## Rate Limiting

| Endpoint | Limit | Window | Backend |
|----------|-------|--------|---------|
| Login (email & phone) | 5 attempts | 60 seconds per identifier | Redis |
| Bid placement | 10 requests | 1 second per user | Redis |
| OTP generation | 3 requests | 60 seconds per phone number | Redis |

---

## Replay & CSRF Protection

### Nonce Guard (Bidding)
- Requires `x-bid-nonce` and `x-bid-timestamp` headers
- 30-second clock skew tolerance
- 60-second nonce expiry in Redis
- NX flag prevents double-use of any nonce

### CSRF Guard
- HMAC-SHA256 token validation using `INTERNAL_API_KEY` as secret
- Cookie + header pattern (`csrf-token` cookie, `x-csrf-token` header)
- Skipped for GET/HEAD/OPTIONS

### Webhook Signatures
- HMAC-SHA256 with timing-safe comparison
- Timestamp tolerance of 300 seconds
- Prevents replay of captured webhook payloads

---

## SSRF Protection

The `ImageService` enforces these controls when downloading product images:

1. **HTTPS only** — HTTP URLs are rejected
2. **Private IP blocking** — localhost, 10.x, 172.16-31.x, 192.168.x, 127.x ranges
3. **Extension validation** — only `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp` allowed
4. **MIME validation** — response `Content-Type` must be an image MIME type
5. **15-second timeout** — prevents slowloris-style attacks

---

## Logging & Monitoring

### Audit Logging
Failed login attempts are logged via the internal audit endpoint with:
- Actor identifier (email/phone)
- Action type (`LOGIN_FAILED`)
- Reason (`invalid_credentials`)
- Timestamp

### OTP Security
OTP codes are never logged. Phone numbers are partially masked in logs: `091*****99`.

### Sensitive Data in Logs
- No passwords, tokens, or secrets are logged
- Payment gateway request bodies are logged but exclude full card/PAN data
- Stack traces are never returned to the client (global exception filter)

---

## Webhook Security

| Gateway | Verification | Tolerance |
|---------|-------------|-----------|
| SikinaPay | HMAC-SHA256, timestamp + raw body | 300 seconds |
| Awash Bank | HMAC-SHA256, timestamp + raw body | 300 seconds |
| Fintech (internal) | HMAC-SHA256, timestamp + raw body | 300 seconds |

### Payment Settlement & Webhook Idempotency
- Webhook handlers enforce unique transaction updates on `client_reference_id` with atomic status updates (`Not(PaymentTransactionStatus.SUCCESSFUL)`).
- Auction winner payment settlement (`markAsPaid`) is fully idempotent: if a duplicate webhook or background reconciliation triggers settlement for an auction or winner already marked `PAID`, the operation safely exits without raising state errors or re-running unnecessary winner recalculations.

### Concurrency Locks & Payment Race Prevention
- Wallet bid fee payments (`createBidFeeWalletPayment`) and winning auction payments (`createWinningWalletPayment`) acquire a distributed Redis lock (`guessx:bid-fee:${auctionId}:${userId}:lock` / `guessx:winning-pay:${auctionId}:${userId}:lock`) with a 10-second TTL before processing. Concurrent calls during an active transaction are rejected with HTTP 400 (`Payment is currently being processed. Please retry in a few seconds.`), preventing double-deduction race conditions.
- Released locks utilize atomic Lua comparison scripts matching unique process tokens.

### Auction Integrity, Fair Play & Separation of Duties
- **Bid Extension Cap**: Auctions are restricted to a maximum of 10 automatic extensions (`MAX_AUCTION_EXTENSIONS = 10`). If minimum bids or unique winners are not achieved after 10 extensions, the auction expires to prevent infinite loops and resource starvation.
- **Per-User Bid Limit**: Users are limited to a maximum of 150 bids per auction (`MAX_BIDS_PER_USER_PER_AUCTION = 150`), preventing full bid-space coverage attacks.
- **Admin Bid Prohibition**: Administrators are strictly blocked from placing bids on auctions (`403 Forbidden`).
- **Conflict of Interest Guard**: Administrative early closures and force-closures verify that the acting administrator has placed no historical bids on that auction before executing closure.

---

## Database Security

- TypeORM `synchronize: false` — all schema changes require explicit migrations
- Pessimistic write locking on wallet balance operations
- Parameterized queries for all SQL (no raw string interpolation)
- `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` on all endpoints

---

## Deployment Checklist

Before deploying to production:

1. Generate unique secrets for `JWT_SECRET`, `JWT_REFRESH_SECRET`, `INTERNAL_API_KEY`
2. Set `CORS_ORIGINS` to the production domain(s)
3. Ensure `NODE_ENV=production` (disables SQL query logging)
4. Verify all `.env` files are in `.gitignore` (they are tracked in development but must **not** be committed)
5. Configure HTTPS ingress with TLS certificates
6. Set `SIKINA_BASE_URL` and `AWASH_BASE_URL` to production API endpoints
7. Review and rotate all payment gateway secrets
8. Verify WebSocket CORS origins match the frontend domain

---

## Reporting a Vulnerability

For security issues, please open a GitHub issue with the label `security` or contact the maintainers directly. Do not disclose vulnerabilities publicly until they have been addressed.
