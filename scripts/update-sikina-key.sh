#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Guess X — Update SikinaPay API key in one command
# =============================================================================
#   bash scripts/update-sikina-key.sh test_sk_xxxx          # local dev .env only
#   bash scripts/update-sikina-key.sh test_sk_xxxx --gh      # + GitHub Actions secret (EKS deploy)
#   bash scripts/update-sikina-key.sh test_sk_xxxx --server root@1.2.3.4   # + prod VPS .env
#   bash scripts/update-sikina-key.sh                        # interactive (asks for the key)
# =============================================================================

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()  { echo -e "${GREEN}✓${NC} $1"; }
warn(){ echo -e "${YELLOW}⚠${NC} $1"; }
fail(){ echo -e "${RED}✗${NC} $1"; }

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$BASE_DIR/auction-engine/.env"
GH_REPO="yasterlij/takelow"
GH_SECRET="K8S_SIKINA_SECRET_KEY"

KEY=""; UPDATE_GH=0; SERVER_HOST=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --gh) UPDATE_GH=1; shift ;;
    --server) SERVER_HOST="${2:-}"; shift 2 ;;
    -h|--help)
      sed -n '2,8p' "$0"; exit 0 ;;
    *)
      if [ -z "$KEY" ]; then KEY="$1"; else fail "Unknown argument: $1"; exit 1; fi
      shift ;;
  esac
done

echo -e "\n${CYAN}🔑  Guess X — SikinaPay key updater${NC}\n"

# ── 1. Get the key ──────────────────────────────────────────────────────────
if [ -z "$KEY" ]; then
  echo -e "${YELLOW}No key provided.${NC}"
  echo -e "Get it from https://sandbox.sikinapay.com → Developers → API Keys"
  read -r -p "Paste SikinaPay API key: " KEY
fi
KEY="$(echo "$KEY" | tr -d '[:space:]')"
if [ -z "$KEY" ]; then fail "No key provided."; exit 1; fi

# ── 2. Detect environment from key prefix ───────────────────────────────────
case "$KEY" in
  sk_test_*|test_sk_*) BASE_URL="https://sandbox.sikinapay.com"; ENV_NAME="sandbox" ;;
  sk_live_*|live_sk_*) BASE_URL="https://api.sikinapay.com";    ENV_NAME="LIVE" ;;
  *) warn "Key format unrecognized (expected sk_test_/test_sk_ or sk_live_/live_sk_). Validating anyway..."; BASE_URL="https://sandbox.sikinapay.com"; ENV_NAME="sandbox" ;;
esac
echo -e "Environment detected: ${CYAN}${ENV_NAME}${NC}  ($BASE_URL)"

# ── 3. Validate against SikinaPay ───────────────────────────────────────────
echo -n "  Validating key against SikinaPay... "
BODY="{\"amount\":1,\"clientReferenceId\":\"key-check-$(date +%s)\",\"description\":\"key validation\",\"language\":\"en\"}"
RESP=$(curl -s -X POST "$BASE_URL/api/v1/gateway/generatePaymentLink" \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
  -d "$BODY" || true)
if echo "$RESP" | grep -q '"responseCode":"0"'; then
  ok "Key is valid — payment link generated."
elif echo "$RESP" | grep -qi 'invalid credentials\|unauthorized'; then
  fail "Key REJECTED by SikinaPay (401 Invalid credentials). Double-check it and try again."
  exit 1
elif echo "$RESP" | grep -qi 'cloudflare\|attention required'; then
  warn "Cloudflare blocked the test request, but the key might still be fine."
  warn "Continuing without live validation..."
else
  warn "Unexpected response — continuing. ($(echo "$RESP" | head -c 80))"
fi

# ── 4. Update local dev .env ────────────────────────────────────────────────
if [ ! -f "$ENV_FILE" ]; then fail "$ENV_FILE not found"; exit 1; fi
if grep -q '^SIKINA_SECRET_KEY=' "$ENV_FILE"; then
  sed -i '' "s|^SIKINA_SECRET_KEY=.*|SIKINA_SECRET_KEY=$KEY|" "$ENV_FILE"
else
  echo "SIKINA_SECRET_KEY=$KEY" >> "$ENV_FILE"
fi
if grep -q '^SIKINA_BASE_URL=' "$ENV_FILE"; then
  sed -i '' "s|^SIKINA_BASE_URL=.*|SIKINA_BASE_URL=$BASE_URL|" "$ENV_FILE"
fi
ok "Local dev updated: $ENV_FILE"

# ── 5. Update GitHub secret (used by CI for EKS deploy) ────────────────────
if [ "$UPDATE_GH" -eq 1 ]; then
  if ! command -v gh >/dev/null 2>&1; then
    warn "gh CLI not installed — skipping GitHub secret update."
  elif ! gh auth status >/dev/null 2>&1; then
    warn "Not logged into gh — skipping GitHub secret update."
  else
    echo "$KEY" | gh secret set "$GH_SECRET" --repo "$GH_REPO"
    ok "GitHub secret '$GH_SECRET' updated (CI will pick it up on next push to main)."
  fi
fi

# ── 6. Update prod VPS .env via SSH ─────────────────────────────────────────
if [ -n "$SERVER_HOST" ]; then
  echo "  Updating $SERVER_HOST ..."
  if ! ssh "$SERVER_HOST" "
    ENV=\$(find \$HOME -maxdepth 3 -name '.env' -path '*auction*' 2>/dev/null | head -1);
    [ -z \"\$ENV\" ] && ENV=\$(find \$HOME -maxdepth 3 -name '*.env' -path '*auction*' 2>/dev/null | head -1);
    if [ -z \"\$ENV\" ]; then echo 'NO_ENV_FOUND'; else
      if grep -q '^SIKINA_SECRET_KEY=' \"\$ENV\"; then sed -i \"s|^SIKINA_SECRET_KEY=.*|SIKINA_SECRET_KEY=$KEY|\" \"\$ENV\";
      else echo \"SIKINA_SECRET_KEY=$KEY\" >> \"\$ENV\"; fi;
      echo \"UPDATED:\$ENV\";
    fi" 2>/dev/null; then
    warn "SSH failed — update the key manually on the server, or pass the env file path."
  fi
fi

echo ""
ok "Done. The new key is now in:"
echo -e "  • local dev     → $ENV_FILE"
[ "$UPDATE_GH" -eq 1 ] && echo -e "  • GitHub CI/EKS  → secret '$GH_SECRET' (next push to main applies it)"
[ -n "$SERVER_HOST" ] && echo -e "  • prod server    → $SERVER_HOST"
echo ""
echo "Restart the auction-engine to load the new key:"
echo -e "  local:  ${CYAN}npm run dev${NC}   (or restart the auction-engine process)"
echo -e "  prod:   ${CYAN}docker compose -f docker-compose.prod.yml restart auction-engine${NC}"
