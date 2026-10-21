#!/usr/bin/env bash
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DEEP=0
[ "${1:-}" = "--deep" ] && DEEP=1

echo "  → Cleaning build artifacts and caches"

rm -rf guessx-app/ios/build guessx-app/ios/build-device \
       guessx-app/android/app/build guessx-app/android/build guessx-app/android/.gradle \
       guessx-app/.expo guessx-app/dist \
       guessx-web/dist identity-service/dist auction-engine/dist query-service/dist \
       npm-cache-new */npm-cache-new \
       root@*

if [ "$DEEP" = 1 ]; then
  echo "  → Deep clean: removing node_modules (restore with: npm run setup)"
  rm -rf node_modules */node_modules
fi

echo "  ✓ Clean complete"
du -sh . 2>/dev/null
