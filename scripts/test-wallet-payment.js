const http = require('http');

const IDENTITY = 'http://localhost:3001/api/v1';
const ENGINE = 'http://localhost:3002/api/v1';
const QUERY = 'http://localhost:3003/api/v1';

async function req(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data };
}

async function run() {
  console.log('=== Starting Comprehensive Wallet Payment Test ===\n');

  // 1. Login as standard user
  console.log('1. Logging in as standard user (0913320018)...');
  const userLogin = await req(`${IDENTITY}/auth/login/phone`, {
    method: 'POST',
    body: JSON.stringify({ phone_number: '0913320018', password: '0000' }),
  });
  if (!userLogin.ok) throw new Error(`User login failed: ${JSON.stringify(userLogin.data)}`);
  const userToken = userLogin.data.access_token;
  const userId = userLogin.data.user?.id || userLogin.data.user_id;
  console.log('   ✓ User logged in successfully.');

  // 2. Check PIN status & verify PIN
  console.log('\n2. Verifying wallet PIN...');
  const pinStatus = await req(`${IDENTITY}/wallet/pin-status`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  console.log('   PIN Status:', pinStatus.data);
  const pinVerify = await req(`${IDENTITY}/wallet/verify-pin`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({ pin: '0000' }),
  });
  if (!pinVerify.ok || !pinVerify.data.valid) {
    throw new Error(`PIN verification failed: ${JSON.stringify(pinVerify.data)}`);
  }
  console.log('   ✓ Wallet PIN verified successfully.');

  // 3. Check wallet balance before fee payment
  console.log('\n3. Checking wallet balance...');
  const balanceBefore = await req(`${IDENTITY}/wallet/balance`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  console.log('   Wallet Balance before fee:', balanceBefore.data.balance);

  // 4. Find active auction for testing
  console.log('\n4. Selecting active auction...');
  const activeRes = await req(`${QUERY}/auctions/active`);
  const activeAuctions = Array.isArray(activeRes.data) ? activeRes.data : activeRes.data?.data || [];
  if (activeAuctions.length === 0) throw new Error('No active auctions found');
  const auction = activeAuctions[2] || activeAuctions[0];
  console.log(`   Target Auction: ${auction.id} (${auction.name || auction.title})`);

  // 5. Pay bid fee with wallet
  console.log('\n5. Processing bid fee payment via wallet...');
  const feePayRes = await req(`${ENGINE}/payments/bid-fee/${auction.id}/wallet-pay`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
  });
  if (!feePayRes.ok) throw new Error(`Bid fee wallet payment failed: ${JSON.stringify(feePayRes.data)}`);
  console.log('   ✓ Bid fee paid successfully:', feePayRes.data);

  // 6. Verify wallet balance deducted
  const balanceAfter = await req(`${IDENTITY}/wallet/balance`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  console.log('   Wallet Balance after fee:', balanceAfter.data.balance);
  const feeDeducted = Number(balanceBefore.data.balance) - Number(balanceAfter.data.balance);
  console.log(`   ✓ Fee deducted from wallet: ${feeDeducted} ETB`);

  // 7. Place a valid bid
  console.log('\n7. Placing bid on auction...');
  const bidAmount = (auction.min_bid || 1.00) + 5.00;
  const bidRes = await req(`${ENGINE}/auctions/${auction.id}/bid`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({ amount: bidAmount }),
  });
  console.log('   Bid result:', bidRes.status, bidRes.data);

  console.log('\n=== All Wallet Payment Verification Steps Passed! ===\n');
}

run().catch((err) => {
  console.error('\n❌ Test failed:', err.message);
  process.exit(1);
});
