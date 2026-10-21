#!/usr/bin/env bash
# Wait for backend services to be healthy, then start the proxy.
set -e

TIMEOUT=${1:-45}
INTERVAL=2
elapsed=0

services=(
  "http://localhost:3001/api/v1/health:Identity"
  "http://localhost:3002/api/v1/health:Auction"
  "http://localhost:3003/api/v1/health:Query"
)

echo "  → Waiting for backend services (up to ${TIMEOUT}s)..."

while [ $elapsed -lt $TIMEOUT ]; do
  all_ok=true
  for entry in "${services[@]}"; do
    url="${entry%:*}"
    name="${entry##*:}"
    if ! curl -sf "$url" > /dev/null 2>&1; then
      all_ok=false
    fi
  done

  if $all_ok; then
    echo "  ✓ All services healthy"
    node "$(dirname "$0")/dev-proxy.js"
    exit 0
  fi

  sleep $INTERVAL
  elapsed=$((elapsed + INTERVAL))
done

echo "  ⚠ Timed out waiting for services"
exit 1
