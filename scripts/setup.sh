#!/usr/bin/env bash
set -euo pipefail

PROXY="http://localhost:3333/api/v1"
IDENTITY="http://localhost:3001/api/v1"
ENGINE="http://localhost:3002/api/v1"
QUERY="http://localhost:3003/api/v1"

echo "=== Guess X Setup ==="
echo ""

# 1. Login as admin
echo "> Logging in as admin..."
TOKEN=$(curl -s -X POST "$IDENTITY/auth/login/phone" \
  -H 'Content-Type: application/json' \
  -d '{"phone_number":"0911111111","password":"1234"}' | \
  python3 -c "import json,sys; print(json.load(sys.stdin)['access_token'])")

# 2. Add wallet balance
echo "> Adding wallet balance..."
curl -s -X POST "$IDENTITY/wallet/deposit" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"amount":100000}' | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'  Balance: {d[\"balance\"]} ETB')"

# Also add balance to test user
USER_TOKEN=$(curl -s -X POST "$IDENTITY/auth/login/phone" \
  -H 'Content-Type: application/json' \
  -d '{"phone_number":"0913320001","password":"0000"}' | \
  python3 -c "import json,sys; print(json.load(sys.stdin)['access_token'])")
curl -s -X POST "$IDENTITY/wallet/deposit" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"amount":10000}' > /dev/null

# 3. List existing products
echo ""
echo "> Existing products:"
curl -s "$ENGINE/admin/products" | python3 -c "
import json,sys
data=json.load(sys.stdin)
products=data.get('data',[])
print(f'  {len(products)} products')
for p in products:
    imgs=len(p.get('image_urls') or [])
    print(f'    {p[\"name\"]} ({imgs} images)')
"

# 4. Add sample products and auctions
PRODUCTS=(
  '{"name":"Samsung Galaxy Z Fold 6","current_market_price":2199,"brand":"Samsung","description":"7.6-inch foldable display, Snapdragon 8 Gen 3, 12GB RAM","image_urls":["https://picsum.photos/seed/fold6/400/400","https://picsum.photos/seed/fold6b/400/400"]}'
  '{"name":"Sony PlayStation VR2","current_market_price":599,"brand":"Sony","description":"4K HDR VR headset, eye tracking, 110° field of view","image_urls":["https://picsum.photos/seed/psvr2/400/400"]}'
  '{"name":"Bose Ultra Headphones","current_market_price":429,"brand":"Bose","description":"Immersive Audio with head tracking, CustomTune, 24hr battery","image_urls":["https://picsum.photos/seed/boseultra/400/400","https://picsum.photos/seed/boseultrab/400/400"]}'
  '{"name":"Apple iPad Pro M4","current_market_price":1299,"brand":"Apple","description":"11-inch Ultra Retina XDR, M4 chip, 256GB, Apple Pencil Pro support","image_urls":["https://picsum.photos/seed/ipadprom4/400/400","https://picsum.photos/seed/ipadprom4b/400/400"]}'
  '{"name":"DJI Mini 4 Pro","current_market_price":1099,"brand":"DJI","description":"4K/100fps, omnidirectional obstacle sensing, 34min flight time, under 249g","image_urls":["https://picsum.photos/seed/djimini4/400/400","https://picsum.photos/seed/djimini4b/400/400"]}'
)

echo ""
echo "> Creating sample products and auctions..."
for p in "${PRODUCTS[@]}"; do
  NAME=$(echo "$p" | python3 -c "import json,sys; print(json.load(sys.stdin)['name'])")
  echo -n "  Creating $NAME... "
  
  PRODUCT=$(curl -s -X POST "$ENGINE/admin/products" \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d "$p")
  
  PID=$(echo "$PRODUCT" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")
  echo -n "product created, "
  
  # Create auction ending in 3-10 days
  DAYS=$(( (RANDOM % 8) + 3 ))
  START=$(python3 -c "from datetime import datetime,timezone; print(datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'))")
  END=$(python3 -c "from datetime import datetime,timezone,timedelta; print((datetime.now(timezone.utc)+timedelta(days=$DAYS)).strftime('%Y-%m-%dT%H:%M:%SZ'))")
  
  curl -s -X POST "$ENGINE/admin/auctions" \
    -H "Authorization: Bearer $TOKEN" \
    -H 'Content-Type: application/json' \
    -d "{\"product_id\":\"$PID\",\"start_time\":\"$START\",\"end_time\":\"$END\"}" > /dev/null
  
  echo "auction ends in ${DAYS}d"
done

echo ""
echo "=== Done! ==="
echo "Admin:  0911111111 / 1234  (balance: 100,000 ETB)"
echo "Test:   0913320001 / 0000  (balance: 10,000 ETB)"
echo ""
echo "Run 'npm run app' to start the mobile app."
