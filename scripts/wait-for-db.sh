#!/usr/bin/env bash
set -e

echo "  → Waiting for PostgreSQL..."
for i in $(seq 1 20); do
  if docker compose exec postgres-primary pg_isready -U admin -d guessx_db 2>/dev/null; then
    echo "  ✓ PostgreSQL ready"
    exit 0
  fi
  sleep 2
done
echo "  ✗ PostgreSQL not ready after 40s, aborting" >&2
exit 1
