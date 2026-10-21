#!/usr/bin/env node

/**
 * Advanced Penetration & Concurrency Stress Test Suite
 * Tests race conditions, distributed mutex locks, high volume bid flood,
 * per-user bid limit saturation, and boundary security controls against live services.
 */

const IDENTITY = 'http://localhost:3001';
const ENGINE = 'http://localhost:3002';
const QUERY = 'http://localhost:3003';
const INTERNAL_KEY = '3f7a91e2b4c8d5f6a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function logResult(passed, title, detail = '') {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`   ✅ PASS: ${title}${detail ? ` (${detail})` : ''}`);
  } else {
    failedTests++;
    console.error(`   ❌ FAIL: ${title}${detail ? ` (${detail})` : ''}`);
  }
}

async function req(url, options = {}) {
  const start = performance.now();
  const res = await fetch(url, options);
  const duration = performance.now() - start;
  let data;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data, duration };
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runStress() {
  console.log('======================================================================');
  console.log('       GuessX Advanced Penetration, Race & Stress Testing Suite       ');
  console.log('======================================================================\n');

  // 1. Authenticate Test Users
  console.log('--- 1. Authenticating Test Users ---');
  const user1Res = await req(`${IDENTITY}/api/v1/auth/login/phone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number: '0913320018', password: '0000' }),
  });
  logResult(user1Res.ok && user1Res.data.access_token, 'Login User 1 (0913320018)');
  const token1 = user1Res.data.access_token;
  const user1Id = user1Res.data.user.id;

  const user2Res = await req(`${IDENTITY}/api/v1/auth/login/phone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number: '0913320002', password: '0000' }),
  });
  logResult(user2Res.ok && user2Res.data.access_token, 'Login User 2 (0913320002)');
  const token2 = user2Res.data.access_token;
  const user2Id = user2Res.data.user.id;

  const adminRes = await req(`${IDENTITY}/api/v1/auth/login/phone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number: '0911111111', password: '1234' }),
  });
  logResult(adminRes.ok && adminRes.data.user.role === 'admin', 'Login Admin (0911111111)');
  const adminToken = adminRes.data.access_token;

  // 2. Query Active Auctions
  console.log('\n--- 2. Selecting Target Active Auction ---');
  const auctionsRes = await req(`${QUERY}/api/v1/auctions/active`);
  const auctions = Array.isArray(auctionsRes.data)
    ? auctionsRes.data
    : auctionsRes.data.data || [];
  logResult(auctions.length > 0, `Active auctions retrieved: ${auctions.length} available`);
  const auction = auctions[0];
  console.log(`   ℹ Target Auction ID: ${auction.id}`);

  // 3. Scenario: Double-Spend & Concurrency Mutex Race (BL-06 & BL-09)
  console.log('\n--- 3. PEN-TEST: Wallet Payment Concurrency & Race Condition (BL-06, BL-09) ---');
  // First, verify PIN for User 2 to generate a verified session
  const verifyPinRes = await req(`${IDENTITY}/api/v1/wallet/verify-pin`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token2}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pin: '0000' }),
  });
  logResult(verifyPinRes.data.valid === true, 'PIN verified for User 2 (created 300s Redis session)');

  const initialBalRes = await req(`${IDENTITY}/api/v1/wallet/balance`, {
    headers: { Authorization: `Bearer ${token2}` },
  });
  const initialBalance = parseFloat(initialBalRes.data.balance);
  console.log(`   ℹ Starting balance for User 2: ${initialBalance} ETB`);

  // Fire 10 parallel wallet-pay requests simultaneously for the exact same auction
  console.log('   🚀 Firing 10 simultaneous parallel wallet payments via Promise.all...');
  const parallelPayPromises = Array.from({ length: 10 }).map(() =>
    req(`${ENGINE}/api/v1/payments/bid-fee/${auction.id}/wallet-pay`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token2}` },
    })
  );

  const parallelPayResults = await Promise.all(parallelPayPromises);
  const successPays = parallelPayResults.filter((r) => [200, 201].includes(r.status));
  const blockedPays = parallelPayResults.filter((r) => [403, 409, 429].includes(r.status));

  console.log(`   ℹ Results: ${successPays.length} succeeded, ${blockedPays.length} blocked with 403/409/429`);
  logResult(
    successPays.length <= 1,
    'Race condition double-spend prevented: at most 1 payment succeeded',
    `${successPays.length} succeeded / ${parallelPayResults.length} parallel requests`
  );
  logResult(
    blockedPays.length >= 9,
    'Distributed Redis Mutex & single-use session rejected concurrent duplicate attempts',
    `${blockedPays.length} blocked`
  );

  // Verify wallet balance was only debited once (or not if already paid)
  const afterBalRes = await req(`${IDENTITY}/api/v1/wallet/balance`, {
    headers: { Authorization: `Bearer ${token2}` },
  });
  const afterBalance = parseFloat(afterBalRes.data.balance);
  const deducted = initialBalance - afterBalance;
  logResult(
    deducted === 0 || Math.abs(deducted - (auction.bid_fee || 10)) < 0.01,
    'Wallet balance consistency check: no duplicate deductions occurred',
    `Deducted: ${deducted.toFixed(2)} ETB`
  );

  // 4. Scenario: High-Volume Atomic Bid Flood Simulation (BL-03)
  console.log('\n--- 4. STRESS TEST: High-Volume Concurrent Bid Flood (Lua Atomicity BL-03) ---');
  // Ensure User 1 has paid bid fee
  await req(`${IDENTITY}/api/v1/wallet/verify-pin`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token1}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: '0000' }),
  });
  await req(`${ENGINE}/api/v1/payments/bid-fee/${auction.id}/wallet-pay`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token1}` },
  });

  const bidCount = 20;
  console.log(`   🚀 Firing ${bidCount} unique bids concurrently via Promise.all...`);
  const baseBid = 100 + Math.random() * 500;
  const bidLatencies = [];

  const floodPromises = Array.from({ length: bidCount }).map((_, i) => {
    const amount = parseFloat((baseBid + (i + 1) * 0.13).toFixed(2));
    const nonce = `flood-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`;
    const timestamp = Date.now().toString();

    return req(`${ENGINE}/api/v1/auctions/${auction.id}/bid`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token1}`,
        'x-bid-nonce': nonce,
        'x-bid-timestamp': timestamp,
      },
      body: JSON.stringify({ amount }),
    }).then((res) => {
      bidLatencies.push(res.duration);
      return { index: i, amount, status: res.status, data: res.data };
    });
  });

  const floodResults = await Promise.all(floodPromises);
  const acceptedBids = floodResults.filter((r) => r.status === 202);
  const serverErrors = floodResults.filter((r) => r.status >= 500);

  const p50 = percentile(bidLatencies, 50).toFixed(2);
  const p95 = percentile(bidLatencies, 95).toFixed(2);
  const p99 = percentile(bidLatencies, 99).toFixed(2);

  console.log(`   ℹ Accepted: ${acceptedBids.length}, Latency: p50 = ${p50}ms, p95 = ${p95}ms, p99 = ${p99}ms`);

  logResult(
    acceptedBids.length > 0,
    `Atomic Lua bid script processed concurrent load without server errors`,
    `${acceptedBids.length}/${bidCount} accepted, p95: ${p95}ms`
  );
  logResult(serverErrors.length === 0, 'Zero 5xx server errors during concurrent bid flood');

  // Cooldown so rate-limit token bucket replenishes
  console.log('   ⏳ Waiting 1.5s for rate-limiter bucket replenishment...');
  await sleep(1500);

  // 5. Scenario: Nonce Replay & Clock Skew Pen-Test
  console.log('\n--- 5. PEN-TEST: Replay Attack & Timestamp Clock Skew ---');
  // Use User 2 who has paid bid fee
  const replayNonce = `replay-pen-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const nowTs = Date.now().toString();
  const testAmt = parseFloat((800 + Math.random() * 50).toFixed(2));

  // First bid with nonce
  const bid1 = await req(`${ENGINE}/api/v1/auctions/${auction.id}/bid`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token2}`,
      'x-bid-nonce': replayNonce,
      'x-bid-timestamp': nowTs,
    },
    body: JSON.stringify({ amount: testAmt }),
  });
  console.log(`   ℹ Initial bid status: ${bid1.status}`);

  // Immediate Replay attempt with same nonce
  const replayAttempt = await req(`${ENGINE}/api/v1/auctions/${auction.id}/bid`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token2}`,
      'x-bid-nonce': replayNonce,
      'x-bid-timestamp': nowTs,
    },
    body: JSON.stringify({ amount: testAmt + 0.05 }),
  });
  logResult(
    replayAttempt.status === 409,
    'Replay attack blocked: duplicate nonce rejected with HTTP 409 Conflict',
    `Status: ${replayAttempt.status}`
  );

  await sleep(500);

  // Stale timestamp (60s past)
  const staleTs = (Date.now() - 60000).toString();
  const staleAttempt = await req(`${ENGINE}/api/v1/auctions/${auction.id}/bid`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token2}`,
      'x-bid-nonce': `stale-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      'x-bid-timestamp': staleTs,
    },
    body: JSON.stringify({ amount: testAmt + 0.1 }),
  });
  logResult(
    staleAttempt.status === 400,
    'Stale timestamp (>30s skew) rejected with HTTP 400 Bad Request',
    `Status: ${staleAttempt.status}`
  );

  await sleep(500);

  // Future timestamp (60s in future)
  const futureTs = (Date.now() + 60000).toString();
  const futureAttempt = await req(`${ENGINE}/api/v1/auctions/${auction.id}/bid`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token2}`,
      'x-bid-nonce': `future-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      'x-bid-timestamp': futureTs,
    },
    body: JSON.stringify({ amount: testAmt + 0.15 }),
  });
  logResult(
    futureAttempt.status === 400,
    'Future timestamp (>30s in future) rejected with HTTP 400 Bad Request',
    `Status: ${futureAttempt.status}`
  );

  // 6. Scenario: Separation of Duties Pen-Test (BL-11 & Admin Bidding Restriction)
  console.log('\n--- 6. PEN-TEST: Separation of Duties (Admin Bidding Blocked at Initiation & Placement) ---');
  const adminFeeLinkRes = await req(`${ENGINE}/api/v1/payments/bid-fee/${auction.id}/link`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  logResult(
    adminFeeLinkRes.status === 403 &&
      adminFeeLinkRes.data?.message === 'Administrators are not allowed to participate in bidding.',
    'Admin user strictly blocked from creating bid fee payment link (HTTP 403 Forbidden)'
  );

  const adminWalletFeeRes = await req(`${ENGINE}/api/v1/payments/bid-fee/${auction.id}/wallet-pay`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  logResult(
    adminWalletFeeRes.status === 403 &&
      adminWalletFeeRes.data?.message === 'Administrators are not allowed to participate in bidding.',
    'Admin user strictly blocked from paying bid fee via wallet (HTTP 403 Forbidden)'
  );

  const adminBidAttempt = await req(`${ENGINE}/api/v1/auctions/${auction.id}/bid`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
      'x-bid-nonce': `admin-bid-${Date.now()}`,
      'x-bid-timestamp': Date.now().toString(),
    },
    body: JSON.stringify({ amount: 99.99 }),
  });
  logResult(
    adminBidAttempt.status === 403 &&
      adminBidAttempt.data?.message === 'Administrators are not allowed to participate in bidding.',
    'Admin user strictly blocked from placing bids (HTTP 403 Forbidden)'
  );

  // 7. Scenario: Fee Deduction Bounds Pen-Test (BL-04)
  console.log('\n--- 7. PEN-TEST: Fee Deduction Bounds & Validation (BL-04: @Min(1.00), @Max(10000)) ---');
  const testBounds = [
    { amount: -50, shouldPass: false, label: 'Negative amount (-50)' },
    { amount: 0, shouldPass: false, label: 'Zero amount (0)' },
    { amount: 0.5, shouldPass: false, label: 'Below minimum (0.50 ETB)' },
    { amount: 0.99, shouldPass: false, label: 'Just below min (0.99 ETB)' },
    { amount: 10001, shouldPass: false, label: 'Above maximum (10,001 ETB)' },
    { amount: 100000, shouldPass: false, label: 'Extreme drain (100,000 ETB)' },
    { amount: 5.0, shouldPass: true, label: 'Valid bounded fee (5.00 ETB)' },
  ];

  for (const b of testBounds) {
    const res = await req(`${IDENTITY}/api/v1/wallet/deduct-fee`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-api-key': INTERNAL_KEY,
      },
      body: JSON.stringify({ user_id: user1Id, amount: b.amount }),
    });

    if (b.shouldPass) {
      logResult([200, 201].includes(res.status), `Bound: ${b.label} accepted`);
    } else {
      logResult(res.status === 400, `Bound: ${b.label} correctly rejected with HTTP 400`);
    }
  }

  // 8. Scenario: Single-Use PIN Token Exhaustion (BL-09)
  console.log('\n--- 8. PEN-TEST: Single-Use Verified PIN Session Exhaustion (BL-09) ---');
  await req(`${IDENTITY}/api/v1/wallet/verify-pin`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token1}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: '0000' }),
  });

  const firstPay = await req(`${ENGINE}/api/v1/payments/bid-fee/${auction.id}/wallet-pay`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token1}` },
  });
  logResult(
    [200, 201].includes(firstPay.status),
    'First payment successfully consumes single-use PIN session'
  );

  const secondPay = await req(`${ENGINE}/api/v1/payments/bid-fee/${auction.id}/wallet-pay`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token1}` },
  });
  logResult(
    secondPay.status === 403,
    'Subsequent payment rejected with HTTP 403 (single-use session was consumed)'
  );

  console.log('\n======================================================================');
  console.log(` Penetration & Stress Testing Complete: ${passedTests} Passed, ${failedTests} Failed (${totalTests} Total)`);
  console.log('======================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runStress().catch((err) => {
  console.error('\n❌ Unhandled Stress Test Error:', err);
  process.exit(1);
});
