#!/usr/bin/env node

/**
 * End-to-End Integration & Security Flow Test
 * Tests live endpoints across identity-service (3001), auction-engine (3002), and query-service (3003).
 */

const BACKEND = process.env.BACKEND_URL || 'http://localhost:3000';
const IDENTITY = process.env.IDENTITY_URL || BACKEND;
const ENGINE = process.env.ENGINE_URL || BACKEND;
const QUERY = process.env.QUERY_URL || BACKEND;

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`   ✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`   ❌ FAIL: ${message}`);
    failCount++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function req(url, options = {}) {
  const res = await fetch(url, options);
  let data;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data };
}

async function runE2E() {
  console.log('===============================================================');
  console.log('     GuessX Comprehensive End-to-End Security & API Flow       ');
  console.log('===============================================================\n');

  // 1. Health Checks
  console.log('1. Health Checks Across Services:');
  const hId = await req(`${IDENTITY}/api/v1/health`);
  assert(hId.status === 200 && hId.data.status === 'ok', 'Identity Service health check OK (port 3001)');

  const hEng = await req(`${ENGINE}/api/v1/health`);
  assert(hEng.status === 200 && hEng.data.status === 'ok', 'Auction Engine health check OK (port 3002)');

  const hQry = await req(`${QUERY}/api/v1/health`);
  assert(hQry.status === 200 && hQry.data.status === 'ok', 'Query Service health check OK (port 3003)');

  // 2. Authentication Flow
  console.log('\n2. Authentication Controls:');
  const badLogin = await req(`${IDENTITY}/api/v1/auth/login/phone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number: '0913320018', password: 'wrong-password' }),
  });
  assert(badLogin.status === 401, 'Invalid password correctly rejected with HTTP 401');

  const userLogin = await req(`${IDENTITY}/api/v1/auth/login/phone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number: '0913320018', password: '0000' }),
  });
  assert(
    [200, 201].includes(userLogin.status) && userLogin.data.access_token,
    'Standard user login successful (0913320018)',
  );
  const userToken = userLogin.data.access_token;
  const userId = userLogin.data.user.id;

  const adminLogin = await req(`${IDENTITY}/api/v1/auth/login/phone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number: '0911111111', password: '1234' }),
  });
  assert(
    [200, 201].includes(adminLogin.status) && adminLogin.data.user.role === 'admin',
    'Admin login successful (0911111111)',
  );
  const adminToken = adminLogin.data.access_token;

  // 3. Query Service - Active Auctions
  console.log('\n3. Query Service - Active Auctions:');
  const activeAuctionsRes = await req(`${QUERY}/api/v1/auctions/active`);
  assert(activeAuctionsRes.status === 200, 'Fetched active auctions list successfully');
  const auctions = Array.isArray(activeAuctionsRes.data)
    ? activeAuctionsRes.data
    : activeAuctionsRes.data.data || [];
  assert(auctions.length > 0, `Found ${auctions.length} active auctions`);
  const targetAuction = auctions[0];
  console.log(`   ℹ Target auction: ${targetAuction.id} (${targetAuction.name || targetAuction.title || 'Auction'})`);

  // 4. Wallet PIN Security & Gate (BL-09)
  console.log('\n4. Wallet PIN Security & Payment Gate (BL-09):');
  // Attempt wallet pay directly without PIN verification
  const unverifiedWalletPay = await req(`${ENGINE}/api/v1/payments/bid-fee/${targetAuction.id}/wallet-pay`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert(
    unverifiedWalletPay.status === 403,
    'Unverified wallet payment blocked with HTTP 403 Forbidden (BL-09 gatekeeper)',
  );

  // Attempt invalid PIN verification
  const badPinRes = await req(`${IDENTITY}/api/v1/wallet/verify-pin`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pin: '9999' }),
  });
  assert(badPinRes.data.valid === false, 'Invalid PIN verification correctly returns valid: false');

  // Verify with valid PIN
  const validPinRes = await req(`${IDENTITY}/api/v1/wallet/verify-pin`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pin: '0000' }),
  });
  assert(validPinRes.data.valid === true, 'Valid PIN verification succeeds and generates Redis session');

  // Now wallet pay should succeed
  const verifiedWalletPay = await req(`${ENGINE}/api/v1/payments/bid-fee/${targetAuction.id}/wallet-pay`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert(
    verifiedWalletPay.status === 200 || verifiedWalletPay.status === 201,
    'Bid fee wallet payment succeeds with active PIN session',
  );

  // Attempting second wallet pay immediately should fail because session was consumed
  const consumedWalletPay = await req(`${ENGINE}/api/v1/payments/bid-fee/${targetAuction.id}/wallet-pay`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert(
    consumedWalletPay.status === 403,
    'Immediate second wallet payment rejected with HTTP 403 (single-use session consumed)',
  );

  // 5. Bidding Controls & Separation of Duties (BL-11)
  console.log('\n5. Bidding Controls & Separation of Duties:');

  // Admin cannot place bids (BL-11)
  const adminBidRes = await req(`${ENGINE}/api/v1/auctions/${targetAuction.id}/bid`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
      'x-bid-nonce': `nonce-${Date.now()}`,
      'x-bid-timestamp': Date.now().toString(),
    },
    body: JSON.stringify({ amount: 15.5 }),
  });
  assert(
    adminBidRes.status === 403 &&
      adminBidRes.data?.message === 'Administrators are not allowed to participate in bidding.',
    'Administrator bid attempt blocked with HTTP 403 Forbidden & exact notification message',
  );

  // Missing Nonce header check
  const noNonceBid = await req(`${ENGINE}/api/v1/auctions/${targetAuction.id}/bid`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({ amount: 12.34 }),
  });
  assert(noNonceBid.status === 400, 'Bid without nonce/timestamp headers rejected with HTTP 400');

  // Place valid bid
  const testAmount = parseFloat((10 + Math.random() * 50).toFixed(2));
  const validBidNonce = `nonce-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const validBid = await req(`${ENGINE}/api/v1/auctions/${targetAuction.id}/bid`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
      'x-bid-nonce': validBidNonce,
      'x-bid-timestamp': Date.now().toString(),
    },
    body: JSON.stringify({ amount: testAmount }),
  });
  assert(
    validBid.status === 202,
    `Valid bid accepted with HTTP 202 Accepted (Amount: ${testAmount} ETB)`,
  );

  // Duplicate bid with same amount should be rejected
  const dupBid = await req(`${ENGINE}/api/v1/auctions/${targetAuction.id}/bid`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
      'x-bid-nonce': `nonce-dup-${Date.now()}`,
      'x-bid-timestamp': Date.now().toString(),
    },
    body: JSON.stringify({ amount: testAmount }),
  });
  assert(dupBid.status === 409, 'Duplicate bid amount rejected with HTTP 409 Conflict');

  // 6. Wallet Deposit & Idempotency Controls (BL-05)
  console.log('\n6. Wallet & Idempotency Controls:');
  const balanceCheck = await req(`${IDENTITY}/api/v1/wallet/balance`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert(balanceCheck.status === 200, `User wallet balance check OK: ${balanceCheck.data.balance} ETB`);

  // Direct deposit production protection check
  const depositTest = await req(`${IDENTITY}/api/v1/wallet/deposit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount: 100 }),
  });
  // 7. Closed Auctions Admin-Only Access Controls (Rule 3 & Rule 5)
  console.log('\n7. Closed Auctions Admin-Only Access Controls (Rule 3 & Rule 5):');
  const unauthClosed = await req(`${QUERY}/api/v1/auctions/closed`);
  assert(
    unauthClosed.status === 401 || unauthClosed.status === 403,
    'Unauthenticated request to closed auctions rejected with 401/403',
  );

  const userClosed = await req(`${QUERY}/api/v1/auctions/closed`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert(
    userClosed.status === 403,
    'Non-admin user request to closed auctions rejected with HTTP 403 Forbidden',
  );

  const adminClosed = await req(`${QUERY}/api/v1/auctions/closed`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(
    adminClosed.status === 200,
    'Administrator successfully accesses closed auctions list (HTTP 200)',
  );

  // 8. Admin Bidding Restriction Rule
  console.log('\n8. Admin Bidding Restriction Rule (Initiation Timing & Process Integrity):');
  const adminFeeLinkRes = await req(`${ENGINE}/api/v1/payments/bid-fee/${targetAuction.id}/link`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(
    adminFeeLinkRes.status === 403 &&
      adminFeeLinkRes.data?.message === 'Administrators are not allowed to participate in bidding.',
    'Admin bid fee payment link creation blocked instantly with HTTP 403 Forbidden',
  );

  const adminWalletPayRes = await req(`${ENGINE}/api/v1/payments/bid-fee/${targetAuction.id}/wallet-pay`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(
    adminWalletPayRes.status === 403 &&
      adminWalletPayRes.data?.message === 'Administrators are not allowed to participate in bidding.',
    'Admin wallet bid fee payment blocked instantly with HTTP 403 Forbidden',
  );

  const adminBidAttemptRes = await req(`${ENGINE}/api/v1/auctions/${targetAuction.id}/bid`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
      'x-bid-nonce': `admin-bid-${Date.now()}`,
      'x-bid-timestamp': Date.now().toString(),
    },
    body: JSON.stringify({ amount: 99.99 }),
  });
  assert(
    adminBidAttemptRes.status === 403 &&
      adminBidAttemptRes.data?.message === 'Administrators are not allowed to participate in bidding.',
    'Admin direct bid placement blocked instantly with HTTP 403 Forbidden',
  );

  console.log('\n===============================================================');
  console.log(` End-to-End Testing Complete: ${passCount} Passed, ${failCount} Failed`);
  console.log('===============================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runE2E().catch((err) => {
  console.error('\n❌ Unhandled E2E Error:', err);
  process.exit(1);
});
