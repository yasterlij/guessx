#!/usr/bin/env node

/**
 * GuessX / TakeLow - SQL Migration Consolidator & Generator
 *
 * Combines all raw migration files in `database/migrations/` into a single,
 * self-contained, idempotent SQL initialization script.
 *
 * Outputs:
 *  - database/postgres_init.sql
 *  - database/schema.sql
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MIGRATIONS_DIR = path.join(ROOT, 'database', 'migrations');
const POSTGRES_INIT_FILE = path.join(ROOT, 'database', 'postgres_init.sql');
const SCHEMA_FILE = path.join(ROOT, 'database', 'schema.sql');

function generateSql() {
  console.log('⚡ Generating consolidated SQL initialization script...\n');

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`✗ Migrations directory not found at: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.error(`✗ No .sql migration files found in ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  console.log(`Found ${files.length} migration files in database/migrations/`);

  const header = `-- ==============================================================================
-- GuessX / TakeLow Complete PostgreSQL Database Initialization Script
-- DBMS: PostgreSQL 14+
-- Consolidated from migrations: 000 through ${files[files.length - 1].slice(0, 3)}
-- Compatible with: psql, pgAdmin, DBeaver, Supabase, Neon, AWS RDS, Docker Postgres
-- Generated: ${new Date().toISOString()}
-- ==============================================================================

-- 1. Create Migration Tracking Table
CREATE TABLE IF NOT EXISTS schema_migrations (
    filename VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Required PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Safe Citus extension loading (smoothly skipped if not running a distributed Citus cluster)
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS citus;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Citus extension is not installed; running in standard PostgreSQL mode.';
END $$;
`;

  let content = header;

  for (const file of files) {
    const filePath = path.join(MIGRATIONS_DIR, file);
    const fileSql = fs.readFileSync(filePath, 'utf-8').trim();

    content += `\n\n-- ==============================================================================`;
    content += `\n-- Migration: ${file}`;
    content += `\n-- ==============================================================================\n\n`;
    content += fileSql;

    if (!fileSql.includes('INSERT INTO schema_migrations')) {
      content += `\n\nINSERT INTO schema_migrations (filename) VALUES ('${file}') ON CONFLICT (filename) DO NOTHING;\n`;
    } else {
      content += `\n`;
    }
  }

  fs.writeFileSync(POSTGRES_INIT_FILE, content, 'utf-8');
  fs.writeFileSync(SCHEMA_FILE, content, 'utf-8');

  const sizeKb = (Buffer.byteLength(content, 'utf-8') / 1024).toFixed(1);
  console.log(`✓ Consolidated ${files.length} migrations (${sizeKb} KB)`);
  console.log(`✓ Output saved to:`);
  console.log(`   - ${path.relative(ROOT, POSTGRES_INIT_FILE)}`);
  console.log(`   - ${path.relative(ROOT, SCHEMA_FILE)}\n`);
}

generateSql();
