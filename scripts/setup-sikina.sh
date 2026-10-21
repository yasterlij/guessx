#!/usr/bin/env bash
set -euo pipefail

# SikinaPay Dev Setup
# ====================
# This script generates a webhook secret and guides you through
# configuring the SikinaPay sandbox dashboard.
#
# Prerequisites:
#   - SikinaPay sandbox account at https://sandbox.sikinapay.com
#   - ngrok installed (brew install ngrok)
#   - Docker Compose running

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$BASE_DIR/auction-engine/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found"
  exit 1
fi

# 1. Generate a random webhook secret
WEBHOOK_SECRET=$(openssl rand -hex 32)
if grep -q "^SIKINA_WEBHOOK_SECRET=" "$ENV_FILE" && grep -v "^SIKINA_WEBHOOK_SECRET=$" "$ENV_FILE" | grep -q "^SIKINA_WEBHOOK_SECRET="; then
  echo "Webhook secret already set, skipping..."
else
  if grep -q "^SIKINA_WEBHOOK_SECRET=" "$ENV_FILE"; then
    sed -i '' "s/^SIKINA_WEBHOOK_SECRET=.*/SIKINA_WEBHOOK_SECRET=$WEBHOOK_SECRET/" "$ENV_FILE"
  else
    echo "SIKINA_WEBHOOK_SECRET=$WEBHOOK_SECRET" >> "$ENV_FILE"
  fi
  echo "Generated SIKINA_WEBHOOK_SECRET: $WEBHOOK_SECRET"
fi

# 2. Check for existing secret key
if grep -q "^SIKINA_SECRET_KEY=" "$ENV_FILE" && [ -n "$(grep "^SIKINA_SECRET_KEY=" "$ENV_FILE" | cut -d= -f2)" ]; then
  echo "SIKINA_SECRET_KEY already set, skipping..."
  echo "  Current: $(grep "^SIKINA_SECRET_KEY=" "$ENV_FILE" | cut -d= -f2)"
else
  echo ""
  echo "!! SIKINA_SECRET_KEY is not set !!"
  echo "  Get it from https://sandbox.sikinapay.com -> Developers -> API Keys"
  echo "  Then run: export SIKINA_SECRET_KEY=sk_test_..."
fi

# 3. Print instructions
echo ""
echo "========================================="
echo "  SikinaPay + ngrok Setup Instructions"
echo "========================================="
echo ""
echo "1. Start ngrok tunnel to auction-engine:"
echo "   ngrok http 3002"
echo ""
echo "2. Copy the ngrok HTTPS URL (e.g. https://abc123.ngrok.io)"
echo "   and update these lines in $ENV_FILE:"
echo "     SIKINA_WEBHOOK_URL=https://abc123.ngrok.io/api/v1/payments/webhook/sikina"
echo "     SIKINA_SUCCESS_REDIRECT_URL=https://abc123.ngrok.io/?payment=success"
echo "     SIKINA_FAILED_REDIRECT_URL=https://abc123.ngrok.io/?payment=failed"
echo ""
echo "3. Configure SikinaPay webhook:"
echo "   - Go to https://sandbox.sikinapay.com -> Developers -> Webhooks"
echo "   - Add endpoint: https://abc123.ngrok.io/api/v1/payments/webhook/sikina"
echo "   - Set secret to: $WEBHOOK_SECRET"
echo "   - Subscribe to events: payment.completed, payment.failed, payment.expired"
echo ""
echo "4. Configure SikinaPay redirect URLs:"
echo "   - Go to Settings -> Payment Links"
echo "   - Set Success URL: https://abc123.ngrok.io/?payment=success"
echo "   - Set Failed URL: https://abc123.ngrok.io/?payment=failed"
echo ""
echo "========================================="
