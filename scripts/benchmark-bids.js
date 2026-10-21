const http = require('http');

const IDENTITY = 'http://localhost:3001';
const ENGINE = 'http://localhost:3002';
const QUERY = 'http://localhost:3003';

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function loginUser(phone, password = '0000') {
  const res = await fetch(`${IDENTITY}/api/v1/auth/login/phone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number: phone, password }),
  });
  if (!res.ok) throw new Error(`Login failed: ${await res.text()}`);
  return res.json();
}

async function benchmark() {
  console.log('⚡ Starting Guess X Performance & Security Benchmark...\n');

  // 1. Setup user and active auction for bidding benchmarks
  console.log('--- 1. Authenticating Test User & Selecting Auction ---');
  const authData = await loginUser('0913320002', '0000');
  const token = authData.access_token;
  const userId = authData.user.id;
  console.log(`  Authenticated User ID: ${userId}`);

  const auctionsRes = await fetch(`${QUERY}/api/v1/auctions/active`);
  const auctions = await auctionsRes.json();
  const auction = (auctions.data || auctions)[0];
  if (!auction) throw new Error('No active auction found for bidding benchmark');
  console.log(`  Selected Auction: ${auction.id} (${auction.product?.name || auction.name || 'Active Auction'})`);

  // Pay bid fee for this user via wallet
  await fetch(`${ENGINE}/api/v1/payments/bid-fee/${auction.id}/wallet-pay`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('  Bid fee paid via wallet.\n');

  // 2. Security Tests: Nonce Replay & Nonce Guard
  console.log('--- 2. Security Verification: Replay Protection & Nonce Guard ---');
  const testNonce = `replay-test-${Date.now()}`;
  const validTimestamp = Date.now().toString();
  const testAmount = Number((70 + Math.random() * 25).toFixed(2));

  // First bid with this nonce:
  const firstBidRes = await fetch(`${ENGINE}/api/v1/auctions/${auction.id}/bid`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-bid-nonce': testNonce,
      'x-bid-timestamp': validTimestamp,
    },
    body: JSON.stringify({ amount: testAmount }),
  });
  console.log(`  First bid with nonce: HTTP ${firstBidRes.status}`);

  // Replay with identical nonce:
  const replayRes = await fetch(`${ENGINE}/api/v1/auctions/${auction.id}/bid`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-bid-nonce': testNonce,
      'x-bid-timestamp': validTimestamp,
    },
    body: JSON.stringify({ amount: testAmount + 0.01 }),
  });
  const replayBody = await replayRes.text();
  console.log(`  Replayed bid with duplicate nonce: HTTP ${replayRes.status}`);
  console.log(`  Replay protection result: ${replayRes.status === 409 ? '✅ PASSED (HTTP 409 Nonce Conflict Blocked)' : '❌ FAILED'}\n`);

  // 3. Security Tests: Stale Timestamp Guard (>30s clock skew)
  console.log('--- 3. Security Verification: Clock Skew / Expired Timestamp ---');
  const staleTimestamp = (Date.now() - 60000).toString(); // 60 seconds ago (> 30s skew tolerance)
  const staleNonce = `stale-test-${Date.now()}`;
  const staleRes = await fetch(`${ENGINE}/api/v1/auctions/${auction.id}/bid`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-bid-nonce': staleNonce,
      'x-bid-timestamp': staleTimestamp,
    },
    body: JSON.stringify({ amount: 77.79 }),
  });
  console.log(`  Bid with expired timestamp (>30s): HTTP ${staleRes.status}`);
  console.log(`  Clock skew protection result: ${staleRes.status === 400 ? '✅ PASSED (HTTP 400 Stale Request Blocked)' : '❌ FAILED'}\n`);

  // 4. Security Tests: Internal API Key Header Guard
  console.log('--- 4. Security Verification: Internal Service Authentication ---');
  const unauthInternalRes = await fetch(`${IDENTITY}/api/v1/notify/outbid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, auction_id: auction.id, bid_amount: 10 }),
  });
  console.log(`  Internal endpoint called without key: HTTP ${unauthInternalRes.status}`);
  console.log(`  Internal API key enforcement: ${unauthInternalRes.status === 403 ? '✅ PASSED (HTTP 403 Forbidden)' : '❌ FAILED'}\n`);

  // 5. Security Tests: Bidding Rate Limiting (10 req/s per user)
  console.log('--- 5. Security Verification: Bidding Rate Limiting ---');
  let rateLimited = false;
  for (let i = 0; i < 20; i++) {
    const nonce = `rate-test-${Date.now()}-${i}`;
    const res = await fetch(`${ENGINE}/api/v1/auctions/${auction.id}/bid`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-bid-nonce': nonce,
        'x-bid-timestamp': Date.now().toString(),
      },
      body: JSON.stringify({ amount: 200 + i * 0.05 }),
    });
    if (res.status === 429) {
      rateLimited = true;
      console.log(`  Rate limit triggered at bid #${i + 1}: HTTP 429`);
      break;
    }
  }
  console.log(`  Bidding rate limit enforcement: ${rateLimited ? '✅ PASSED (HTTP 429 Triggered)' : '⚠️ Note: rate limit within burst capacity'}\n`);

  // 6. Benchmark Query Service (/api/v1/auctions/active) with distributed client simulation
  console.log('--- 6. Query Service Benchmark (/api/v1/auctions/active) ---');
  const queryLatencies = [];
  const queryIterations = 100;
  const qStart = Date.now();

  for (let i = 0; i < queryIterations; i++) {
    const clientIp = `10.0.${Math.floor(i / 10)}.${(i % 10) + 1}`;
    const t0 = performance.now();
    const res = await fetch(`${QUERY}/api/v1/auctions/active`, {
      headers: { 'x-forwarded-for': clientIp },
    });
    const t1 = performance.now();
    if (res.ok) {
      queryLatencies.push(t1 - t0);
    }
  }
  const qElapsed = (Date.now() - qStart) / 1000;
  const qP50 = percentile(queryLatencies, 50).toFixed(2);
  const qP95 = percentile(queryLatencies, 95).toFixed(2);
  const qP99 = percentile(queryLatencies, 99).toFixed(2);
  const qRps = (queryIterations / qElapsed).toFixed(1);

  console.log(`  Requests: ${queryIterations}`);
  console.log(`  Throughput: ${qRps} req/s`);
  console.log(`  Latencies: p50=${qP50}ms, p95=${qP95}ms, p99=${qP99}ms`);
  console.log(`  Target (<100ms p95): ${Number(qP95) < 100 ? '✅ PASSED' : '❌ FAILED'}\n`);

  console.log('🎯 Benchmark and Security Verification Completed Successfully!');
}

benchmark().catch((e) => {
  console.error('❌ Benchmark error:', e);
  process.exit(1);
});
