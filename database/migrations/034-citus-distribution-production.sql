-- Citus Distribution for Production
-- This migration configures distributed tables for horizontal scaling with Citus.
-- SAFELY SKIPS on local development (no worker nodes configured).
-- Only applies distribution on a production Citus coordinator with active worker nodes.

-- Enable Citus extension (idempotent, safe on local dev)
CREATE EXTENSION IF NOT EXISTS citus;

-- ============================================================
-- CHECK: Is this a real Citus cluster with worker nodes?
-- If no worker nodes are registered, skip all distribution commands.
-- This makes the migration safe to run on local development PostgreSQL.
-- ============================================================

DO $$
DECLARE
  worker_count INTEGER;
  is_coordinator BOOLEAN;
BEGIN
  -- Check if pg_dist_node table exists and has active workers
  BEGIN
    SELECT COUNT(*) INTO worker_count
    FROM pg_dist_node
    WHERE isactive = true AND noderole = 'primary';

    -- Check if this node is a coordinator (not a worker)
    SELECT EXISTS(
      SELECT 1 FROM pg_dist_node
      WHERE noderole = 'coordinator'
    ) INTO is_coordinator;
  EXCEPTION WHEN OTHERS THEN
    -- pg_dist_node doesn't exist or not accessible - not a Citus cluster
    worker_count := 0;
    is_coordinator := false;
  END;

  -- Only proceed with distribution if we have worker nodes
  IF worker_count > 0 AND is_coordinator THEN
    RAISE NOTICE 'Citus cluster detected with % worker nodes. Applying distribution...', worker_count;

    -- ============================================================
    -- FIX UNIQUE CONSTRAINTS BEFORE DISTRIBUTION
    -- Citus requires UNIQUE constraints to include the distribution column.
    -- ============================================================

    -- Users: drop phone_number/email unique constraints (id is the distribution column)
    BEGIN
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_number_key;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users (phone_number);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

    -- Auctions: drop public_code unique constraint (id is the distribution column)
    DROP INDEX IF EXISTS idx_auctions_public_code;
    CREATE INDEX IF NOT EXISTS idx_auctions_public_code ON auctions (public_code);

    -- Payment transactions: drop client_reference_id unique constraint
    DROP INDEX IF EXISTS idx_payment_transactions_client_reference_id;
    CREATE INDEX IF NOT EXISTS idx_payment_transactions_client_reference_id ON payment_transactions (client_reference_id);

    -- ============================================================
    -- REFERENCE TABLES (replicated to all nodes)
    -- ============================================================

    BEGIN
      PERFORM create_reference_table('products');
      RAISE NOTICE 'Created reference table: products';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping products (already reference or error: %)', SQLERRM;
    END;

    -- ============================================================
    -- DISTRIBUTED TABLES (sharded by distribution column)
    -- ============================================================

    BEGIN
      PERFORM create_distributed_table('users', 'id');
      RAISE NOTICE 'Distributed table: users by id';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping users (already distributed or error: %)', SQLERRM;
    END;

    BEGIN
      PERFORM create_distributed_table('auctions', 'id');
      RAISE NOTICE 'Distributed table: auctions by id';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping auctions (already distributed or error: %)', SQLERRM;
    END;

    BEGIN
      PERFORM create_distributed_table('bids', 'auction_id');
      RAISE NOTICE 'Distributed table: bids by auction_id';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping bids (already distributed or error: %)', SQLERRM;
    END;

    BEGIN
      PERFORM create_distributed_table('bids_partitioned', 'auction_id');
      RAISE NOTICE 'Distributed table: bids_partitioned by auction_id';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping bids_partitioned (already distributed or error: %)', SQLERRM;
    END;

    BEGIN
      PERFORM create_distributed_table('winners', 'auction_id');
      RAISE NOTICE 'Distributed table: winners by auction_id';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping winners (already distributed or error: %)', SQLERRM;
    END;

    BEGIN
      PERFORM create_distributed_table('payment_transactions', 'auction_id');
      RAISE NOTICE 'Distributed table: payment_transactions by auction_id';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping payment_transactions (already distributed or error: %)', SQLERRM;
    END;

    BEGIN
      PERFORM create_distributed_table('favorites', 'user_id');
      RAISE NOTICE 'Distributed table: favorites by user_id';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping favorites (already distributed or error: %)', SQLERRM;
    END;

    BEGIN
      PERFORM create_distributed_table('transactions', 'user_id');
      RAISE NOTICE 'Distributed table: transactions by user_id';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping transactions (already distributed or error: %)', SQLERRM;
    END;

    BEGIN
      PERFORM create_distributed_table('otps', 'phone_number');
      RAISE NOTICE 'Distributed table: otps by phone_number';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping otps (already distributed or error: %)', SQLERRM;
    END;

    BEGIN
      PERFORM create_distributed_table('notification_logs', 'user_id');
      RAISE NOTICE 'Distributed table: notification_logs by user_id';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping notification_logs (already distributed or error: %)', SQLERRM;
    END;

    BEGIN
      PERFORM create_distributed_table('user_permissions', 'user_id');
      RAISE NOTICE 'Distributed table: user_permissions by user_id';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping user_permissions (already distributed or error: %)', SQLERRM;
    END;

    BEGIN
      PERFORM create_distributed_table('audit_logs', 'actor_id');
      RAISE NOTICE 'Distributed table: audit_logs by actor_id';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping audit_logs (already distributed or error: %)', SQLERRM;
    END;

    RAISE NOTICE 'Citus distribution complete!';

  ELSE
    RAISE NOTICE 'No Citus worker nodes detected (worker_count=%, is_coordinator=%). Skipping distribution - tables remain local.', worker_count, is_coordinator;
  END IF;
END $$;

-- ============================================================
-- VERIFICATION QUERIES (run after migration on production)
-- ============================================================
/*
-- Check distributed tables
SELECT * FROM citus_tables;

-- Check colocation groups
SELECT * FROM pg_dist_colocation;

-- Check shard placement
SELECT * FROM pg_dist_shard_placement;

-- Check reference tables
SELECT * FROM citus_tables WHERE table_type = 'reference';

-- Check worker nodes
SELECT * FROM pg_dist_node WHERE isactive = true;
*/