#!/usr/bin/env bash
# Wait for backend service to be healthy, then start the proxy.
set -e

TIMEOUT=${1:-45}
INTERVAL=2
elapsed=0

echo "  → Waiting for backend service (up to ${TIMEOUT}s)..."

while [ $elapsed -lt $TIMEOUT ]; do
  if curl -sf "http://localhost:3000/api/v1/health" > /dev/null 2>&1 || curl -sf "http://localhost:3001/api/v1/health" > /dev/null 2>&1; then
    echo "  ✓ Backend healthy"
    node "$(dirname "$0")/dev-proxy.js"
    exit 0
  fi

  sleep $INTERVAL
  elapsed=$((elapsed + INTERVAL))
done

echo "  ⚠ Timed out waiting for services"
exit 1
