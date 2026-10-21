SOFTWARE REQUIREMENTS SPECIFICATION (SRS)
Guess X Auction Platform — "Bid Low. Be Unique. Win Big!"
Version: 4.1 (Enhanced Enterprise Specification)
Tech Stack: NestJS, React, React Native (Expo), PostgreSQL, Redis, BullMQ, Socket.io

SECTION 1: INTRODUCTION & SCOPE
1.1 Purpose
The Guess X platform is a mobile-first (Android/iOS) and web-based auction system utilizing a Lowest Unique Bid (LUB) mechanism. The winning bidder is the participant who submits the lowest unique monetary bid (up to 2 decimal places) prior to auction countdown expiration.

1.2 Core Business Rules & Principles
1. Lowest Unique Bid Algorithm: If ETB 1.00 is submitted twice, ETB 2.50 once, ETB 3.00 twice, and ETB 4.00 once, the lowest unique bid is ETB 2.50 — that participant wins.
2. Bid Format & Precision: Bid amounts support exactly 2 decimal places (e.g., 10.50, 23.45, 1000.00, 92047.23). The minimum bid value is 1.00 ETB. The upper boundary corresponds to the storage capacity of the `bids.amount` column (`DECIMAL(12,2)`, max 9,999,999,999.99 ETB). All client inputs accept this full numerical range and normalize inputs to 2 decimal places on blur.
3. Administrator Bidding Prohibition: Administrators and staff with administrative privileges are strictly prohibited from participating in bidding. This governance control is enforced immediately at the point of bid or fee initiation (generating payment links or wallet fee deductions), returning HTTP 403: "Administrators are not allowed to participate in bidding."
4. Fair-Play Extensions & Lifecycle Closure:
   - Rule 1 (No Bidders – First Round): If an auction ends with zero bids, no winner is selected and the auction automatically extends by 7 days (1 week).
   - Rule 2 (Repeated No-Bid Extensions): Weekly 7-day extensions repeat if zero bids persist, up to a maximum limit of 10 extensions (10 weeks total).
   - Rule 3 (Final Closure): After the 10th extension, if no bids exist, the auction closes permanently and transitions to the Closed Auctions list (visible exclusively to administrators). An automated alert is dispatched to administrators: "This auction has been open for the last X days but received no bidders."
   - Rule 4 (Limited Bidders Rule): If an auction closes with fewer than 100 unique bidders (or below the configured `min_bid` count), it extends weekly by 7 days up to the maximum 10-extension limit before final closure.
   - Rule 5 (Administrative Controls): Administrators maintain operational oversight of closed auctions via dedicated administrative APIs, with capabilities to force-close or reopen eligible inventory.

1.3 Scope
The system includes:
1. Cross-platform Web (React + Vite) and Native Mobile (React Native / Expo) clients.
2. A 3-microservice distributed backend (Identity & Wallet, Auction Engine, Query Service).
3. Secure user authentication (phone + credential hash), wallet ledger management, real-time bidding, and algorithmic winner resolution via Redis ZSETs.
4. Integrated wallet and SikinaPay payment workflows.
5. Multi-winner lowest unique bid resolution and UNCITRAL/ICC compliant secondary winner default escalation.
6. Defense-in-depth security controls aligned with OWASP Top 10 standards.

SECTION 2: FUNCTIONAL REQUIREMENTS (FR)
FR-01: User Authentication & Profile
  FR-01.1: Register and login using mobile phone number + credential hash (bcrypt, cost 12).
  FR-01.2: JWT-based authentication with 15-minute access tokens and rolling 7-day refresh tokens. Automatic transparent token refresh on HTTP 401 responses.
  FR-01.3: Dedicated 4-digit Wallet PIN (distinct from authentication credentials) required to authorize bid fee deductions and winning settlements. Enforces a 5-attempt lockout (30-minute duration).
  FR-01.4: Profile viewing endpoints displaying bidding history, active claims, and wallet transaction ledgers.
  FR-01.5: Seed data generation provisioning test users and administrative accounts with predictable credentials for automated testing.
  FR-01.6: Redis-backed rate limiting restricting authentication attempts to 5 per minute per identifier to neutralize brute-force attacks.
  FR-01.7: Immutable security audit logging for all authentication events and failed credential attempts.

FR-02: Auction Bidding Engine
  FR-02.1 (Bid Placement): Participants enter a bid amount (2-decimal precision, min 1.00 ETB) and pay a non-refundable bid service fee before bid recording.
  FR-02.2 (Bid Service Fee & Bounds): Fee is deducted atomically via the identity service. The fee amount must reside within calibrated bounds: minimum 1.00 ETB, maximum 10,000.00 ETB (`@Min(1.00)`, `@Max(10000)`).
  FR-02.3 (Administrator Bidding Restriction): The system validates the participant's role prior to bid initiation. If `role === 'admin'`, the operation is blocked immediately with message: "Administrators are not allowed to participate in bidding."
  FR-02.4 (Real-Time Broadcasting): Socket.io broadcasts updated bid counts and activity indicators to subscribed clients within 500ms.
  FR-02.5 (Algorithmic LUB Calculation): Redis ZSETs track bid frequencies (`frequencies`) and candidate unique values (`unique_bids`) in real time. Batch winner queries resolve earliest bidders in a single database round trip.
  FR-02.6 (Ticket Numbering): Each successful bid generates a unique cryptographic ticket (`BID_XXXXXXXXXXXX`) returned to the client and dispatched via SMS.
  FR-02.7 (Outbid Alerts): When a previously unique bid becomes duplicated by a subsequent entry, displaced participants receive outbid alerts.
  FR-02.8 (Replay Protection): Bid submission requires client nonce (`x-bid-nonce`) and timestamp (`x-bid-timestamp`) headers; duplicate nonces or drifted timestamps (>5 min) are rejected.

FR-03: Product & Auction Management
  FR-03.1 (Product Catalog): Comprehensive product profiles containing descriptions, market valuations, categorization, and verified image assets.
  FR-03.2 (Countdown Synchronization): Real-time countdown timers synchronized against authoritative server clock time.
  FR-03.3 (Closed Auctions Archive): Auctions closed without bidders after 10 extensions are archived and accessible exclusively to administrators (`GET /api/v1/auctions/closed`).
  FR-03.4 (Automated Extensions): The system evaluates closing auctions against bidder thresholds (<100 unique bidders or zero bids) and extends by 7 days up to a 10-extension limit.
  FR-03.5 (Early Closure): Auctions immediately close when reaching the predefined maximum bid cap.

FR-04: Notifications & Messaging
  FR-04.1 (Bid Confirmation SMS): Console and gateway dispatch of SMS confirmation with bid ticket details upon persistence.
  FR-04.2 (Outbid Alerts): Targeted alerts dispatched when unique bid status is lost.
  FR-04.3 (Winner Notifications): Immediate push, in-app, and SMS notifications containing winning price, product details, and settlement deadline.
  FR-04.4 (Second Winner Notifications): Reassignment alerts explicitly stating the reason: "You have been awarded this auction because the original winner did not complete payment within the specified timeframe."

FR-05: Payments, Settlement & Escalation
  FR-05.1: Internal wallet ledger supporting deposits, PIN-authorized deductions, and balance inquiries.
  FR-05.2: Atomic bid fee collection enforcing calibrated numeric bounds (1.00 to 10,000.00 ETB).
  FR-05.3: Configurable payment deadline for winning purchases (default 30 calendar days / 720 hours).
  FR-05.4: Automated secondary winner reassignment upon primary winner settlement lapse, accompanied by immutable audit logging (`PRIMARY_WINNER_DEFAULTED`, `SECOND_WINNER_ASSIGNED`).

SECTION 3: NON-FUNCTIONAL REQUIREMENTS (NFR)
  NFR-01 (Throughput): Redis-backed bid tracking processes submissions sub-200ms; BullMQ worker persists batches of 50 to PostgreSQL asynchronously.
  NFR-02 (Real-time Broadcasts): WebSocket gateways push bid updates within 500ms of state mutation.
  NFR-03 (Authentication Security): Short-lived 15-minute JWTs with auto-refresh; secrets validated at application bootstrap against weak defaults.
  NFR-04 (Internal Service Authorization): Inter-service calls authenticated using `x-internal-api-key` validated by `InternalAuthGuard`.
  NFR-05 (SSRF & Input Defense): Image fetches validated against private IP ranges (RFC 1918) and strict MIME types. All DTO inputs validated using NestJS class-validator.
  NFR-06 (Data Consistency): Wallet balance deductions use direct SQL atomic decrements (`repository.update()`) with balance verification to prevent race conditions.
  NFR-07 (Query Optimization): Eliminates N+1 query patterns using composite database indexes and batch aggregate queries for auction listings.

SECTION 4: SYSTEM ARCHITECTURE
4.1 Client Applications
  Web Application: React 18, TypeScript, Tailwind CSS, Vite.
  Mobile Application: React Native, Expo, TypeScript.
  Shared State: React Context API, custom hooks, and AsyncStorage persistence.

4.2 Microservice Topology
  Identity & Wallet Service (Port 3001): Authentication, user credentials, wallet ledger, PIN security, and administrative audit trails.
  Auction Engine Service (Port 3002): Real-time bidding, WebSocket gateway, Redis LUB data structures, BullMQ workers, and closure state machine.
  Query / Read Service (Port 3003): Read-optimized catalog queries, aggregated auction statistics, and analytics reporting.

4.3 Data Storage & Caching
  Primary Relational Store: PostgreSQL 15 / Citus for distributed relational integrity and transactional ACID guarantees.
  In-Memory Engine: Redis 7 for high-speed ZSET frequency tracking, rate-limiting counters, and session blacklists.
  Queue Architecture: BullMQ backed by Redis for asynchronous bid persistence and scheduled background tasks.

SECTION 5: DATABASE SCHEMA
Table: Users
  id (UUID, PK) | phone_number (VARCHAR, Unique) | password_hash (VARCHAR)
  wallet_pin_hash (VARCHAR) | wallet_balance (DECIMAL) | full_name (VARCHAR)
  role (VARCHAR: 'user' | 'admin') | pin_attempts (INT) | pin_locked_until (TIMESTAMP)
  hashed_refresh_token (VARCHAR) | created_at (TIMESTAMP)

Table: Auctions
  id (UUID, PK) | product_id (UUID, FK) | start_time (TIMESTAMP) | end_time (TIMESTAMP)
  status (ENUM: 'ACTIVE', 'CLOSED', 'EXPIRED') | winner_user_id (UUID, FK, Nullable)
  winning_bid_amount (DECIMAL(12,2), Nullable) | min_bid (DECIMAL(12,2), Nullable)
  max_bid (DECIMAL(12,2), Nullable) | num_winners (INT, default 1)
  extensions (INT, default 0) | second_winner_assigned (BOOLEAN, default FALSE)
  payment_status (VARCHAR, default 'pending') | payment_deadline (TIMESTAMP, Nullable)
  created_at (TIMESTAMP)
  Indexes: (status, end_time), (status, payment_status, winner_user_id)

Table: Products
  id (UUID, PK) | name (VARCHAR) | description (TEXT) | image_urls (JSONB)
  current_market_price (DECIMAL) | brand (VARCHAR) | category (VARCHAR)
  status (VARCHAR: 'PENDING', 'APPROVED', 'REJECTED') | created_at (TIMESTAMP)

Table: Bids
  id (UUID, PK) | user_id (UUID, FK) | auction_id (UUID, FK)
  amount (DECIMAL(12,2)) | bid_time (TIMESTAMP) | service_fee_paid (BOOLEAN)
  ticket_number (VARCHAR, Nullable) | created_at (TIMESTAMP)
  Indexes: (auction_id, amount), (auction_id, user_id)

Table: Winners
  id (UUID, PK) | auction_id (UUID, FK) | user_id (UUID, FK)
  amount (DECIMAL(12,2)) | rank (INT, default 1) | payment_status (VARCHAR)
  payment_deadline (TIMESTAMP) | is_second_winner (BOOLEAN, default FALSE)
  created_at (TIMESTAMP)

SECTION 6: CORE ALGORITHMIC LOGIC
6.1 Lowest Unique Bid Algorithm (Redis ZSET)
  1. Bid Intake: `ZINCRBY guessx:auction:{id}:frequencies 1 <amount_2dec>`
  2. Uniqueness Evaluation:
     - If returned frequency == 1: `ZADD guessx:auction:{id}:unique_bids <amount> <amount_2dec>`
     - If returned frequency > 1: `ZREM guessx:auction:{id}:unique_bids <amount_2dec>`
  3. Winner Draw:
     `ZRANGEBYSCORE guessx:auction:{id}:unique_bids 0 +inf WITHSCORES LIMIT 0 <num_winners>`
     Retrieves lowest unique values in O(log N) time.
  4. Batch Resolution:
     Earliest bidders matching winning values are resolved via a single SQL query (`findEarliestBidders`), eliminating N+1 round trips.

6.2 Auction Closure & Extension Lifecycle Engine
  Evaluated every 10 seconds via `AuctionClosureService`:
  1. No Bidders (< 10 extensions): Increments `extensions`, adds 7 days to `end_time`, refreshes Redis TTLs, and logs extension.
  2. Limited Bidders (< 100 unique bidders or total bids < `min_bid`, < 10 extensions): Adds 7 days to `end_time` and notifies participants.
  3. Final Closure (10 extensions reached without bidders): Updates status to `CLOSED`, clears Redis cache, moves item to admin-only Closed Auctions list, and emits `NO_BIDDERS_FINAL_CLOSE` notification to administrators.
  4. Winner Resolution: When thresholds are satisfied, calculates winning bids, assigns winners, sets payment deadline (30 days default), and dispatches notifications.

SECTION 7: API SPECIFICATIONS
7.1 Authentication & Profile
  POST  /api/v1/auth/register       — { phone_number, password, full_name }
  POST  /api/v1/auth/login/phone    — { phone_number, password }
  POST  /api/v1/auth/refresh        — { refresh_token }
  GET   /api/v1/auth/profile        — Returns user identity, role, and balance
  PATCH /api/v1/auth/profile        — { full_name?, email? }

7.2 Wallet & Payment Operations
  GET   /api/v1/wallet/balance      — Current available wallet balance
  POST  /api/v1/wallet/deposit      — { amount, reference_id? } (max 1,000,000 ETB)
  POST  /api/v1/wallet/set-pin      — { pin } (4-digit numeric string)
  POST  /api/v1/wallet/verify-pin   — { pin } (validates with 5-attempt lockout)
  POST  /api/v1/wallet/deduct-fee   — { user_id, amount } (InternalAuthGuard, bounds: 1.00 - 10,000.00 ETB)
  GET   /api/v1/wallet/transactions — Paginated wallet ledger history

7.3 Auctions (Query Service)
  GET   /api/v1/auctions/active     — Active auctions with live bid and bidder counts
  GET   /api/v1/auctions/closed     — Closed auctions (Admin-only access for zero-bid closures)
  GET   /api/v1/auctions/:id        — Detailed auction view and specifications
  GET   /api/v1/auctions/:id/result — Awarded winner information and user participation summary

7.4 Bidding (Auction Engine)
  POST  /api/v1/auctions/:id/bid    — { amount } with headers { x-bid-nonce, x-bid-timestamp }
                                      Enforces Admin Bidding Restriction: returns HTTP 403 for admin role.

7.5 Payment Gateway & Bid Fee (Auction Engine)
  POST  /api/v1/payments/bid-fee/:auctionId/link  — Generates payment gateway link for bid fee.
                                                    Enforces Admin Bidding Restriction: returns HTTP 403 for admin role.
  POST  /api/v1/payments/bid-fee/:auctionId/wallet — Debits bid fee directly from wallet with PIN.
                                                    Enforces Admin Bidding Restriction: returns HTTP 403 for admin role.
  POST  /api/v1/payments/:auctionId/link          — Generates winning settlement link.
  POST  /api/v1/payments/:auctionId/confirm       — Confirms settlement transaction.

7.6 Administration
  GET   /api/v1/admin/auctions            — Comprehensive paginated auction management
  POST  /api/v1/admin/auctions            — Create new auction
  PATCH /api/v1/admin/auctions/:id        — Modify auction parameters
  POST  /api/v1/admin/auctions/:id/close  — Manual auction force-closure
  POST  /api/v1/admin/auctions/:id/reopen — Reopen eligible closed auctions
  GET   /api/v1/admin/auctions/:id/winner — Inspect calculated winners
  GET   /api/v1/admin/products            — Product inventory management
  POST  /api/v1/admin/products            — Create product catalog item

SECTION 8: CLIENT APPLICATION WORKFLOWS
8.1 Navigation & Screen Architecture
  - Authentication: LoginScreen and RegisterScreen with clean credential and PIN flows.
  - Discovery: HomeScreen and AuctionsScreen with category filtering and real-time bid counters.
  - Participation: ProductScreen and PayFeeScreen. Administrators attempting to bid receive upfront blocked states and explicit banner warnings: "Administrators are not allowed to participate in bidding."
  - Bid Placement: PlaceBidScreen with 2-decimal formatting stepper and cryptographic submission.
  - Confirmation: BidConfirmedScreen displaying generated ticket number and SMS delivery receipt.
  - History: MyBidsScreen listing user bids, unique statuses, and award states.

SECTION 9: SYSTEM RESILIENCE & EDGE CASES
9.1 Administrator Bidding Protection
  Problem: Administrative users attempting to place bids could compromise auction impartiality or waste funds.
  Solution: Immediate role evaluation before bid or fee initiation; blocks access with clear error dialogs and rejects backend requests with HTTP 403.

9.2 Auction Extensions vs. Stagnant Auctions
  Problem: Auctions concluding with zero bids or insufficient competition could result in unfair or uneconomic outcomes.
  Solution: Automated 7-day extensions evaluated every 10 seconds. Auctions with <100 unique bidders or zero bids extend up to 10 times (10 weeks maximum). Auctions exceeding 10 extensions without bids close permanently to the administrative closed archive and dispatch administrator notifications.

9.3 Primary Winner Settlement Default
  Problem: Declared winners failing to settle winning purchases within the deadline stall inventory.
  Solution: Configurable 30-day payment deadline enforced via cron. Upon expiration, status transitions to "Payment Defaulted" and the claim automatically rotates to the Second Winner (next lowest unique bidder) with an immutable audit entry (`SECOND_WINNER_ASSIGNED`).

9.4 Replay Attacks and Concurrency
  Problem: Concurrent submission rushes or replayed bid requests.
  Solution: Nonce and timestamp headers checked against Redis cache; Redis atomic commands serialize bid frequency increments before BullMQ persists records.

SECTION 10: QUALITY ASSURANCE & VERIFICATION
1. Automated Test Suite: Jest tests verify authentication, wallet PIN lockouts, fee bounds validation, and Redis uniqueness tracking.
2. Static Analysis: All projects (identity-service, auction-engine, query-service, guessx-web, guessx-app) pass TypeScript compilation with zero errors (`npx tsc --noEmit`).
3. Security Flow & Penetration Tests: `scripts/e2e-security-flow.js` and `scripts/concurrency-security-stress.js` validate 100% pass rates across race-condition prevention, fee bounds (`@Min(1.00)`, `@Max(10000)`), and administrator bidding restrictions.
