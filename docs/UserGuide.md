<!--
  Guess X User Guide v3.0
  Enterprise-grade documentation prepared for formal submission.
  This document demonstrates user protection, transparency, and operational clarity.
-->

<div align="center">

# Guess X Platform
## User Guide & Operational Reference

**Lowest Unique Bid Auction Platform**

**Version 3.0**

</div>

---

## Document Control

| Field | Value |
|-------|-------|
| **Document Title** | Guess X User Guide & Operational Reference |
| **Version** | 3.0 |
| **Date** | 2026-08-18 |
| **Status** | Approved for Submission |
| **Classification** | Public — User-Facing |
| **Document Owner** | Guess X Product & Compliance Team |

### Version History

| Version | Date | Author | Reviewer | Approver | Summary of Changes |
|---------|------|--------|----------|----------|---------------------|
| 1.0 | 2026-06-02 | Product Team | Engineering Lead | Operations Manager | Initial user guide |
| 2.0 | 2026-08-18 | Product Team | Engineering Lead | Operations Manager | Added admin features, audit logs, wallet PIN, data export |
| 3.0 | 2026-08-18 | Product & Compliance Team | Security Review Board | Executive Approver | Enterprise-grade: user protection, dispute resolution, fair play guarantee, financial protection, data subject rights, T&C flow, product approval, SMS preferences, payment reminders, settlement transparency, admin analytics, accessibility, multi-language, glossary |

### Intended Audience

This document is intended for:

1. **End Users** — Participants who browse auctions, place bids, and transact on the Guess X platform.
2. **Administrators** — Platform staff who manage products, auctions, users, and operations.
3. **Reviewers and Auditors** — Independent parties evaluating platform transparency, fairness, and user protection measures.
4. **Support Staff** — Personnel who assist users with account, payment, and dispute matters.

### Confidentiality Notice

This document is classified as **Public — User-Facing**. It may be freely distributed to current and prospective users of the Guess X platform. It contains no proprietary algorithms, internal system credentials, or infrastructure secrets. Operational diagrams describe user-visible behavior only. Internal implementation details (Redis data structures, microservice topology, database schema) are intentionally omitted and maintained separately in the Technical Reference.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Getting Started](#2-getting-started)
3. [Navigation Guide](#3-navigation-guide)
4. [User Features](#4-user-features)
5. [Admin Features](#5-admin-features)
6. [Payment Guide](#6-payment-guide)
7. [User Rights & Responsibilities](#7-user-rights--responsibilities)
8. [Dispute Resolution](#8-dispute-resolution)
9. [Fair Play Guarantee](#9-fair-play-guarantee)
10. [Financial Protection](#10-financial-protection)
11. [Data Subject Rights](#11-data-subject-rights)
12. [Terms & Conditions Summary](#12-terms--conditions-summary)
13. [New Feature Documentation](#13-new-feature-documentation)
14. [Accessibility](#14-accessibility)
15. [Multi-Language Support](#15-multi-language-support)
16. [Device Compatibility & Network Requirements](#16-device-compatibility--network-requirements)
17. [FAQ](#17-faq)
18. [Troubleshooting](#18-troubleshooting)
19. [Maintenance Tips](#19-maintenance-tips)
20. [Glossary of Terms](#20-glossary-of-terms)
21. [Support Contacts](#21-support-contacts)

---

## 1. System Overview

**Guess X** is a reverse auction platform with a simple but exciting twist: the **lowest unique bid wins**.

### How It Works

1. **Browse Auctions**: Explore products up for auction — smartphones, laptops, electronics, and more.
2. **Pay the Bid Fee**: Each bid requires a small, non-refundable service fee (starting from 1.00 ETB).
3. **Place Your Bid**: Enter your bid amount. Lower bids have a better chance of being unique.
4. **Wait for the Timer**: When the auction ends, the system finds the lowest unique bid.
5. **Win and Pay**: If you win, you have three months (90 days) to complete your payment and claim your item.

### Key Features
- **Lowest Unique Bid (LUB)**: Be strategic — your bid must be both low and unique.
- **Real-Time Updates**: See live bid counts and auction status via Socket.io.
- **Secure Wallet**: Deposit funds and pay with your internal wallet or via payment gateways.
- **Winner Transparency**: View full bid breakdowns after auction closure.
- **Notifications**: Get push, SMS, and in-app alerts for bids, wins, and extensions.
- **Admin Dashboard**: Full control for platform administrators.
- **Product Approval Process**: All products are vetted before being listed for auction.
- **Terms & Conditions Acceptance**: Users must accept T&C before participating.
- **Settlement Transparency**: Revenue and settlement data are published for review.

### Screenshot Reference

| Screen | Description | Screenshot |
|--------|-------------|------------|
| Login | Phone + password sign-in | `[screenshot: login-screen.png]` |
| Home | Dashboard with wallet and auctions | `[screenshot: home-screen.png]` |
| Auctions | Browse and filter live auctions | `[screenshot: auctions-screen.png]` |
| Product Detail | Auction details with bid button | `[screenshot: product-screen.png]` |
| Place Bid | Enter bid amount after fee payment | `[screenshot: place-bid-screen.png]` |
| Winner Result | Winner reveal with transparency | `[screenshot: winner-screen.png]` |
| Admin Dashboard | Platform stats and trends | `[screenshot: admin-dashboard.png]` |
| T&C Acceptance | Terms acceptance flow | `[screenshot: tc-acceptance.png]` |
| Product Approval | Admin product vetting queue | `[screenshot: product-approval.png]` |
| SMS Preferences | Notification channel settings | `[screenshot: sms-preferences.png]` |
| Settlement Report | Revenue and settlement view | `[screenshot: settlement-report.png]` |

> **Note**: Screenshot placeholders will be replaced with captured images prior to final publication. Each placeholder follows the naming convention `[screenshot: <screen-name>.png]`.

---

## 2. Getting Started

### 2.1 System Requirements

| Platform | Requirements |
|----------|-------------|
| **Web** | Modern browser (Chrome, Firefox, Safari, Edge) with JavaScript enabled |
| **Mobile** | iOS 14+ or Android 10+ with Expo Go app or native build |

A detailed device compatibility matrix and network requirements table is provided in [Section 16](#16-device-compatibility--network-requirements).

### 2.2 Account Registration

There are two ways to create an account:

**Phone Registration:**
1. Open the Guess X app or website.
   - `[screenshot: register-step-1.png]`
2. Tap **"Register"**.
3. Enter your **full name** and **phone number**.
4. Create a **password** (minimum 8 characters).
5. Tap **"Create Account"**.
6. You will be automatically logged in and presented with the **Terms & Conditions acceptance flow** (see [Section 13.1](#131-terms--conditions-acceptance-flow)).

**Social Login (TeleBirr / Banking App / Super-App):**
1. Open the Guess X app or website.
2. Tap **"Login with TeleBirr"** (or your preferred provider).
3. You will be redirected to the provider's authentication page.
4. Authorize Guess X to access your basic profile.
5. You will be redirected back to Guess X and automatically logged in.
6. First-time social login users must complete the **Terms & Conditions acceptance flow**.

> **Note**: Your phone number is your primary identifier. Please ensure it is correct.

> **Warning**: You cannot place bids, deposit funds, or participate in any auction until you have accepted the current Terms & Conditions.

### 2.3 Login

1. Open the Guess X app or website.
   - `[screenshot: login-step-1.png]`
2. Enter your **phone number** and **password**.
3. Tap **"Login"**.
4. You will be redirected to the **Home** screen.

> **Forgot Password?** Contact support for account recovery. See [Section 21](#21-support-contacts).

### 2.4 Session Management

- Your session expires after **30 minutes of inactivity**.
- Absolute session timeout is **12 hours**.
- The app automatically refreshes your token 60 seconds before expiry.
- If you are logged in on another tab, logging out here will log you out everywhere.

> **Info**: Session timeouts protect your account from unauthorized access on unattended devices.

---

## 3. Navigation Guide

### 3.1 Site Map

```
Home (Dashboard)
├── Wallet Balance
├── Live Carousel
├── Suggested Auctions
├── Winner Spotlight
└── Quick Actions

Auctions
├── Filter by Status (All / Live / Closed)
├── Filter by Category
├── Filter by Price Range
└── Auction Detail
    ├── Product Images
    ├── Specifications
    ├── Bid Progress
    ├── Extension Warning
    └── Place Bid

My Bids
├── Active Bids
│   ├── Ticket Number
│   ├── Bid Amount
│   └── Time Remaining
└── Closed Bids
    ├── Won
    ├── Lost
    └── Duplicated

Winners
├── Recent Winners
├── Winner Details
└── Transparency Check

Favorites
└── Watchlist

Profile
├── Account Info
├── Wallet
├── Notifications
│   ├── Push Preferences
│   ├── SMS Preferences
│   └── Email Preferences
├── Data Settings
└── Sign Out

Admin (role-gated)
├── Dashboard
├── Products
│   ├── Pending Approval
│   ├── Approved
│   └── Rejected
├── Auctions
├── Users
├── Transactions
├── Settlements
├── Audit Logs
├── Analytics
└── Monitor
```

### 3.2 Web Navigation

| Element | Location | Action |
|---------|----------|--------|
| **Top Navbar** | Desktop header | Home, Live Auctions, My Bids, Winners, Profile, Admin |
| **Bottom Tab Bar** | Mobile footer | Home, Auctions, Winners, Profile |
| **Mobile Drawer** | Hamburger menu (mobile) | Overflow navigation, Admin link |
| **Breadcrumbs** | Admin screens | Dashboard > Products > Edit |

### 3.3 Mobile Navigation

| Gesture | Action |
|---------|--------|
| Swipe left/right on carousel | Navigate product images |
| Pull down on list | Refresh auctions/bids |
| Tap heart icon | Add/remove favorite |
| Tap back arrow | Return to previous screen |
| Swipe down on search | Clear search filters |

### 3.4 Information Architecture

Guess X uses a **view-based routing** system (not traditional URL routing). The app maintains a `view` state that determines which screen is displayed, and a `viewHistory` stack for back navigation.

**Primary User Path:** Home → Auctions → Product → Pay Fee → Place Bid → Confirmation
**Admin Path:** Home → Admin Dashboard → Specific Admin Module

---

## 4. User Features

### 4.1 Home Screen

The Home screen is your dashboard:

- **Wallet Balance**: View your current balance at the top.
- **Live Carousel**: See currently active auctions in a horizontal scroll.
- **Suggested Auctions**: Auctions recommended based on your bid history.
- **Winner Spotlight**: Recent winners and their winning amounts.
- **Quick Actions**: Shortcuts to browse auctions, view bids, and deposit funds.

`[screenshot: home-screen-annotated.png]`

### 4.2 Browsing Auctions

1. Tap **"Auctions"** in the bottom navigation bar (mobile) or top menu (desktop).
   - `[screenshot: browse-auctions-step-1.png]`
2. Use **filters** to narrow results:
   - **Status**: All, Live, Closed
   - **Category**: Smartphones, Computers, Electronics, etc.
   - **Price Range**: Minimum and maximum bid filters
3. Tap an auction card to view details.
   - `[screenshot: browse-auctions-step-3.png]`

### 4.3 Auction Details

On the Product/Auction Detail screen:

- **Images**: Swipe through product images. Tap to view full-size.
- **Specifications**: View technical specs (storage, RAM, chipset, etc.).
- **Auction Info**: See start/end times, bid fee, current bid count, and unique bidders.
- **Bid Progress Bar**: Visual indicator of bidding activity.
- **Extension Warning**: Shows if the auction has been extended due to fair-play rules.
- **Favorite**: Tap the heart icon to save to your favorites.

`[screenshot: auction-detail-annotated.png]`

### Understanding Auction Extensions & Closure Rules

Guess X implements fair-play rules to protect auction integrity and ensure genuine, competitive participation:

1. **No Bidders (First Round)**: If an auction concludes its scheduled time with zero bids, no winner is selected, and the auction automatically extends for **7 days (1 week)**.
2. **Repeated No-Bid Extensions**: If zero bids persist after an extension, the auction extends again for another 7 days. This cycle repeats weekly until the auction has been extended **10 times (total of 10 weeks)**.
3. **Final Closure**: After the 10th extension without bidders:
   - The auction closes permanently.
   - The item is moved to the **Closed Auctions** list (visible exclusively to administrators).
   - An automated system alert is dispatched to administrators: *"This auction has been open for the last X days but received no bidders."*
4. **Limited Bidders Rule**: If an auction closes with **fewer than 100 unique bidders** (or below the configured minimum bid threshold), the auction extends weekly by 7 days until it reaches the maximum 10-extension limit before final closure.
5. **Early Closure on Maximum Bids**: If an auction reaches its configured `max_bid` ceiling, it closes immediately to prevent unbounded participation.
6. **Administrative Oversight**: Administrators can view closed auctions via their dedicated console, with operational authority to force-close or reopen eligible auctions.

**Key Points for Participants:**
- All submitted bids remain active and fully valid throughout any extension period.
- Participants receive real-time notifications whenever an auction they have bid on is extended.
- The auction timer synchronizes directly with authoritative server time.

> **Important**: Extension rules execute automatically via server-side scheduling. They apply uniformly across all auctions and cannot be altered or bypassed for individual participants.

### 4.4 Placing a Bid

**Step 1: Pay the Bid Fee**
1. On the auction detail screen, tap **"Place Bid"**.
   - `[screenshot: place-bid-step-1.png]`
2. Review the bid fee amount.
3. Choose your payment method:
   - **Awash Wallet** (requires PIN)
   - **SikinaPay** (redirects to payment page)
4. Complete the payment.
   - `[screenshot: place-bid-step-4.png]`

**Step 2: Enter Your Bid**
1. After paying the fee, you will see the bid entry screen.
   - `[screenshot: place-bid-step-5.png]`
2. Enter your bid amount (must be greater than 0, up to 2 decimal places).
3. Tap **"Submit Bid"**.
4. You will receive a **ticket number** (e.g., `BID_a1b2c3d4e5f6`).
   - `[screenshot: place-bid-confirmation.png]`

> **Warning: Bid Rules & Governance**
> - **Administrator Bidding Restriction**: Administrators and staff with administrative privileges are strictly prohibited from participating in bidding. The system validates roles upfront before fee payment or bid initiation; any attempt returns an immediate alert: *"Administrators are not allowed to participate in bidding."*
> - Maximum 150 bids per auction per user.
> - Each bid requires payment of the non-refundable bid participation fee (1.00 ETB to 10,000.00 ETB).
> - You cannot place bids on closed or expired auctions.
> - You must accept the current Terms & Conditions prior to placing your first bid.

### 4.5 Viewing Your Bids

1. Tap **"My Bids"** in the navigation.
   - `[screenshot: my-bids-step-1.png]`
2. See all your bids across active and closed auctions.
3. For each bid, view:
   - Ticket number
   - Bid amount
   - Time remaining (for active auctions)
   - Status (pending, unique, duplicated, won)

### 4.6 Winners and Results

1. After an auction closes, tap on it to view results.
   - `[screenshot: winners-step-1.png]`
2. The **Winner Screen** shows:
   - The winning bid amount
   - The winner's name (partially anonymized)
   - Full bid breakdown (all bid amounts sorted)
   - Transparency check (shows which amounts were unique vs. duplicated)
3. If you won, you will see a **"Pay Now"** button.
   - `[screenshot: winner-screen-annotated.png]`

> **Info**: The full bid breakdown is available to all users after auction closure. This transparency allows any participant to independently verify the winning result.

### Understanding Winner Escalation & Default Rules

Guess X operates in strict compliance with the **UNCITRAL Model Law on Public Procurement** and **ICC Auction Guidelines** for transparent bidder default and escalation:

1. **Primary Winner Selection**: At auction close, the system identifies the participant who submitted the lowest unique bid as the **Primary Winner** (rank 1).
2. **Payment Deadline**: The Primary Winner receives a push/SMS notification and has a configurable payment window (default **1 month / 30 days = 720 hours**, configurable by administrators).
3. **Payment Default & Escalation**:
   - If the Primary Winner fails to complete payment before the deadline, the auction payment status changes to **"Payment Defaulted"**.
   - The primary winner's payment status transitions to **EXPIRED** and is logged to the audit trail as `PRIMARY_WINNER_DEFAULTED`.
   - The system automatically escalates to the **Second Winner** (next lowest unique bid), marking `second_winner_assigned = true` and logging `SECOND_WINNER_ASSIGNED`.
4. **Second Winner Notification**:
   - The Second Winner is immediately notified via push notification and SMS with:
     - Item details
     - Their winning bid amount
     - New 1-month payment deadline
     - Explicit reason for reassignment: *"You have been awarded this auction because the original winner did not complete payment within the specified timeframe."*
5. **Compliant Error Messaging**: If an expired or defaulted winner attempts to process payment, the platform returns a clear, compliant notice:
   > *"This auction is no longer eligible for payment. The payment deadline has expired."*

### 4.7 Paying for a Won Auction

1. From the Winner Screen or notification, tap **"Pay Now"** or **"Process Payment"**.
   - `[screenshot: pay-won-step-1.png]`
2. Choose payment method:
   - **Awash Mobile Wallet**: Enter your wallet PIN to pay directly.
   - **SikinaPay**: Checkout via Mobile Money.
3. You have **1 month (30 days)** to complete payment.
4. After payment, you will see a confirmation screen with delivery tracking.
   - `[screenshot: pay-won-confirmation.png]`

> **Warning**: If you do not pay within your assigned payment deadline (default 1 month / 30 days), the auction will default and escalate to the next qualified bidder. This escalation is irreversible once the deadline expires.

### 4.8 Favorites

1. Tap the **heart icon** on any auction to add it to favorites.
2. Access your favorites via the **Favorites** tab.
3. Remove favorites by tapping the heart again.

### 4.9 Wallet and Deposits

1. Tap **"Wallet"** or **"Deposit"**.
   - `[screenshot: wallet-deposit-step-1.png]`
2. Select a quick amount or enter a custom amount (up to 1,000,000 ETB).
3. Choose payment method (SikinaPay or Awash Bank).
4. Complete the payment.
5. Your balance will update automatically.
   - `[screenshot: wallet-deposit-confirmation.png]`

### 4.10 Notifications

1. Tap the **bell icon** to view notifications.
2. Notifications include:
   - Bid confirmations
   - Outbid alerts
   - Winner announcements
   - Auction extensions
   - Payment reminders
   - Settlement confirmations
3. Mark notifications as read individually or use **"Mark all as read"**.

> **Info**: You can configure which notifications you receive via SMS, push, and in-app. See [Section 13.3](#133-sms-notification-preferences) for details.

### 4.11 Profile

1. Tap **"Profile"** in the navigation.
2. View your account information:
   - Full name
   - Phone number
   - Wallet balance
   - Account status
   - Terms & Conditions acceptance status
3. Update your profile (name, email).
4. Tap **"Sign Out"** to log out.

### 4.12 Setting Up Wallet PIN

1. Go to **Wallet** → **"Set PIN"**.
   - `[screenshot: wallet-pin-step-1.png]`
2. Enter a **4-6 digit PIN**.
3. Confirm your PIN.
4. Your PIN is now required for wallet payments.

> **Warning**: After 5 failed PIN attempts, your PIN will be locked for 30 minutes. Never share your PIN with anyone, including support staff.

### 4.13 Account Management

**Export Your Data:**
1. Go to **Profile** → **"Data Settings"**.
2. Tap **"Export My Data"**.
3. You will receive a JSON file with your account information, bids, and transaction history.

**Delete Your Account:**
1. Go to **Profile** → **"Data Settings"**.
2. Tap **"Delete Account"**.
3. Confirm your password.
4. Your account and all associated data will be permanently deleted.

> **Warning**: Account deletion is irreversible. All bids, favorites, and transaction history will be permanently removed. Certain records (anonymized bid data, payment records) are retained for transparency and compliance as described in [Section 11](#11-data-subject-rights).

---

## 5. Admin Features

### 5.1 Accessing Admin Dashboard

1. Log in with an **admin account**.
2. You will see an **"Admin"** link in the navigation (web) or drawer (mobile).
3. Tap **"Admin Dashboard"**.
   - `[screenshot: admin-access-step-3.png]`

> **Note**: Admin access is role-gated. Only accounts with the admin role can view the Admin Dashboard. Role assignments are logged in the audit trail.

### 5.2 Dashboard Overview

The Admin Dashboard displays:

- **Total Users**: Registered user count.
- **Active Auctions**: Currently running auctions.
- **Total Bids**: All-time bid count.
- **Revenue**: Total platform revenue from bid fees.
- **Daily Bid Trend**: Chart showing bid activity over the last 7 days.
- **Top Bidders**: Users with the most bids.
- **Quick Actions**: Create auction, create product, monitor live auctions.

`[screenshot: admin-dashboard-annotated.png]`

### 5.3 Managing Products

1. Go to **Admin** → **"Products"**.
2. **Create Product**:
   - Enter product name, description, brand, category.
   - Upload images or provide URLs.
   - Enter market price and specifications.
   - Tap **"Create"**.
3. **Edit Product**: Tap the edit icon on any product.
4. **Delete Product**: Tap the delete icon (confirms before deletion).
5. **Bulk Delete**: Select multiple products and delete at once.
6. **Export CSV**: Download product list as CSV.

> **Info**: Newly created products enter the **Product Approval Process** before they can be assigned to auctions. See [Section 13.2](#132-product-approval-process).

### 5.4 Managing Auctions

1. Go to **Admin** → **"Auctions"**.
2. **Create Auction**:
   - Select a product (must be approved).
   - Set start/end times.
   - Configure min bid, max bid, number of winners, bid fee.
   - Tap **"Create"**.
3. **Close Auction**: Tap **"Close"** on an active auction (only if unique bids exist).
4. **Force Close**: Tap **"Force Close"** to end an auction without a winner.
5. **Draw Winner**: After closure, view and draw the winner.
6. **View Bids**: See all bids for an auction with user details.
7. **Bulk Delete**: Select multiple auctions and delete.
8. **Export CSV**: Download auction list as CSV.

### 5.5 User Management

1. Go to **Admin** → **"Users"**.
2. Search users by phone number or name.
3. **View Details**: Tap a user to see their bid history, wallet transactions, and stats.
4. **Change Role**: Promote/demote between user and admin.
5. **Ban/Unban**: Toggle user ban status.
6. **Bulk Operations**: Select multiple users for role changes or bans.
7. **Export CSV**: Download user list as CSV.

> **Warning**: All user management actions (role changes, bans) are recorded in the audit log with actor, timestamp, and reason. These actions are subject to review.

### 5.6 Transactions

1. Go to **Admin** → **"Transactions"**.
2. View all wallet transactions (deposits, bid fees, refunds).
3. Filter by transaction type.
4. Export as CSV.

### 5.7 Settlements and Revenue Transparency

1. Go to **Admin** → **"Settlements"**.
2. View settlement records for each closed auction:
   - **Auction ID and Product**: Which auction settled.
   - **Total Bid Fee Revenue**: Sum of all bid fees collected.
   - **Winner Payment**: Amount paid by the winning user.
   - **Platform Share**: Revenue retained by the platform.
   - **Settlement Status**: Pending, Completed, Disputed.
   - **Settlement Date**: When the settlement was finalized.
3. Filter by date range or status.
4. Export settlement report as CSV.
5. Each settlement record is linked to its source auction and can be traced end-to-end.

> **Info**: Settlement records are immutable once marked Completed. They form part of the platform's financial transparency commitment described in [Section 10](#10-financial-protection).

`[screenshot: settlement-report-annotated.png]`

### 5.8 Audit Logs

1. Go to **Admin** → **"Audit Logs"**.
2. View security and compliance events with filtering:
   - **Actor**: Search by user ID or phone number
   - **Action**: Filter by action type (login, role_change, ban, auction_close, payment, etc.)
   - **Entity Type**: Filter by entity (user, auction, payment, product)
   - **Entity ID**: Search specific entity
   - **Date Range**: Filter by time period
3. Each log entry shows:
   - **Actor**: Who performed the action (user ID + phone)
   - **Action**: What was done
   - **Entity**: What was affected
   - **Details**: Structured JSON with context
   - **Timestamp**: When it occurred
4. Use audit logs for:
   - Security investigations
   - Compliance reporting
   - Debugging admin actions
   - Tracking user behavior

> **Info**: Audit logs are immutable and retained indefinitely. They cannot be edited or deleted by any administrator.

### 5.9 Advanced Admin Analytics

The Analytics module provides administrators with deeper operational insight:

1. Go to **Admin** → **"Analytics"**.
2. Available reports and metrics:
   - **User Growth Chart**: Registrations over time (daily, weekly, monthly).
   - **Bid Volume Analytics**: Total bids per day/week with trend lines.
   - **Revenue Forecasting**: Projected revenue based on historical bid fee collection.
   - **Auction Performance**: Per-auction metrics: participation rate, average bids, extension frequency, completion rate.
   - **User Engagement**: Active users, retention rate, average session duration.
   - **Payment Funnel**: Conversion from bid fee payment → bid placement → win → winner payment.
   - **Geographic Distribution**: Bidder distribution by region (aggregated, anonymized).
   - **Fair Play Metrics**: Extension frequency, no-unique-bid occurrences, winner rotation count.
3. Filter all reports by date range, category, and auction status.
4. Export any report as CSV or PDF.
5. Schedule recurring report delivery via email.

`[screenshot: admin-analytics-annotated.png]`

> **Note**: Analytics data is aggregated and does not expose individual user identities. Geographic data is anonymized to regional level only.

### 5.10 Live Auction Monitor

1. Go to **Admin** → **"Monitor"**.
2. View all live auctions in real-time with:
   - **Live Bid Count**: Updates via WebSocket every few seconds
   - **Bid Table**: All bids with amounts, users, and timestamps
   - **Bid Distribution**: Chart showing frequency of bid amounts
   - **Unique Bid Tracker**: Real-time lowest unique bid calculation
3. Actions available:
   - **Close Auction**: Early close (only if unique bids exist)
   - **Force Close**: End auction without winner
   - **Draw Winner**: Manually trigger winner calculation
4. Monitor multiple auctions simultaneously in dashboard view.

### 5.11 System Health & Backup Status

1. Go to **Admin** → **"System Health"**.
2. View real-time status:
   - **Database**: Connection status, replication lag, connection pool usage
   - **Redis**: Connection status, memory usage, key count, Sentinel/Cluster status
   - **Services**: Health of all 3 microservices (identity, auction, query)
   - **WebSocket**: Active connections, messages per second
   - **Queue**: BullMQ job queue depth, processing rate, failed jobs
3. Backup status:
   - Last successful backup time
   - Backup type (full/differential/incremental)
   - Backup size and duration
   - Next scheduled backup
4. Disaster recovery:
   - RTO/RPO targets and current compliance
   - Point-in-time recovery capability
   - Manual restore trigger (with confirmation)

> **Info**: Health endpoints return HTTP 503 when degraded (database or Redis down), enabling automated monitoring alerts.

---

## 6. Payment Guide

### 6.1 Supported Payment Methods

| Method | Description | How to Use |
|--------|-------------|------------|
| **Awash Wallet** | Mobile wallet via Awash Bank | Enter PIN in app |
| **SikinaPay** | Online payment gateway | Redirected to SikinaPay page |
| **Internal Wallet** | Pre-funded platform wallet | Enter PIN in app |

### 6.2 Paying a Bid Fee

1. Tap **"Place Bid"** on any active auction.
   - `[screenshot: pay-fee-step-1.png]`
2. Review the fee amount.
3. Select **Awash Wallet** or **SikinaPay**.
4. Complete payment:
   - **Awash Wallet**: Enter your 4-6 digit PIN.
   - **SikinaPay**: Enter card details on the SikinaPay page.
5. Return to the app — your bid entry screen will appear automatically.
   - `[screenshot: pay-fee-step-5.png]`

### 6.3 Paying for a Won Auction

1. After winning, you will receive a notification.
2. Tap **"Pay Now"** from the notification or Winner Screen.
3. Select your payment method.
4. Complete payment within **three months (90 days)**.
5. You will receive a **Payment Confirmed** screen with delivery tracking.
   - `[screenshot: pay-won-confirmed.png]`

### 6.4 Depositing to Wallet

1. Go to **Wallet** → **"Deposit"**.
2. Select amount (quick select or custom):
   - Quick: 100, 250, 500, 1000 ETB
   - Custom: Up to 1,000,000 ETB
3. Select payment method (SikinaPay or Awash Bank).
4. Complete payment.
5. Your balance updates immediately.

### 6.5 Payment Status

| Status | Meaning |
|--------|---------|
| **PENDING** | Payment initiated, awaiting confirmation |
| **SUCCESSFUL** | Payment completed successfully |
| **FAILED** | Payment failed (retry or use another method) |
| **EXPIRED** | Payment link expired (request new link) |
| **CANCELLED** | Payment was cancelled |
| **REVOKED** | Payment was revoked by gateway |

### 6.6 Refund Policy

| Scenario | Refund Eligible? | Process |
|----------|-----------------|---------|
| Bid fee paid, bid placed | No | Bid fee is a service charge for participation |
| Won auction, paid, auction cancelled by admin | Yes | Full refund of winner payment; automatic |
| Payment failed (no funds deducted) | N/A | No refund needed; retry or use another method |
| Duplicate payment due to system error | Yes | Contact support; verified and refunded within 5 business days |
| Wallet deposit failed but funds debited | Yes | Contact support; verified and credited within 3 business days |

> **Info**: Refunds for eligible scenarios are processed automatically where possible. For manual verification cases, contact `payments@guessx.com`.

---

## 7. User Rights & Responsibilities

Guess X is committed to protecting user rights and maintaining a fair, transparent auction environment. This section defines what users can expect from the platform and what is expected of them in return.

### 7.1 User Rights

As a Guess X user, you have the right to:

1. **Transparent Auctions**: View complete bid breakdowns after any auction closes, including all bid amounts and their uniqueness status.
2. **Fair Treatment**: Participate under the same rules as all other users. No user receives preferential treatment in bid processing or winner selection.
3. **Data Access**: Request and receive a copy of all personal data Guess X holds about you, including bid history and transaction records.
4. **Data Correction**: Request correction of inaccurate personal information (name, phone number).
5. **Data Deletion**: Request permanent deletion of your account and associated personal data, subject to retention obligations for payment and audit records.
6. **Data Portability**: Receive your data in a structured, machine-readable format (JSON) for transfer to another service.
7. **Notification Control**: Choose which notification channels (SMS, push, email, in-app) you receive and for which event types.
8. **Account Security**: Expect industry-standard security measures including encrypted storage, secure authentication, and session protection.
9. **Dispute Resolution**: File a complaint or dispute and receive a response within the timelines defined in [Section 8](#8-dispute-resolution).
10. **Terms Transparency**: Access the current Terms & Conditions at any time and be notified of material changes before they take effect.
11. **Financial Transparency**: View your complete transaction history and request statements for any period.
12. **Refund for Eligible Cases**: Receive refunds for eligible scenarios as defined in the Refund Policy ([Section 6.6](#66-refund-policy)).

### 7.2 User Responsibilities

As a Guess X user, you are responsible for:

1. **Accurate Information**: Providing truthful and accurate information during registration, including your real name and valid phone number.
2. **Account Security**: Keeping your password and wallet PIN confidential. You are responsible for all activity on your account.
3. **Single Account**: Maintaining only one account per phone number. Creating multiple accounts to manipulate auctions is prohibited.
4. **Accepted Terms**: Reading and accepting the Terms & Conditions before participating. You must not place bids if you do not agree to the terms.
5. **Payment Obligations**: Completing payment within three months (90 days) if you win an auction. Failure to do so results in forfeiture to the next winner.
6. **Fair Play**: Not attempting to manipulate auctions through automated bidding scripts, collusion with other users, or exploitation of system vulnerabilities.
7. **Lawful Use**: Using the platform only for lawful purposes and in compliance with applicable laws.
8. **Timely Reporting**: Reporting suspected security issues, unauthorized account access, or platform errors to support promptly.

> **Warning**: Violation of user responsibilities may result in account suspension, bid forfeiture, and permanent ban. All enforcement actions are recorded in the audit log and are subject to review through the dispute resolution process.

---

## 8. Dispute Resolution

Guess X provides a structured dispute resolution process to ensure user concerns are addressed fairly and promptly.

### 8.1 How to File a Complaint

1. Go to **Profile** → **"Support"** → **"File a Dispute"**.
   - `[screenshot: dispute-step-1.png]`
2. Select the dispute category:
   - **Auction Fairness**: Concerns about bid processing, winner selection, or extension rules.
   - **Payment Issue**: Problems with bid fees, winner payments, deposits, or refunds.
   - **Account Issue**: Problems with login, account access, or profile data.
   - **Product Issue**: Concerns about product condition, delivery, or description accuracy.
   - **Other**: Any concern not covered above.
3. Provide the following details:
   - Affected auction ID or transaction ID (if applicable)
   - Description of the issue
   - Desired resolution
   - Supporting evidence (screenshots, receipts — optional)
4. Submit the dispute. You will receive a **dispute reference number** (e.g., `DSP_2026_001234`).
   - `[screenshot: dispute-confirmation.png]`

### 8.2 Escalation Process

Disputes are handled through a three-tier escalation process:

| Tier | Handler | Scope | Response Time |
|------|---------|-------|---------------|
| **Tier 1 — Initial Review** | Support Agent | Acknowledgment, initial assessment, routine resolution | Within 24 hours |
| **Tier 2 — Detailed Investigation** | Senior Support / Operations Lead | Complex payment, fairness, or multi-party disputes | Within 3 business days |
| **Tier 3 — Final Review** | Dispute Review Panel (3 members) | Appeals of Tier 2 decision, systemic issues | Within 10 business days |

**Escalation Steps:**
1. Your dispute is automatically assigned to **Tier 1** upon submission.
2. If the Tier 1 handler cannot resolve the dispute or you request escalation, it moves to **Tier 2**.
3. If you disagree with the Tier 2 decision, you may appeal to **Tier 3** within 7 days of the decision.
4. The **Tier 3** decision is final within the Guess X platform. You retain the right to seek external resolution.

### 8.3 Resolution Timeline

| Stage | Maximum Duration |
|-------|-----------------|
| Acknowledgment of dispute | 24 hours |
| Tier 1 resolution | 3 business days |
| Tier 2 resolution | 7 business days |
| Tier 3 resolution | 15 business days |
| Total maximum (all tiers) | 25 business days |

> **Info**: You will receive status updates at each stage via your preferred notification channels. You can track your dispute status at **Profile** → **"Support"** → **"My Disputes"**.

### 8.4 What to Expect

- Each dispute is assigned a unique reference number for tracking.
- All communications regarding the dispute are recorded and retained.
- If the dispute is resolved in your favor, remediation (refund, bid reinstatement, etc.) is processed within 5 business days.
- If the dispute involves potential platform-wide issues, it may be escalated directly to Tier 3.
- You may withdraw a dispute at any time before a final decision is issued.

---

## 9. Fair Play Guarantee

Guess X guarantees that all auctions are conducted fairly, transparently, and without manipulation. This section explains the technical and procedural safeguards that ensure fairness.

### 9.1 The Lowest Unique Bid (LUB) Algorithm

The winner of each auction is determined by the **Lowest Unique Bid** algorithm:

1. **Uniqueness Check**: For each bid amount, the system counts how many users placed that exact amount.
2. **Unique Bid Identification**: Amounts placed by exactly one user are identified as "unique bids."
3. **Lowest Selection**: Among all unique bids, the lowest amount is the winning bid.
4. **Winner Assignment**: The user who placed the lowest unique bid is declared the winner.

**Example:**
| Bid Amount | Number of Bidders | Unique? |
|------------|-------------------|---------|
| 1.00 | 3 | No (duplicated) |
| 2.00 | 1 | Yes |
| 3.00 | 1 | Yes |
| 5.00 | 2 | No (duplicated) |

In this example, the unique bids are 2.00 and 3.00. The **lowest unique bid is 2.00**, and the user who placed it wins.

### 9.2 Algorithm Integrity Safeguards

The LUB algorithm is protected by multiple safeguards:

1. **Atomic Processing**: Each bid is processed sequentially per auction using distributed locks. No two bids are processed simultaneously for the same auction, eliminating race conditions.
2. **Nonce Validation**: Each bid request includes a unique nonce to prevent replay attacks and duplicate submissions.
3. **Immutable Bid Records**: Once a bid is recorded, it cannot be modified or deleted by any user or administrator. Bids are stored with a cryptographic integrity check.
4. **Deterministic Calculation**: Winner selection is a pure function of the recorded bids. Given the same set of bids, the algorithm always produces the same result — there is no randomization or administrator discretion in winner selection.
5. **Real-Time Verification**: The live auction monitor continuously recalculates the lowest unique bid, allowing administrators and users to observe the current state at any time.
6. **Post-Closure Audit**: After each auction closes, the full bid breakdown is published and can be independently verified by any participant.

### 9.3 Audit Trail

Every auction generates a complete audit trail that includes:

- **Bid Log**: Every bid placed, with timestamp, amount, and ticket number.
- **Extension Log**: Every extension applied, with reason and timestamp.
- **Winner Calculation Log**: The exact inputs and output of the LUB algorithm at closure.
- **Winner Rotation Log**: If winner rotation occurs, each step with the offered winner and their response.
- **Closure Record**: Final auction state, winning bid, and settlement initiation.

> **Info**: The audit trail for each auction is available to all participants on the Winner Screen. Administrators can access the full audit trail via the Admin Audit Logs module. Audit records are immutable and retained indefinitely.

### 9.4 Fair Play Rules Summary

| Rule | Purpose | Automatic? |
|------|---------|-----------|
| **No-Bid Extension (7 Days)** | Extends weekly up to 10 times if no bids exist | Yes |
| **Limited Bidders Rule (<100)** | Extends weekly up to 10 times to ensure healthy competition | Yes |
| **Final Closure (10 Extensions)** | Permanently closes zero-bid auctions and alerts administrators | Yes |
| **Administrator Bidding Prohibition** | Prevents conflict of interest; blocked immediately at initiation | Yes |
| **Maximum Bid Early Close** | Closes immediately when target bid volume is met | Yes |
| **Winner Rotation & Escalation** | Reassigns item to Second Winner if primary winner defaults (30 days) | Yes |
| **Bid Limit (150 per user)** | Prevents domination by a single participant | Yes |
| **Fee Bounds (1.00 - 10,000 ETB)** | Validates that participation fees remain within calibrated bounds | Yes |
| **Sequential Processing** | Neutralizes race conditions using atomic Redis commands | Yes |

> **Note**: Fair play rules are enforced uniformly by the system engine and cannot be selectively overridden. Every administrative intervention (manual winner draw, forced closure, auction reopening) is recorded in the immutable audit trail.

---

## 10. Financial Protection

Guess X implements multiple layers of financial protection to safeguard user funds and ensure transaction integrity.

### 10.1 Wallet Security

1. **PIN Protection**: All wallet transactions require a 4-6 digit PIN. After 5 failed attempts, the PIN is locked for 30 minutes.
2. **Encryption at Rest**: Wallet balances and transaction data are encrypted using AES-256-GCM.
3. **Transaction Authentication**: Every wallet transaction is authenticated against the user's active session and PIN.
4. **Balance Integrity**: Wallet balances are maintained as a derived value from the immutable transaction log, not as a mutable counter. This prevents balance corruption.
5. **Deposit Verification**: All deposits require confirmation from the payment gateway (via signed webhook) before the wallet balance is updated. Unsigned or tampered webhooks are rejected.
6. **Withdrawal Limits**: Wallet deposits are capped at 1,000,000 ETB per transaction. Daily aggregate limits may apply.

### 10.2 Payment Protection

1. **Gateway Integration**: Payments are processed through established gateways (Awash Bank, SikinaPay). Guess X never stores full card numbers or banking credentials.
2. **Webhook Signature Verification**: All payment webhooks are verified using HMAC-SHA256 signatures with constant-time comparison to prevent timing attacks.
3. **Idempotent Processing**: Payment callbacks are processed idempotently — duplicate webhook deliveries do not result in double crediting.
4. **Timeout Protection**: Payment links expire after 30 seconds of inactivity. Pending payments that do not receive webhook confirmation within 5 minutes are flagged for manual review.
5. **Failed Payment Safety**: If a payment fails, no funds are deducted from the user's wallet or external account. The user may retry without penalty.

### 10.3 Refund Policy

The complete refund policy is defined in [Section 6.6](#66-refund-policy). Key principles:

- Bid fees are non-refundable as they represent a service charge for participation.
- Winner payments are refundable if the auction is cancelled by the platform.
- System-error-induced duplicate payments are refunded after verification.
- All refunds are processed to the original payment method where possible.

### 10.4 Winner Payment Protection

1. **Three-Month Window**: Winners have three months (90 days) to complete payment, clearly communicated via notification and on-screen countdown.
2. **Winner Rotation**: If the primary winner does not pay, the auction is offered to subsequent winners — no user is forced to pay for an auction they did not actively win.
3. **Payment Confirmation**: Winner payments are confirmed via the same gateway webhook process as bid fees, ensuring the same level of verification.
4. **Delivery Tracking**: After winner payment, a delivery tracking reference is provided so the winner can monitor shipment.

### 10.5 Financial Transparency

1. **Transaction History**: Users can view their complete transaction history at any time via the Wallet module.
2. **Settlement Records**: Settlement records for each auction are maintained and available to administrators, showing revenue sources and distribution.
3. **Statement Export**: Users can export their transaction history as CSV or JSON for personal records or tax purposes.
4. **Audit Linkage**: Every financial transaction is linked to an audit log entry, enabling end-to-end traceability.

> **Info**: Payment records are retained for 7 years in accordance with financial record-keeping standards. Audit logs are retained indefinitely.

---

## 11. Data Subject Rights

Guess X respects your rights regarding your personal data. This section describes each right and how to exercise it.

### 11.1 Right of Access

You have the right to know what personal data Guess X holds about you.

**How to exercise:**
1. Go to **Profile** → **"Data Settings"**.
2. Tap **"Export My Data"**.
3. You will receive a JSON file containing:
   - Account information (name, phone number, registration date)
   - Bid history (all bids with amounts, timestamps, auction IDs, ticket numbers)
   - Transaction history (all wallet and payment transactions)
   - Notification preferences
   - Terms & Conditions acceptance history
   - Favorites/watchlist

> **Info**: The export is generated on-demand and reflects your data as of the request moment. Delivery is immediate via download.

### 11.2 Right to Rectification

You have the right to correct inaccurate personal data.

**How to exercise:**
1. Go to **Profile** → **"Account Info"**.
2. Update your name or email directly.
3. For phone number changes (your primary identifier), contact support with verification of both the old and new numbers.

### 11.3 Right to Erasure

You have the right to request deletion of your personal data.

**How to exercise:**
1. Go to **Profile** → **"Data Settings"**.
2. Tap **"Delete Account"**.
3. Confirm your password.
4. Your account and associated personal data will be permanently deleted.

**What is deleted:**
- Profile information (name, phone, email)
- Bid history
- Favorites and watchlist
- Notification preferences
- Wallet balance (any remaining balance must be withdrawn before deletion)

**What is retained (for compliance and transparency):**
- Anonymized bid data (bid amounts without user association) — retained for auction transparency
- Payment records — retained for 7 years per financial record-keeping standards
- Audit log entries — retained indefinitely; personal identifiers within logs are anonymized after account deletion

> **Warning**: Account deletion is irreversible. Ensure you have withdrawn any wallet balance and exported any data you wish to keep before proceeding.

### 11.4 Right to Data Portability

You have the right to receive your data in a structured, machine-readable format.

**How to exercise:**
1. Go to **Profile** → **"Data Settings"**.
2. Tap **"Export My Data"**.
3. The data is provided in JSON format, which is a standard, portable format consumable by any JSON-capable application.

### 11.5 Data Processing Principles

Guess X adheres to the following data processing principles:

| Principle | How Guess X Complies |
|-----------|---------------------|
| **Lawfulness** | Data is processed only with user consent (T&C acceptance) and for legitimate platform operations |
| **Fairness** | Data processing is transparent; users are informed of what is collected and why |
| **Minimization** | Only data necessary for platform operation is collected |
| **Accuracy** | Users can correct their data at any time |
| **Storage Limitation** | Personal data is deleted on account deletion; records are retained only as required for compliance |
| **Integrity & Confidentiality** | Data is encrypted at rest (AES-256-GCM) and in transit (TLS) |
| **Accountability** | All data access and processing events are logged in the audit trail |

---

## 12. Terms & Conditions Summary

This section summarizes the key terms that users must accept before participating on the Guess X platform. The full Terms & Conditions document is available within the app and at [https://docs.guessx.com/terms](https://docs.guessx.com/terms).

### 12.1 Key Terms Summary

| Term | Summary |
|------|---------|
| **Eligibility** | You must be 18 years or older and provide accurate registration information |
| **Account Responsibility** | You are responsible for all activity on your account; keep credentials confidential |
| **Bid Fee** | Each bid requires a non-refundable service fee; the fee is disclosed before each bid |
| **Bid Validity** | Bids are final once submitted; they cannot be modified or withdrawn |
| **Winner Obligation** | Winners must complete payment within three months (90 days) or forfeit to the next winner |
| **Fair Play** | Automated bidding, collusion, and system exploitation are prohibited |
| **Data Usage** | Your data is used for platform operation, transparency, and compliance as described in [Section 11](#11-data-subject-rights) |
| **Platform Liability** | Guess X is not liable for bid fees paid; platform liability for winner payments is limited to the product value |
| **Auction Modifications** | Guess X may extend auctions per fair-play rules but cannot alter bids after submission |
| **Account Suspension** | Guess X may suspend accounts for violation of terms; suspended users may dispute via [Section 8](#8-dispute-resolution) |
| **Terms Changes** | Material changes to terms are communicated before taking effect; continued use constitutes acceptance |

### 12.2 Acceptance Requirement

- Users must explicitly accept the Terms & Conditions before placing any bid, making any deposit, or participating in any auction.
- Acceptance is recorded with a timestamp and the specific T&C version accepted.
- If the Terms & Conditions are updated, users must accept the new version before continuing to participate.
- The acceptance flow is described in [Section 13.1](#131-terms--conditions-acceptance-flow).

> **Note**: The Terms & Conditions are designed to be clear and accessible. They are available in all supported languages (see [Section 15](#15-multi-language-support)).

---

## 13. New Feature Documentation

### 13.1 Terms & Conditions Acceptance Flow

All users must accept the Terms & Conditions before participating in any auction activity.

**For New Users:**
1. Complete account registration (phone or social login).
2. After automatic login, you will be presented with the **Terms & Conditions** screen.
   - `[screenshot: tc-new-user-step-2.png]`
3. Read the terms. You can scroll through the full document or tap **"View Full Terms"** to open a dedicated page.
4. Check the box: **"I have read and accept the Terms & Conditions"**.
5. Tap **"Accept & Continue"**.
6. You will be redirected to the Home screen and can now participate in auctions.
   - `[screenshot: tc-acceptance-complete.png]`

**For Existing Users (Terms Updated):**
1. Upon next login or app open, you will see a **"Terms & Conditions Updated"** notice.
   - `[screenshot: tc-updated-notice.png]`
2. A summary of changes is displayed at the top.
3. Read the updated terms.
4. Check the acceptance box and tap **"Accept & Continue"**.
5. If you decline, tap **"Decline"**. You will be logged out and cannot participate until you accept.

> **Warning**: You cannot place bids, deposit funds, or participate in auctions without accepting the current Terms & Conditions. Your acceptance is logged with the T&C version and timestamp.

### 13.2 Product Approval Process

All products must pass through an approval process before they can be assigned to auctions. This ensures product quality and description accuracy.

**Submission (Admin/Creator):**
1. Go to **Admin** → **"Products"** → **"Create Product"**.
2. Enter product details: name, description, brand, category, market price, specifications, and images.
3. Tap **"Submit for Approval"**.
4. The product enters **Pending Approval** status.
   - `[screenshot: product-approval-pending.png]`

**Review (Approver Role):**
1. Go to **Admin** → **"Products"** → **"Pending Approval"** tab.
2. Review the product details:
   - Product name and description accuracy
   - Image quality and authenticity
   - Market price reasonableness
   - Specification completeness
   - Category appropriateness
3. Take one of three actions:
   - **Approve**: Product becomes available for auction assignment.
   - **Reject with Reason**: Product is marked rejected; the reason is recorded.
   - **Request Changes**: Product is returned to the submitter with requested changes noted.
4. All approval actions are logged in the audit trail.

**Product Statuses:**

| Status | Meaning |
|--------|---------|
| **Pending Approval** | Submitted, awaiting reviewer |
| **Approved** | Vetted and available for auction assignment |
| **Rejected** | Rejected with recorded reason |
| **Changes Requested** | Returned to submitter for revision |

> **Info**: Only approved products can be assigned to auctions. This ensures that all auctioned items meet quality and accuracy standards before users bid on them.

### 13.3 SMS Notification Preferences

Users can control which notifications they receive via SMS, avoiding unwanted messages while staying informed about important events.

**Configuring SMS Preferences:**
1. Go to **Profile** → **"Notifications"** → **"SMS Preferences"**.
   - `[screenshot: sms-preferences-step-1.png]`
2. Toggle individual event types on or off:

| Event Type | Default | Description |
|------------|---------|-------------|
| **Bid Confirmation** | On | SMS when your bid is successfully placed |
| **Winner Announcement** | On | SMS when you win an auction |
| **Payment Reminder** | On | SMS reminders before winner payment deadline |
| **Auction Extension** | Off | SMS when an auction you bid on is extended |
| **Auction Closure** | Off | SMS when an auction you bid on closes |
| **Outbid Alert** | Off | SMS when your bid is no longer unique |
| **Deposit Confirmation** | On | SMS when a wallet deposit is confirmed |
| **Marketing/Promotional** | Off | SMS about new auctions and promotions |

3. Tap **"Save Preferences"**.
4. You can also toggle **"Disable All SMS"** to opt out entirely (critical alerts like payment reminders may still be sent as required by law).

> **Info**: SMS preferences are respected immediately. Changes take effect for all subsequent events. In-app and push notification preferences are configured separately on the same screen.

### 13.4 Payment Reminder System

Guess X sends automated payment reminders to winners to ensure they do not miss the three-month (90 days) payment window.

**Reminder Schedule:**

| Reminder | Timing | Channel | Content |
|----------|--------|---------|---------|
| **Initial Winner Notification** | At auction closure | Push, SMS (if enabled), In-app | "You won! Complete payment within three months (90 days)." |
| **Periodic Reminders** | Configurable intervals | Push, SMS (if enabled), In-app | "Reminder to complete your winning auction payment." |
| **Final Reminder** | Before deadline | Push, SMS, In-app (always sent) | "Urgent: Payment deadline is approaching soon." |
| **Expiration Notice** | 90 days after closure | Push, In-app | "Payment window expired. Auction offered to next winner." |

**How it works:**
1. When an auction closes and you are the winner, the reminder schedule is automatically activated.
2. Reminders are sent via your configured notification channels (see [Section 13.3](#133-sms-notification-preferences)).
3. The **Final Reminder** and **Expiration Notice** are always sent regardless of preferences, as they concern a time-sensitive financial obligation.
4. If you complete payment at any point, remaining reminders are automatically cancelled.
5. If you do not pay, the expiration notice informs you that the auction has been offered to the next winner.

> **Info**: The payment reminder system is designed to protect users from accidentally forfeiting won auctions due to missed deadlines.

### 13.5 Settlement and Revenue Transparency

Guess X publishes settlement data for each closed auction, providing transparency into how revenue is collected and distributed.

**User View:**
1. After an auction closes, go to the **Winner Screen** for that auction.
2. Tap **"Settlement Details"**.
3. View:
   - Total bids placed and total bid fee revenue collected
   - Winning bid amount and winner payment status
   - Whether the auction resulted in a completed settlement or expiration

**Admin View:**
1. Go to **Admin** → **"Settlements"** (see [Section 5.7](#57-settlements-and-revenue-transparency)).
2. View the full settlement record for any auction:
   - Auction ID, product, and closure date
   - Total bid fee revenue (sum of all bid fees)
   - Winner payment amount and status
   - Platform revenue (bid fees + winner payment, minus any refunds)
   - Settlement status and date
3. Export settlement reports as CSV for accounting or audit purposes.

**Transparency Commitments:**
- Settlement records are immutable once completed.
- Every settlement is linked to its source auction and all constituent transactions.
- Settlement data is available for independent review.
- Revenue from bid fees is clearly separated from winner payments.

`[screenshot: settlement-transparency.png]`

> **Info**: This transparency allows users and reviewers to verify that the platform collects only the disclosed bid fees and winner payments, with no hidden charges.

### 13.6 Advanced Admin Analytics

See [Section 5.9](#59-advanced-admin-analytics) for full documentation of the analytics module available to administrators.

---

## 14. Accessibility

Guess X is committed to making the platform accessible to all users, including those with disabilities.

### 14.1 Screen Reader Support

- The web platform supports major screen readers including **NVDA**, **JAWS**, and **VoiceOver** (macOS/iOS).
- All interactive elements have descriptive **ARIA labels**.
- Form fields include associated labels and instructions.
- Dynamic content changes (e.g., live bid updates) are announced via **ARIA Live Regions**.
- Images include **alt text** describing their content or function.

### 14.2 Keyboard Navigation

- All functionality is accessible via keyboard without requiring a mouse.
- **Tab** and **Shift+Tab** move focus between interactive elements in logical order.
- **Enter** activates buttons and links.
- **Escape** closes modals and overlays.
- Visible focus indicators (outline) are present on all focusable elements.
- **Skip to main content** links are provided on web to bypass navigation.

### 14.3 Visual Accessibility

- **Color contrast** meets WCAG 2.1 AA standards (minimum 4.5:1 for normal text).
- The interface does not rely on color alone to convey information; text labels and icons accompany color indicators.
- Text can be resized up to 200% without loss of functionality or content.
- **Dark mode** is available to reduce eye strain.

### 14.4 Cognitive Accessibility

- Instructions are clear and concise.
- Error messages are descriptive and suggest corrective action.
- Confirmation dialogs prevent accidental destructive actions (e.g., account deletion).
- Consistent navigation and layout across screens reduce cognitive load.

### 14.5 Mobile Accessibility

- Touch targets meet minimum size guidelines (44x44 pt on iOS, 48x48 dp on Android).
- The app respects system-level accessibility settings (font size, bold text, high contrast).
- **TalkBack** (Android) and **VoiceOver** (iOS) are supported.

> **Info**: Guess X continuously improves accessibility based on user feedback. If you encounter an accessibility barrier, please report it to `support@guessx.com` with the subject "Accessibility Feedback."

---

## 15. Multi-Language Support

Guess X supports multiple languages to serve its diverse user base.

### 15.1 Supported Languages

| Language | Code | Status |
|----------|------|--------|
| **English** | en | Full support |
| **Amharic** | am | Full support |
| **Oromo (Afaan Oromoo)** | om | Full support |
| **Tigrinya** | ti | Full support |

### 15.2 Changing Language

1. Go to **Profile** → **"Settings"** → **"Language"**.
   - `[screenshot: language-settings.png]`
2. Select your preferred language.
3. The interface updates immediately.
4. Your language preference is saved to your account and applied on all future logins.

### 15.3 What Is Translated

- All user interface text (buttons, labels, menus, messages)
- Terms & Conditions document
- Notifications (push, SMS, in-app)
- Error messages and validation messages
- FAQ and help content

### 15.4 Language Detection

- On first visit, the platform detects your browser/device language and sets the default if it matches a supported language.
- You can override the detected language at any time via settings.
- If your preferred language is not yet supported, English is used as fallback.

> **Info**: Guess X is committed to expanding language support. Additional languages may be added based on user demand.

---

## 16. Device Compatibility & Network Requirements

### 16.1 Device Compatibility Matrix

#### Web Platform

| Browser | Minimum Version | Supported | Notes |
|---------|-----------------|-----------|-------|
| **Google Chrome** | 90+ | ✅ | Recommended for best experience |
| **Mozilla Firefox** | 88+ | ✅ | Fully supported |
| **Apple Safari** | 14+ | ✅ | Fully supported (macOS and iOS) |
| **Microsoft Edge** | 90+ | ✅ | Fully supported (Chromium-based) |
| **Samsung Internet** | 14+ | ✅ | Supported (Android) |
| **Opera** | 76+ | ✅ | Supported (Chromium-based) |
| **Internet Explorer 11** | — | ❌ | Not supported (end of life) |

#### Mobile Platform

| OS | Minimum Version | Form Factor | Notes |
|----|-----------------|-------------|-------|
| **iOS** | 14.0+ | iPhone, iPad | Expo Go or native build |
| **Android** | 10.0 (API 29)+ | Phone, Tablet | Expo Go or native build |
| **iPadOS** | 14.0+ | iPad | Supported with responsive layout |

#### Hardware Recommendations

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **RAM** | 2 GB | 4 GB or more |
| **Storage** | 100 MB free | 500 MB free |
| **Screen Resolution** | 360x640 | 1080x1920 or higher |

### 16.2 Network Requirements

| Connection Type | Minimum Speed | Recommended | Notes |
|-----------------|---------------|-------------|-------|
| **4G/LTE** | 1 Mbps | 5 Mbps or more | Best for mobile use |
| **3G** | 256 Kbps | — | Functional but may experience delays |
| **Wi-Fi** | 1 Mbps | 5 Mbps or more | Recommended for bidding |
| **5G** | — | Any | Excellent performance |
| **2G / Edge** | — | ❌ | Not supported; real-time updates will fail |

**Network Considerations:**
- **WebSocket connectivity** is required for real-time bid updates. Ensure your network/firewall does not block WebSocket connections (ports 80/443).
- **Latency**: For time-sensitive bidding, a connection with less than 500ms latency is recommended.
- **Offline behavior**: If you lose connection mid-bid, the bid may not be submitted. Reconnect and check "My Bids" to verify. Do not resubmit without checking, as this may result in a duplicate bid fee charge.
- **VPN**: Most VPNs are compatible. If real-time updates fail, try disabling the VPN or switching servers.

> **Warning**: Bidding over an unstable connection may result in failed submissions or delayed confirmations. Always verify your bid status in "My Bids" after placing a bid on an unstable connection.

---

## 17. FAQ

### General

**Q: What is the Lowest Unique Bid (LUB) auction?**
A: In a LUB auction, the winner is the person who placed the lowest bid amount that no one else placed. For example, if bids are 5.00, 10.00, 10.00, 15.00, the winner is the person who bid 5.00 (lowest and unique).

**Q: How much does it cost to bid?**
A: Each bid requires a non-refundable bid service fee (starting from 1.00 ETB, configurable per auction). The fee is deducted from your wallet when you place the bid.

**Q: Can I get a refund if I don't win?**
A: No, the bid service fee is non-refundable. However, if you win and pay, but the auction is cancelled by admin, you will receive a refund.

**Q: How many bids can I place?**
A: Maximum 150 bids per auction per user.

**Q: How long do I have to pay if I win?**
A: A configurable deadline (default 1 month / 30 days) from the auction closure time or reassignment date. If you don't pay within this timeframe, the auction status transitions to "Payment Defaulted" and escalates to the Second Winner.

**Q: Why do auctions get extended?**
A: Auctions are extended by 24 hours if: (1) the minimum bid threshold is not met, or (2) no unique bids exist. This ensures fair play for all participants.

**Q: What happens if I win but don't pay?**
A: If payment is not completed before the 1-month deadline, the auction payment status changes to "Payment Defaulted" and your winner status is marked as EXPIRED. The system automatically escalates to the Second Winner (the next lowest unique bid), logging both events to the immutable audit trail.

### Terms & Conditions

**Q: Why do I need to accept Terms & Conditions?**
A: The Terms & Conditions define the rules of participation, your rights, and your responsibilities. You must accept them before placing bids or making deposits to ensure you understand and agree to the platform's operating terms.

**Q: What happens if I decline the Terms & Conditions?**
A: You cannot participate in any auction activity (bidding, deposits, payments) without accepting. If you decline an update, you will be logged out and cannot participate until you accept.

**Q: How will I know if the Terms & Conditions change?**
A: You will see a notification upon next login or app open. A summary of changes is provided, and you must accept the updated terms before continuing.

**Q: What version of the Terms did I accept?**
A: Your Profile page shows your current T&C acceptance status, including the version and date accepted. This is also included in your data export.

### Product Approval

**Q: How do I know a product is legitimate?**
A: All products pass through a Product Approval Process before being assigned to auctions. An approver reviews the product name, description, images, market price, and specifications for accuracy and quality.

**Q: Can I see the approval status of a product?**
A: Administrators can see approval status in Admin → Products. Users see only approved products in auctions; pending or rejected products are never listed.

**Q: What if a product I won doesn't match its description?**
A: You can file a dispute under the "Product Issue" category (see [Section 8](#8-dispute-resolution)). If verified, you may receive a refund of your winner payment.

### SMS Reminders

**Q: How do I stop receiving SMS notifications?**
A: Go to Profile → Notifications → SMS Preferences and toggle off specific event types, or disable all SMS. Note that critical payment reminders may still be sent as required.

**Q: I'm not receiving SMS notifications. What should I do?**
A: Verify your phone number is correct in your profile. Check that SMS preferences are enabled for the event type. Ensure your mobile carrier is not blocking short-code messages. Contact support if issues persist.

**Q: Will I get a reminder before my winner payment expires?**
A: Yes. You receive periodic reminders leading up to the 90-day deadline, plus a final reminder and expiration notice. The final reminder is always sent regardless of your notification preferences.

### Settlement

**Q: What is a settlement?**
A: A settlement is the financial reconciliation of a closed auction — it records the total bid fee revenue, winner payment, and platform revenue. Settlements are immutable once completed.

**Q: Can I see settlement data for an auction I participated in?**
A: Yes. After an auction closes, go to the Winner Screen and tap "Settlement Details" to see the auction's financial summary.

**Q: Why does the platform keep bid fees?**
A: Bid fees are the service charge for participating in the auction. They are the platform's primary revenue source and are clearly disclosed before each bid.

### Account

**Q: How do I change my password?**
A: Currently, password changes require contacting support. This feature will be available in a future update.

**Q: How do I reset my wallet PIN?**
A: If you forget your PIN, contact support for a reset. After 5 failed attempts, your PIN will be locked for 30 minutes automatically.

**Q: Can I have multiple accounts?**
A: Each account must use a unique phone number. Creating multiple accounts with the same phone number is not allowed.

**Q: How do I delete my account?**
A: Go to Profile → Data Settings → Delete Account. Account deletion is irreversible and will remove all your data. See [Section 11.3](#113-right-to-erasure) for details on what is retained.

### Payments

**Q: Which payment methods are supported?**
A: Currently, Awash Bank Mobile Wallet and SikinaPay are supported. Internal wallet top-up is also available.

**Q: Is it safe to use my card on SikinaPay?**
A: Yes, SikinaPay uses industry-standard encryption and security measures. Your card details are never stored on Guess X servers.

**Q: What happens if my payment fails?**
A: If a payment fails, no funds are deducted from your account. You can retry with the same or a different payment method.

**Q: Why was my payment marked as FAILED?**
A: Common reasons: insufficient balance, card declined by bank, network timeout. Try again or contact your bank.

### Technical

**Q: Why can't I see real-time updates?**
A: Ensure you have a stable internet connection. Real-time updates require WebSocket connectivity. Check if your browser or firewall blocks WebSocket connections.

**Q: Why am I getting "Session Expired"?**
A: Your session has timed out due to 30 minutes of inactivity or 12-hour absolute timeout. Simply log in again.

**Q: The app is slow. What can I do?**
A: Try clearing your browser cache (web) or restarting the app (mobile). Ensure you have a stable internet connection.

**Q: Why does my bid sometimes take time to appear?**
A: Bids are batch-persisted for performance. There may be a slight delay (a few seconds) before your bid appears in the bid list.

**Q: What happens if the auction engine restarts during a live auction?**
A: The system uses Redis for real-time state. When auction-engine restarts, it reconnects to Redis and continues broadcasting. You may see a brief pause (a few seconds) in updates, but no data is lost.

**Q: How does the system ensure fair play during high traffic?**
A: The system uses Redis distributed locks and nonce validation to prevent race conditions. Each bid is processed sequentially per auction, ensuring fairness even under heavy load.

### Security & Compliance

**Q: What data does Guess X log for audit purposes?**
A: Guess X logs all admin actions (user management, auction operations), bidding events, payment transactions, and data access events. Logs include actor ID, action, entity, timestamp, and structured details. Logs are immutable and retained indefinitely for compliance.

**Q: Can I request my data audit trail?**
A: Yes, you can export your account data including bid history and transactions from Profile → Data Settings. Admin users can access full audit logs via Admin → Audit Logs.

**Q: How is my payment data protected?**
A: Payment data is encrypted at rest using AES-256-GCM. Webhook signatures are verified with HMAC-SHA256. Card details are never stored on Guess X servers — they are processed entirely by SikinaPay/Awash Bank.

**Q: What happens to my data if I delete my account?**
A: Account deletion removes your personal data (profile, bids, favorites, notifications). Audit logs and payment records are retained for compliance (7 years for payments, indefinite for audit). Anonymized bid data may remain for auction transparency.

### Accessibility & Language

**Q: Does Guess X support screen readers?**
A: Yes. The web platform supports NVDA, JAWS, and VoiceOver. The mobile apps support TalkBack (Android) and VoiceOver (iOS). See [Section 14](#14-accessibility) for details.

**Q: Can I use Guess X with keyboard only?**
A: Yes. All web functionality is accessible via keyboard. See [Section 14.2](#142-keyboard-navigation) for keyboard navigation details.

**Q: What languages are supported?**
A: English, Amharic, Oromo (Afaan Oromoo), and Tigrinya. See [Section 15](#15-multi-language-support) for details.

---

## 18. Troubleshooting

### 18.1 Login Issues

| Problem | Solution |
|---------|----------|
| "Invalid credentials" error | Verify phone number and password. Ensure caps lock is off. |
| Account locked | Contact support if you believe this is an error. |
| "Too many attempts" | Wait 60 seconds before trying again. |
| "Terms acceptance required" | Accept the current Terms & Conditions to proceed. |

### 18.2 Payment Issues

| Problem | Solution |
|---------|----------|
| Payment link not opening | Check popup blockers. Ensure you are redirected to the correct page. |
| Payment stuck on PENDING | Wait up to 5 minutes for webhook confirmation. If still pending, contact support. |
| Wallet balance not updating | Refresh the page or restart the app. Balance updates automatically within seconds. |
| Payment expired | Request a new payment link. Links expire after 30 seconds. |
| Duplicate charge | Do not resubmit. Contact `payments@guessx.com`; verified duplicates are refunded within 5 business days. |

### 18.3 Bidding Issues

| Problem | Solution |
|---------|----------|
| "Auction closed" error | The auction has ended. Check the results page. |
| "Rate limit exceeded" | Wait a few seconds before placing another bid. |
| "Max bids reached" | You have placed 150 bids on this auction. No more bids allowed. |
| Bid not appearing | Refresh the page. Bids may take a few seconds to sync. |
| "Terms not accepted" | Accept the current Terms & Conditions before bidding. |

### 18.4 Notification Issues

| Problem | Solution |
|---------|----------|
| Not receiving SMS | Check SMS preferences (Profile → Notifications → SMS). Verify phone number. |
| Not receiving push | Enable push notifications in device settings. Check app notification permissions. |
| Too many notifications | Adjust notification preferences to disable non-essential event types. |
| Payment reminder not received | Final reminder is always sent. Check connection and notification permissions. |

### 18.5 App Issues

| Problem | Solution |
|---------|----------|
| White screen / loading forever | Clear cache and reload (web) or restart app (mobile). |
| Images not loading | Check internet connection. Images are loaded from external CDNs. |
| Notifications not received | Ensure push notifications are enabled in your device settings. |
| Real-time updates not working | Check if WebSocket is blocked by firewall or VPN. |
| Audit logs not loading (Admin) | Verify admin permissions. Check browser console for API errors. |
| Backup status not updating | Check system health page. Verify backup CronJobs are running in Kubernetes. |

### 18.6 Browser Compatibility

| Browser | Supported | Notes |
|---------|-----------|-------|
| Chrome 90+ | ✅ | Recommended |
| Firefox 88+ | ✅ | Supported |
| Safari 14+ | ✅ | Supported |
| Edge 90+ | ✅ | Supported |
| IE 11 | ❌ | Not supported |

---

## 19. Maintenance Tips

### 19.1 Keeping Your Account Secure

- **Update your password regularly**: Use a strong, unique password.
- **Don't share your PIN**: Your wallet PIN should never be shared with anyone, including support staff.
- **Log out on shared devices**: Always sign out when using a shared or public device.
- **Review notifications**: Check your notification inbox regularly for security alerts.
- **Monitor transaction history**: Review your wallet transactions regularly for unauthorized activity.

### 19.2 Managing Your Wallet

- **Top up during low traffic**: Deposit funds during off-peak hours for faster processing.
- **Check transaction history**: Regularly review your wallet transactions for accuracy.
- **Set a PIN**: Always set a wallet PIN for additional security.
- **Withdraw before account deletion**: Ensure your wallet balance is zero before deleting your account.

### 19.3 App Performance

- **Clear cache periodically**: On web, clear browser cache every few weeks. On mobile, restart the app weekly.
- **Update the app**: Ensure you are using the latest version of the app.
- **Check internet connection**: Stable internet ensures real-time updates work correctly.
- **Use recommended browsers**: Chrome 90+ or equivalent for best performance.

### 19.4 Data Management

- **Export your data**: Periodically export your account data for personal records.
- **Clean up favorites**: Remove old favorites to keep your watchlist manageable.
- **Review bid history**: Check your bid history to understand your spending patterns.
- **Keep contact info current**: Ensure your phone number is current so you receive critical notifications.

---

## 20. Glossary of Terms

| Term | Definition |
|------|------------|
| **AES-256-GCM** | Advanced Encryption Standard with 256-bit keys in Galois/Counter Mode. A symmetric encryption standard used to protect data at rest. |
| **ARIA Label** | Accessible Rich Internet Applications label. A text description read by screen readers for elements that are not otherwise descriptive. |
| **Audit Log** | An immutable record of system events (admin actions, bids, payments) used for security investigation and compliance. |
| **Audit Trail** | The complete, ordered sequence of audit log entries for a specific entity (e.g., an auction's full lifecycle). |
| **Bid Fee** | A non-refundable service charge required to place a bid in an auction. |
| **Bid Ticket Number** | A unique identifier (e.g., `BID_a1b2c3d4e5f6`) assigned to each bid for tracking and reference. |
| **BullMQ** | A Redis-based job queue used for background task processing in the Guess X backend. |
| **CSV** | Comma-Separated Values. A plain-text format for tabular data, used for exports. |
| **Dispute Reference Number** | A unique identifier (e.g., `DSP_2026_001234`) assigned to a filed dispute for tracking. |
| **ETB** | Ethiopian Birr. The currency used for all transactions on the Guess X platform. |
| **Force Close** | An administrative action to end an auction immediately without declaring a winner. |
| **HMAC-SHA256** | Hash-based Message Authentication Code using SHA-256. Used to verify the authenticity and integrity of payment webhooks. |
| **Idempotent** | A property where performing an operation multiple times has the same effect as performing it once. Prevents duplicate processing. |
| **JSON** | JavaScript Object Notation. A lightweight data-interchange format used for data export and API communication. |
| **LUB (Lowest Unique Bid)** | The auction winner selection algorithm: the lowest bid amount placed by exactly one user wins. |
| **Market Price** | The suggested retail value of a product, displayed for reference alongside auction bidding. |
| **Max Bid** | The maximum number of bids an auction will accept before automatic early closure. |
| **Min Bid** | The minimum number of bids required for an auction to close without extension. |
| **Nonce** | A single-use random value included in bid requests to prevent replay attacks. |
| **PIN** | Personal Identification Number (4-6 digits) required for wallet transactions. |
| **Product Approval** | The vetting process a product must pass before being assigned to an auction. |
| **RTO** | Recovery Time Objective. The maximum acceptable time to restore service after an outage. |
| **RPO** | Recovery Point Objective. The maximum acceptable amount of data loss measured in time. |
| **Redis** | An in-memory data store used for real-time auction state, bid tracking, and job queues. |
| **Settlement** | The financial reconciliation of a closed auction, recording all revenue and payments. |
| **Socket.io / WebSocket** | A communication protocol enabling real-time, bidirectional updates between client and server. |
| **Terms & Conditions (T&C)** | The legal agreement defining the rules, rights, and responsibilities of platform participation. |
| **Ticket Number** | See Bid Ticket Number. |
| **TLS** | Transport Layer Security. A cryptographic protocol providing secure communication over a network. |
| **Token (Session)** | A cryptographic credential issued at login that authenticates subsequent requests. |
| **Unique Bid** | A bid amount placed by exactly one user in an auction. |
| **Wallet** | The internal, pre-funded account on the Guess X platform used for bid fees and winner payments. |
| **WCAG 2.1 AA** | Web Content Accessibility Guidelines, version 2.1, conformance level AA. An international standard for web accessibility. |
| **Winner Rotation** | The process of offering an auction to the next winner when the primary winner does not pay within three months (90 days). |
| **WebSocket** | See Socket.io / WebSocket. |

---

## 21. Support Contacts

### Customer Support
- **Email**: support@guessx.com
- **Phone**: +251-11-XXX-XXXX
- **Hours**: Monday–Friday, 8:00 AM – 5:00 PM EAT

### Dispute Resolution
- **Email**: disputes@guessx.com
- **In-App**: Profile → Support → File a Dispute
- **Response Time**: Acknowledgment within 24 hours (see [Section 8](#8-dispute-resolution) for full timeline)

### Emergency Payment Issues
- **Email**: payments@guessx.com
- **Response Time**: Within 2 hours during business hours

### Technical Issues
- **GitHub Issues**: [https://github.com/takelow/takelow/issues](https://github.com/takelow/takelow/issues)
- **Documentation**: [https://docs.guessx.com](https://docs.guessx.com)

### Accessibility Feedback
- **Email**: support@guessx.com
- **Subject**: "Accessibility Feedback"

### Social Media
- **Telegram**: [@Guess XOfficial](https://t.me/Guess XOfficial)
- **Twitter/X**: [@Guess XET](https://twitter.com/Guess XET)
- **Facebook**: [Guess X Ethiopia](https://facebook.com/Guess XET)

---

*End of User Guide v3.0*
