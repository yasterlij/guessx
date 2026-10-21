# Business Requirements Document (BRD)
## Guess X — Reverse Auction Platform

---

### Document Control

| Property | Value |
| :--- | :--- |
| **Project Name** | Guess X Platform |
| **Business Owner** | Digital Banking & Alternative Channels, Awash Bank |
| **Document Type** | Business Requirements Document (BRD) |
| **Document Version** | 2.0 |
| **Document Status** | Approved for Implementation & Review |
| **Classification** | Confidential — Internal & Regulatory Evaluation |

---

## 1. Executive Summary & Business Background

Guess X is an interactive reverse auction platform designed to enhance mobile money adoption by merging e-commerce, digital payments, and gamification. Traditional auctions reward the highest bidder, often creating prohibitive barriers for typical retail participants. Guess X inverts this model: participants pay a modest service fee to submit confidential bids, and the item is awarded to the participant holding the **lowest unique bid** (LUB) when the auction closes.

The service is integrated directly into the Awash Mobile Money ecosystem, allowing account holders to discover products, fund bids seamlessly from their mobile wallets, and settle winning purchases within a compliant, auditable digital workflow.

By coupling gamified reverse auctions with everyday mobile banking services, Guess X addresses core strategic banking objectives:
- **Increasing Daily Active Users (DAU)** and session frequency across digital channels.
- **Driving Mobile Money transaction volume** through micro-fee bid payments and large-ticket settlement flows.
- **Creating sustainable non-interest revenue** from auction participation fees.
- **Expanding merchant engagement** by providing local retailers and distributors with a high-visibility marketing and sales channel.
- **Deepening customer loyalty** through transparent, fair-play digital experiences.

---

## 2. Project Scope

### 2.1 In Scope
- **Customer Registration & Access**: Seamless authentication via existing mobile money credentials, role resolution, and account state management.
- **Product Catalog Management**: Multi-category inventory management with administrative approval workflows, specifications, and retail valuation.
- **Auction Lifecycle Operations**: Automated scheduling, countdown management, fair-play extensions (7-day cycles up to a 10-extension cap), 100-bidder thresholds, and administrative closure.
- **Confidential Bidding**: Secure, tamper-proof bid entry with cryptographic nonce validation, ticket generation, and real-time frequency indexing.
- **Governance & Separation of Duties**: Strict prohibition of administrator bidding enforced at initiation to safeguard auction integrity.
- **Mobile Wallet Integration**: Atomic fee deductions with calibrated bounds (1.00 ETB to 10,000.00 ETB), PIN verification, and digital receipting.
- **Algorithmic Winner Determination**: Fully automated multi-winner lowest unique bid resolution using in-memory sorted sets with zero manual interference.
- **Payment & Escalation Management**: Configurable settlement windows (default 30 days) with automated secondary winner reassignment under UNCITRAL and ICC guidelines.
- **Multi-Channel Notifications**: Real-time WebSocket broadcasts, in-app messaging, push notifications, and SMS dispatch.
- **Administrative Operations & Audit**: Live auction monitoring, manual closure/reopening controls, closed auction archive, role-based access control, and tamper-resistant audit trails.

### 2.2 Out of Scope (Phase 1)
- Live cross-border foreign exchange settlements.
- Physical logistics fulfillment and door-to-door courier routing (handled via merchant pickup and designated bank branch collection).

---

## 3. Key Stakeholders

| Stakeholder Group | Organization / Entity | Key Responsibilities |
| :--- | :--- | :--- |
| **Business Owner** | Awash Bank (Alternative Channels) | Product strategy, commercial governance, customer trust, and commercial sign-off. |
| **Technology Partner** | Guess X Platform Engineering | System architecture, microservice implementation, performance SLAs, and maintenance. |
| **Payment Service Provider** | Awash Mobile Money & Payment Gateways | Account ledger operations, wallet debit/credit APIs, authentication, and settlement reconciliation. |
| **Merchant Partners** | Authorized Vendors & Distributors | Inventory consignment, product warranty provisioning, and customer fulfillment. |
| **Auction Participants** | Registered Bank Customers | Bidding participation, wallet authorization, and winning bid settlement. |

---

## 4. End-to-End Business Process Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AUCTION LIFECYCLE FLOW                          │
└────────────────────────────────────────────────────────────────────────┘

  1. Inventory & Auction Setup
     Merchant/Bank submits product details → Admin reviews & approves
     → Auction created with schedule, fee, winner count, and bidder thresholds

  2. User Engagement & Bidding
     Customer logs in via Mobile Money → Verifies wallet balance
     → Admin role check (Administrators strictly blocked from bidding)
     → Customer pays non-refundable bid fee (1.00 - 10,000.00 ETB)
     → Customer submits confidential bid (encrypted & indexed in Redis ZSET)
     → System issues unique confirmation ticket via in-app & SMS

  3. Auction Closure & Evaluation
     Countdown expires → System evaluates participation thresholds:
     ├─ Case A: <100 unique bidders or total bids < min_bid (extensions < 10)
     │          └─ Automatically extends by 7 days; bidders notified
     ├─ Case B: No bidders after 10 weekly extensions (70 days)
     │          └─ Permanent closure; moved to Closed Auctions (admin view);
     │             Admin alert dispatched: "Open X days with no bidders"
     └─ Case C: Thresholds met (or max bid reached)
                └─ Final closure; lowest unique bid algorithm executes

  4. Winner Notification & Escalation
     Primary winner declared → Settlement window activated (30 days default)
     → Primary winner notified via push, SMS, and in-app
     ├─ Sub-case 4A: Winner pays winning price → Digital receipt & collection code
     └─ Sub-case 4B: Payment deadline expires → Status: "Payment Defaulted"
                     → System escalates to Second Winner (next lowest unique bidder)
                     → Immutable audit logged (UNCITRAL / ICC compliant)
```

---

## 5. Functional Business Requirements

### Module 1 – Customer & Identity Management

| Requirement ID | Requirement Statement | Implementation Status | Notes |
| :--- | :--- | :--- | :--- |
| **BR-001** | The system shall authenticate registered Mobile Money customers using their phone number and credential hash. | Implemented | JWT tokens with automated refresh handling. |
| **BR-002** | The system shall maintain distinct security credentials for system authentication and wallet payment authorizations (PIN). | Implemented | Multi-tier credential validation with lockout. |
| **BR-003** | The system shall enforce a temporary lockout (30 minutes) following 5 consecutive failed PIN verification attempts. | Implemented | Prevents brute-force compromise of wallet funds. |
| **BR-004** | The system shall present user profiles with bidding history, transaction ledgers, and awarded items. | Implemented | Paginated endpoints across web and mobile apps. |
| **BR-005** | The system shall verify active account standing and ban status on every state-mutating transaction. | Implemented | Validated via token payload and Redis blacklist. |

### Module 2 – Product & Catalog Management

| Requirement ID | Requirement Statement | Implementation Status | Notes |
| :--- | :--- | :--- | :--- |
| **BR-006** | The platform shall allow authorized administrators to manage product records with high-resolution imagery and retail valuation. | Implemented | Full CRUD with SSRF image verification. |
| **BR-007** | The catalog shall support structured categorization, including Electronics, Vehicles, Home Appliances, and Travel Packages. | Implemented | Filterable categorization across all clients. |
| **BR-008** | Each product specification shall detail item condition, warranty provisions, market price, and retail description. | Implemented | Comprehensive metadata schema in PostgreSQL. |
| **BR-009** | Products must go through an administrative review state prior to being scheduled in live auctions. | Implemented | State machine enforces review validation. |

### Module 3 – Auction Management & Closure Rules

| Requirement ID | Requirement Statement | Implementation Status | Notes |
| :--- | :--- | :--- | :--- |
| **BR-010** | Administrators shall configure auction start time, end time, participation fee, minimum bidder threshold, maximum bid cap, and winner count. | Implemented | Standard administrative creation schema. |
| **BR-011** | The system shall synchronize all auction countdown timers against authoritative server clock time. | Implemented | Drift-free synchronization via WebSocket and REST. |
| **BR-012** | **Rule 1 (First Round No Bidders)**: If an auction concludes its scheduled duration with zero bids, it shall not select a winner and shall automatically extend for 7 days (1 week). | Implemented | Automated cron-driven evaluation. |
| **BR-013** | **Rule 2 (Repeated No-Bid Extensions)**: If zero bids persist after an extension, the auction shall continue extending weekly for up to 10 total extensions (10 weeks). | Implemented | Counter tracked in `auctions.extensions`. |
| **BR-014** | **Rule 3 (Final Closure & Administrative Notification)**: Upon reaching the 10th weekly extension with no bidders, the auction shall close permanently, transition to the Closed Auctions list (visible exclusively to administrators), and dispatch an administrative notification: *"This auction has been open for the last X days but received no bidders."* | Implemented | Emits `NO_BIDDERS_FINAL_CLOSE` event. |
| **BR-015** | **Rule 4 (Limited Bidders Rule)**: If an auction closes with fewer than 100 unique bidders (or below the configured minimum bid count), it shall extend weekly by 7 days up to the maximum 10-extension limit before final closure. | Implemented | Protects item economic viability and fair competition. |
| **BR-016** | **Rule 5 (Administrative Controls)**: Administrators shall have operational visibility into closed auctions with capabilities to review history, execute manual closures, or reopen eligible inventory. | Implemented | Managed via `GET /api/v1/auctions/closed` and admin tools. |
| **BR-017** | The system shall close an active auction immediately once the predefined maximum bid cap is attained. | Implemented | Real-time threshold trigger in bidding pipeline. |

### Module 4 – Bid Management & Governance

| Requirement ID | Requirement Statement | Implementation Status | Notes |
| :--- | :--- | :--- | :--- |
| **BR-018** | **Administrator Bidding Prohibition**: System administrators and operational staff with administrative roles are strictly prohibited from submitting bids in any auction. | Implemented | Separation of duties governance. |
| **BR-019** | **Initiation-Time Enforcement**: The administrator bidding restriction shall be enforced immediately at the point of bid or fee initiation (generating payment links or wallet fee debits), preventing administrators from proceeding through payment flows only to be rejected downstream. | Implemented | Returns HTTP 403: *"Administrators are not allowed to participate in bidding."* |
| **BR-020** | Customers must pay a non-refundable participation fee prior to submitting a confidential bid value. | Implemented | Atomic fee deduction before bid registration. |
| **BR-021** | Participation fees must fall within calibrated platform limits (minimum 1.00 ETB, maximum 10,000.00 ETB). | Implemented | Prevents invalid or predatory transaction amounts. |
| **BR-022** | Customers may place multiple distinct bids on a single auction, subject to paying the participation fee for each submission. | Implemented | Dynamic frequency tracking in Redis. |
| **BR-023** | Submitted bid values shall remain confidential and invisible to other participants, administrators, and observers until auction closure. | Implemented | Encrypted bid persistence and isolated frequency scores. |
| **BR-024** | Once recorded, bid records are immutable and cannot be amended, superseded, or deleted by any participant or administrator. | Implemented | Enforced by relational constraints and audit trails. |
| **BR-025** | The system shall generate a unique cryptographic ticket identifier (`BID_XXXXXXXXXXXX`) and dispatch confirmation via in-app notification and SMS. | Implemented | Dispatched immediately upon persistence. |

### Module 5 – Algorithmic Winner Determination

| Requirement ID | Requirement Statement | Implementation Status | Notes |
| :--- | :--- | :--- | :--- |
| **BR-026** | Winner selection shall execute automatically upon auction closure without requiring manual administrative initiation. | Implemented | Scheduled worker evaluates expired auctions. |
| **BR-027** | The winning bid shall be determined as the lowest monetary value submitted by exactly one participant (Lowest Unique Bid). | Implemented | Evaluated via Redis ZSET in O(log N) complexity. |
| **BR-028** | Any bid amount submitted by two or more participants shall be categorized as duplicated and excluded from winner selection. | Implemented | Frequency tracked in `guessx:auction:{id}:frequencies`. |
| **BR-029** | For auctions configured with multiple winners (`num_winners > 1`), the system shall select up to the specified count of lowest unique bids in ascending order. | Implemented | Batch bidder resolution query executes in one trip. |
| **BR-030** | If zero unique bids exist when an auction concludes, the system shall apply extension rules up to the 10-extension limit before declaring closure. | Implemented | Seamless state machine handling. |

### Module 6 – Settlement, Reassignment & Escalation

| Requirement ID | Requirement Statement | Implementation Status | Notes |
| :--- | :--- | :--- | :--- |
| **BR-031** | The primary winner shall be granted a configurable settlement window (default 30 calendar days / 720 hours) to complete payment for the item at the winning bid price. | Implemented | Configured via `PAYMENT_DEADLINE_HOURS`. |
| **BR-032** | Winners shall complete settlement using Mobile Money wallet debit or integrated payment gateway channels. | Implemented | Verified with PIN confirmation and atomic balance check. |
| **BR-033** | Upon settlement confirmation, the system shall generate an immutable digital receipt containing transaction references, item details, and pickup codes. | Implemented | Serialized receipt stored in database. |
| **BR-034** | **Payment Default & Escalation**: If the primary winner fails to complete payment within the deadline, their status shall transition to "Payment Defaulted", and the system shall automatically reassign the winning claim to the next eligible lowest unique bidder (Second Winner). | Implemented | Conforms to UNCITRAL Model Law and ICC Guidelines. |
| **BR-035** | The second winner notification shall explicitly disclose the assignment reason: *"You have been awarded this auction because the original winner did not complete payment within the specified timeframe."* | Implemented | Promotes transparent stakeholder communications. |
| **BR-036** | All default and reassignment events shall record immutable audit entries (`PRIMARY_WINNER_DEFAULTED`, `SECOND_WINNER_ASSIGNED`). | Implemented | Permanent audit logging in identity service. |

### Module 7 – Reporting & Administrative Governance

| Requirement ID | Requirement Statement | Implementation Status | Notes |
| :--- | :--- | :--- | :--- |
| **BR-037** | The system shall provide operational dashboards detailing platform revenue, active auctions, participant volume, and bid frequency distributions. | Implemented | Query-service analytics module. |
| **BR-038** | Platform administrators shall have access to downloadable CSV reports for settlement reconciliation, fee collection, and user audit trails. | Implemented | Streaming CSV export endpoints. |
| **BR-039** | All administrative actions—including auction modifications, manual closures, user role changes, and account restrictions—must be recorded in an immutable audit ledger. | Implemented | Captures actor ID, IP address, action, and payload. |

---

## 6. Non-Functional Requirements (NFR)

### 6.1 Performance & Throughput
- **Bid Submission Latency**: The platform shall process and record incoming bids within 2 seconds under peak loads (sub-200ms Redis indexing, asynchronous PostgreSQL persistence via BullMQ worker).
- **Concurrent Capacity**: The architecture shall support a minimum of 100,000 concurrent active users and handle burst bidding volumes up to 10,000 requests per minute without degradation.
- **Real-Time Propagation**: Bid volume counters and auction state changes shall be broadcast to connected clients via WebSockets within 500 milliseconds.

### 6.2 Availability & Resilience
- **Uptime SLA**: The core auction and wallet microservices shall achieve 99.9% service availability during scheduled operating hours.
- **Atomic Operations**: Financial debits and bid fee collections shall execute atomically, ensuring no participant is debited without a corresponding bid record or vice versa.
- **Graceful Degradation**: If external notification channels experience transit delays, core bidding and winner calculations shall proceed unimpeded.

### 6.3 Security & Compliance
- **Separation of Duties**: Complete prevention of administrator self-bidding, eliminating conflicts of interest and ensuring institutional auction integrity.
- **Authentication**: Industry-standard JWT authentication with short-lived access tokens (15 minutes) and rolling refresh tokens (7 days).
- **Anti-Tampering Controls**: All bid placement submissions must include client nonces and millisecond-level timestamps to neutralize replay attacks.
- **OWASP Compliance**: Defense-in-depth protection covering rate-limiting, SSRF IP blocking, input sanitization, and structured exception masking.

---

## 7. Business Rules Matrix

| Rule Identifier | Business Rule Definition | Enforcement Mechanism |
| :--- | :--- | :--- |
| **R-AUTH-01** | Only authenticated, verified Mobile Money customers in good standing may participate in auctions. | Validated on every incoming API request via JWT and ban-check filter. |
| **R-ADMIN-01** | Administrators and internal operators are strictly prohibited from bidding in any auction. | Checked at fee link creation, wallet fee payment, and bid submission; returns HTTP 403. |
| **R-FEE-01** | Participation fees are non-refundable and must range between 1.00 ETB and 10,000.00 ETB. | Enforced by NestJS class-validator (`@Min(1.00)`, `@Max(10000)`) and wallet service. |
| **R-EXT-01** | Auctions closing with zero bids auto-extend by 7 days up to a maximum of 10 extensions. | Evaluated every 10 seconds by `AuctionClosureService` cron. |
| **R-EXT-02** | Auctions with fewer than 100 unique bidders (or below `min_bid`) auto-extend weekly up to 10 times. | Evaluated on scheduled expiration; updates `end_time` by +7 days and increments `extensions`. |
| **R-CLOSE-01** | Auctions reaching 10 extensions with zero bids close permanently to the admin-only Closed Auctions list. | Status updated to `CLOSED`; dispatches notification to admin channels. |
| **R-WIN-01** | The winning bid is strictly the lowest unique monetary submission (up to 2 decimal places). | Evaluated in O(log N) time via Redis sorted set scores. |
| **R-ESC-01** | Winners failing to settle within the designated window (default 30 days) default to the next lowest unique bidder. | Scheduled cron marks `Payment Defaulted` and flags `second_winner_assigned`. |

---

## 8. Acceptance & Sign-Off Criteria

1. **Governance & Anti-Fraud Verification**: Independent penetration and functional testing confirm that administrative accounts are blocked instantly from bid initiation across all interfaces.
2. **Lifecycle Automation Verification**: Automated tests confirm 7-day weekly extensions trigger correctly when bidder counts are below 100 or zero, capping strictly at 10 extensions before permanent closure.
3. **Audit Trail Completeness**: 100% of auction extensions, closures, default escalations, and fee transactions produce traceable audit log entries.
4. **Platform Concurrency**: System maintains sub-second responsiveness during load testing simulating concurrent bidding rushes.
