-- ==============================================================================
-- GuessX / TakeLow MySQL & MariaDB Database Initialization Script
-- DBMS: MariaDB 10.3+ / MySQL 8.0+
-- Converted from PostgreSQL schema (database/migrations/ 000-041)
-- ==============================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

-- 1. Create Migration Tracking Table
CREATE TABLE IF NOT EXISTS `schema_migrations` (
    `filename` VARCHAR(255) NOT NULL,
    `applied_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`filename`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Users Table
CREATE TABLE IF NOT EXISTS `users` (
    `id` VARCHAR(36) NOT NULL,
    `phone_number` VARCHAR(20) UNIQUE,
    `email` VARCHAR(255),
    `password_hash` VARCHAR(255),
    `wallet_balance` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `full_name` VARCHAR(255),
    `avatar_url` VARCHAR(255),
    `hashed_refresh_token` VARCHAR(255),
    `auth_provider` VARCHAR(20) NOT NULL DEFAULT 'LOCAL',
    `provider_id` VARCHAR(255),
    `phone_verified` TINYINT(1) NOT NULL DEFAULT 0,
    `role` VARCHAR(50) NOT NULL DEFAULT 'bidder',
    `tc_accepted` TINYINT(1) NOT NULL DEFAULT 0,
    `tc_accepted_at` DATETIME NULL,
    `tc_version` VARCHAR(20) NULL,
    `wallet_pin` VARCHAR(255) NULL,
    `pin_attempts_remaining` INT DEFAULT 5,
    `pin_locked_until` DATETIME NULL,
    `push_token` VARCHAR(255) NULL,
    `division_id` VARCHAR(36) NULL,
    `department_id` VARCHAR(36) NULL,
    `section_id` VARCHAR(36) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_users_phone_number` (`phone_number`),
    INDEX `idx_users_email` (`email`),
    INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Products Table
CREATE TABLE IF NOT EXISTS `products` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT,
    `current_market_price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `image_urls` JSON,
    `category` VARCHAR(100),
    `specifications` JSON,
    `approval_status` VARCHAR(50) DEFAULT 'PENDING',
    `approved_by` VARCHAR(36) NULL,
    `approved_at` DATETIME NULL,
    `rejection_reason` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_products_category` (`category`),
    INDEX `idx_products_approval_status` (`approval_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Auctions Table
CREATE TABLE IF NOT EXISTS `auctions` (
    `id` VARCHAR(36) NOT NULL,
    `product_id` VARCHAR(36) NOT NULL,
    `public_code` INT NULL,
    `start_time` DATETIME NOT NULL,
    `end_time` DATETIME NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    `bid_fee` DECIMAL(12, 2) NOT NULL DEFAULT 1.00,
    `min_bids` INT DEFAULT 0,
    `max_bids` INT NULL,
    `extensions` INT DEFAULT 0,
    `winner_user_id` VARCHAR(36) NULL,
    `winning_bid_amount` DECIMAL(12, 2) NULL,
    `payment_status` VARCHAR(50) DEFAULT 'UNPAID',
    `payment_deadline` DATETIME NULL,
    `payment_deadline_hours` INT DEFAULT 720,
    `escalation_rule` VARCHAR(50) DEFAULT 'LOWEST_UNIQUE_BID',
    `second_winner_assigned` TINYINT(1) DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_auctions_product_id` (`product_id`),
    INDEX `idx_auctions_status` (`status`),
    INDEX `idx_auctions_end_time` (`end_time`),
    INDEX `idx_auctions_public_code` (`public_code`),
    INDEX `idx_auctions_winner_user_id` (`winner_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Bids Table
CREATE TABLE IF NOT EXISTS `bids` (
    `id` VARCHAR(36) NOT NULL,
    `auction_id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `encrypted_amount` TEXT NULL,
    `ticket_number` VARCHAR(100) NULL,
    `service_fee_paid` TINYINT(1) NOT NULL DEFAULT 0,
    `bid_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_bids_auction_id` (`auction_id`),
    INDEX `idx_bids_user_id` (`user_id`),
    INDEX `idx_bids_auction_user` (`auction_id`, `user_id`),
    INDEX `idx_bids_amount` (`amount`),
    INDEX `idx_bids_ticket_number` (`ticket_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Transactions Table
CREATE TABLE IF NOT EXISTS `transactions` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `reference_id` VARCHAR(255) NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_transactions_user_id` (`user_id`),
    INDEX `idx_transactions_reference_id` (`reference_id`),
    INDEX `idx_transactions_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Payment Transactions Table
CREATE TABLE IF NOT EXISTS `payment_transactions` (
    `id` VARCHAR(36) NOT NULL,
    `auction_id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `gateway` VARCHAR(50) NOT NULL DEFAULT 'AWASH',
    `status` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    `reference_id` VARCHAR(255) NULL,
    `transaction_id` VARCHAR(255) NULL,
    `payment_url` TEXT NULL,
    `encrypted_amount` TEXT NULL,
    `expires_at` DATETIME NULL,
    `last_payment_update` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_payment_tx_auction_user` (`auction_id`, `user_id`),
    INDEX `idx_payment_tx_reference_id` (`reference_id`),
    INDEX `idx_payment_tx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Winners Table
CREATE TABLE IF NOT EXISTS `winners` (
    `id` VARCHAR(36) NOT NULL,
    `auction_id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `rank` INT NOT NULL DEFAULT 1,
    `winning_amount` DECIMAL(12, 2) NOT NULL,
    `payment_status` VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    `payment_deadline` DATETIME NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_winners_auction_id` (`auction_id`),
    INDEX `idx_winners_user_id` (`user_id`),
    INDEX `idx_winners_status` (`payment_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Favorites Table
CREATE TABLE IF NOT EXISTS `favorites` (
    `user_id` VARCHAR(36) NOT NULL,
    `auction_id` VARCHAR(36) NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`user_id`, `auction_id`),
    INDEX `idx_favorites_user_id` (`user_id`),
    INDEX `idx_favorites_auction_id` (`auction_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. OTPs Table
CREATE TABLE IF NOT EXISTS `otps` (
    `id` VARCHAR(36) NOT NULL,
    `phone_number` VARCHAR(20) NOT NULL,
    `code_hash` VARCHAR(255) NOT NULL,
    `attempts` INT NOT NULL DEFAULT 0,
    `expires_at` DATETIME NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_otps_phone_number` (`phone_number`),
    INDEX `idx_otps_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Audit Logs Table
CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id` VARCHAR(36) NOT NULL,
    `actor_id` VARCHAR(36) NULL,
    `actor_phone` VARCHAR(50) NULL,
    `action` VARCHAR(100) NOT NULL,
    `entity_type` VARCHAR(100) NOT NULL,
    `entity_id` VARCHAR(100) NOT NULL,
    `details` JSON NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_audit_logs_actor` (`actor_id`),
    INDEX `idx_audit_logs_action` (`action`),
    INDEX `idx_audit_logs_entity` (`entity_type`, `entity_id`),
    INDEX `idx_audit_logs_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. User Permissions Table
CREATE TABLE IF NOT EXISTS `user_permissions` (
    `id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `permission` VARCHAR(100) NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_user_permissions_user` (`user_id`),
    INDEX `idx_user_permissions_perm` (`permission`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Disputes Table
CREATE TABLE IF NOT EXISTS `disputes` (
    `id` VARCHAR(36) NOT NULL,
    `auction_id` VARCHAR(36) NOT NULL,
    `user_id` VARCHAR(36) NOT NULL,
    `reason` TEXT NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    `document_urls` TEXT NULL,
    `resolution` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_disputes_auction` (`auction_id`),
    INDEX `idx_disputes_user` (`user_id`),
    INDEX `idx_disputes_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Divisions, Departments, Sections (Org Hierarchy)
CREATE TABLE IF NOT EXISTS `divisions` (
    `id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `head_user_id` VARCHAR(36) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `departments` (
    `id` VARCHAR(36) NOT NULL,
    `division_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `head_user_id` VARCHAR(36) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_departments_div` (`division_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sections` (
    `id` VARCHAR(36) NOT NULL,
    `department_id` VARCHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `head_user_id` VARCHAR(36) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_sections_dept` (`department_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Record all migrations as applied
INSERT IGNORE INTO `schema_migrations` (`filename`) VALUES
('000-create-extension-citus.sql'),
('001-create-users.sql'),
('002-create-products.sql'),
('003-create-auctions.sql'),
('004-create-bids.sql'),
('005-create-transactions.sql'),
('006-create-favorites.sql'),
('007-partition-bids.sql'),
('008-citus-distribution.sql'),
('009-create-otps.sql'),
('010-fix-bids-index.sql'),
('011-create-auctions-partial-index.sql'),
('012-add-remaining-indexes.sql'),
('013-add-push-tokens.sql'),
('014-add-favorites-created-at.sql'),
('015-add-user-role.sql'),
('016-add-decimal-to-bids-auctions.sql'),
('017-add-wallet-pin.sql'),
('018-add-pin-attempts.sql'),
('020-create-payment-transactions.sql'),
('021-create-winners-table.sql'),
('022-add-last-payment-update.sql'),
('023-add-ticket-to-bids.sql'),
('024-create-audit-logs.sql'),
('025-add-encrypted-amount-to-bids.sql'),
('026-add-encrypted-amount-to-payment-transactions.sql'),
('027-add-auction-extensions.sql'),
('028-add-unique-constraint-to-bids.sql'),
('029-cleanup-phantom-bids.sql'),
('030-create-user-permissions.sql'),
('031-add-public-auction-codes-and-product-specs.sql'),
('032-add-bid-fee-to-auctions.sql'),
('033-add-product-category.sql'),
('034-citus-distribution-production.sql'),
('035-add-tc-acceptance.sql'),
('036-add-product-approval.sql'),
('037-add-tc-version.sql'),
('038-create-disputes.sql'),
('039-rbac-role-hierarchy.sql'),
('040-add-second-winner-assigned.sql'),
('041-admin-auction-lifecycle-and-disputes.sql');

SET FOREIGN_KEY_CHECKS = 1;
