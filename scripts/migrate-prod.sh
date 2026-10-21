#!/usr/bin/env bash
# Run DB migrations against the production EKS cluster via a one-off Job,
# mirroring `docker compose -f docker-compose.prod.yml run --rm migrate`.
# Usage: scripts/migrate-prod.sh [-f] [timeout_s]
#   -f  stream the Job logs live (like `docker compose logs -f migrate`)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TIMEOUT=300
FOLLOW=false
while [ $# -gt 0 ]; do
  case "$1" in
    -f) FOLLOW=true ;;
    [0-9]*) TIMEOUT="$1" ;;
    *) echo "  ⚠ Unknown arg: $1" >&2 ;;
  esac
  shift
done

kubectl config current-context >/dev/null 2>&1 || { echo "  ✗ kubectl is not configured for a cluster" >&2; exit 1; }

echo "  → Rebuilding migrations ConfigMap"
kubectl delete job takelow-migrate --ignore-not-found
kubectl create configmap takelow-migrations \
  --from-file="$ROOT/scripts/migrate-raw.sh" \
  --from-file="$ROOT/database/migrations" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "  → Starting migrate job"
kubectl apply -f "$ROOT/k8s/migrate-job.yaml"

if [ "$FOLLOW" = true ]; then
  echo "  → Streaming migration logs (Ctrl-C to detach, job keeps running)"
  kubectl logs -f job/takelow-migrate --pod-running-timeout=60s || true
else
  echo "  → Waiting up to ${TIMEOUT}s for migration to complete"
fi

kubectl wait --for=condition=complete job/takelow-migrate --timeout="${TIMEOUT}s"
echo "  ✓ Migrations applied"
if [ "$FOLLOW" != true ]; then
  kubectl logs job/takelow-migrate
fi
