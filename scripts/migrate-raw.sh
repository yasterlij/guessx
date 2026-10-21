#!/usr/bin/env sh
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DB_URL="${DATABASE_URL:-postgresql://admin:secret@localhost:5433/guessx_db}"

echo "  → Running raw SQL migrations against $DB_URL"

# Tracking table so each migration file runs exactly once.
# Adopted: if the schema already has the `users` table but no tracking table,
# assume all current migrations were already applied and backfill the records.
psql "$DB_URL" -v ON_ERROR_STOP=1 -q <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT NOW()
);
SQL

USERS_EXISTS="$(psql "$DB_URL" -tAc "SELECT to_regclass('public.users') IS NOT NULL")"
TRACKING_EXISTS="$(psql "$DB_URL" -tAc "SELECT count(*) FROM schema_migrations")"

if [ "$USERS_EXISTS" = "t" ] && [ "$TRACKING_EXISTS" = "0" ]; then
  echo "  → Adopting initial schema (001-007) for existing database"
  for f in "$ROOT/database/migrations/00"[1-7]*.sql; do
    name="$(basename "$f")"
    psql "$DB_URL" -q -c "INSERT INTO schema_migrations (filename) VALUES ('$name') ON CONFLICT DO NOTHING"
  done
  echo "  ✓ Initial adoption complete, applying remaining migrations"
fi

for f in "$ROOT/database/migrations/"*.sql; do
  name="$(basename "$f")"
  APPLIED="$(psql "$DB_URL" -tAc "SELECT count(*) FROM schema_migrations WHERE filename = '$name'")"
  if [ "$APPLIED" != "0" ]; then
    echo "    $name (already applied, skipping)"
    continue
  fi
  echo "    $name"
  if ! psql "$DB_URL" -v ON_ERROR_STOP=1 -q -f "$f"; then
    echo "  ✗ Migration FAILED: $name" >&2
    exit 1
  fi
  psql "$DB_URL" -q -c "INSERT INTO schema_migrations (filename) VALUES ('$name')"
done

echo "  ✓ All migrations applied"
