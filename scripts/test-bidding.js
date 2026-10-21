const IDENTITY = 'http://localhost:3001';
const ENGINE = 'http://localhost:3002';
const QUERY = 'http://localhost:3003';

const SEED_USERS = [
  { phone: '0913320001', name: 'Selam Tesfaye' },
  { phone: '0913320002', name: 'Abebe Kebede' },
  { phone: '0913320003', name: 'Meron Tadesse' },
  { phone: '0913320004', name: 'Yonas Alemu' },
  { phone: '0913320005', name: 'Hanna Wondimu' },
  { phone: '0913320006', name: 'Dawit Hailu' },
  { phone: '0913320007', name: 'Saron Girmay' },
  { phone: '0913320008', name: 'Biruk Assefa' },
  { phone: '0913320009', name: 'Tigist Woldie' },
  { phone: '0913320010', name: 'Henok Desta' },
  { phone: '0913320011', name: 'Betelhem Amanuel' },
  { phone: '0913320012', name: 'Ephrem Teshome' },
  { phone: '0913320013', name: 'Ruth Mekonnen' },
  { phone: '0913320014', name: 'Nahom Wolde' },
  { phone: '0913320015', name: 'Makeda Haile' },
  { phone: '0913320016', name: 'Kaleb Zerihun' },
  { phone: '0913320017', name: 'Tsion Bekele' },
  { phone: '0913320018', name: 'Samuel Girma' },
  { phone: '0913320019', name: 'Frehiwot Abate' },
  { phone: '0913320020', name: 'Mintesinot Desalegn' },
  { phone: '0913320021', name: 'Birtukan Fikre' },
  { phone: '0913320022', name: 'Fikadu Tesfaye' },
  { phone: '0913320023', name: 'Sisay Demissie' },
  { phone: '0913320024', name: 'Yetnayet Abraha' },
  { phone: '0913320025', name: 'Tewodros Shiferaw' },
  { phone: '0913320026', name: 'Blen Ashenafi' },
  { phone: '0913320027', name: 'Liyu Lemma' },
  { phone: '0913320028', name: 'Amanuel Berhane' },
];

async function login(phone, password = '0000') {
  const res = await fetch(`${IDENTITY}/api/v1/auth/login/phone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone_number: phone, password }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Login failed for ${phone}: ${err}`);
  }
  return res.json();
}

async function getActiveAuctions() {
  const res = await fetch(`${QUERY}/api/v1/auctions/active`);
  if (!res.ok) throw new Error(`Failed to get auctions: ${await res.text()}`);
  return res.json();
}

async function getAuctionBids(token, auctionId) {
  const res = await fetch(`${ENGINE}/api/v1/admin/auctions/${auctionId}/bids`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to get bids: ${await res.text()}`);
  return res.json();
}

async function payBidFee(token, auctionId) {
  const res = await fetch(`${ENGINE}/api/v1/payments/bid-fee/${auctionId}/wallet-pay`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return { ok: res.ok, status: res.status, body: await res.text() };
}

async function placeBid(token, auctionId, amount) {
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const timestamp = Date.now().toString();
  const res = await fetch(`${ENGINE}/api/v1/auctions/${auctionId}/bid`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-bid-nonce': nonce,
      'x-bid-timestamp': timestamp,
    },
    body: JSON.stringify({ amount }),
  });
  return { ok: res.ok, status: res.status, body: await res.text() };
}

async function closeAuction(token, auctionId) {
  const res = await fetch(`${ENGINE}/api/v1/admin/auctions/${auctionId}/close`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to close auction: ${await res.text()}`);
  return res.json();
}

async function getAuctionResult(auctionId) {
  const res = await fetch(`${ENGINE}/api/v1/auctions/${auctionId}/result`);
  if (!res.ok) throw new Error(`Failed to get result: ${await res.text()}`);
  return res.json();
}

async function drawWinner(token, auctionId) {
  const res = await fetch(`${ENGINE}/api/v1/admin/auctions/${auctionId}/winner`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to draw winner: ${await res.text()}`);
  return res.json();
}

async function main() {
  console.log('🧪 Guess X End-to-End Bidding Test\n');

  // 1. Login all users
  console.log('1. Logging in all users...');
  const tokens = [];
  for (const u of SEED_USERS) {
    try {
      const data = await login(u.phone);
      tokens.push({ phone: u.phone, name: u.name, token: data.access_token, id: data.user.id });
      process.stdout.write('.');
    } catch (e) {
      console.error(`\n  ✗ ${u.name} (${u.phone}): ${e.message}`);
    }
  }
  console.log(`\n   ${tokens.length}/${SEED_USERS.length} logged in successfully\n`);

  if (tokens.length === 0) {
    console.log('✗ No users could login — aborting');
    process.exit(1);
  }

  // 2. Get an active auction
  console.log('2. Fetching active auctions...');
  const auctions = await getActiveAuctions();
  const auction = auctions?.[0] || auctions?.data?.[0];
  if (!auction) {
    console.log('✗ No active auctions found');
    process.exit(1);
  }
  console.log(`   Selected auction: ${auction.name || auction.product?.name || auction.id} (ID: ${auction.id})\n`);

  // 3. Place bids with varying amounts
  // Design: 28 users, some unique amounts, some duplicates
  // Expected winner: lowest UNIQUE amount
  const bidAmounts = [
    5.00,    // user 1  → UNIQUE (lowest unique = WINNER)
    10.00,   // user 2  → UNIQUE
    15.00,   // user 3  → UNIQUE
    20.00,   // user 4  → UNIQUE
    25.00,   // user 5  → UNIQUE
    30.00,   // user 6  → UNIQUE
    35.00,   // user 7  → UNIQUE
    40.00,   // user 8  → UNIQUE
    45.00,   // user 9  → UNIQUE
    50.00,   // user 10 → UNIQUE
    10.00,   // user 11 → DUPLICATE of user 2
    25.00,   // user 12 → DUPLICATE of user 5
    12.50,   // user 13 → UNIQUE
    18.75,   // user 14 → UNIQUE
    22.50,   // user 15 → UNIQUE
    28.25,   // user 16 → UNIQUE
    33.00,   // user 17 → UNIQUE
    38.50,   // user 18 → UNIQUE
    7.25,    // user 19 → UNIQUE
    9.99,    // user 20 → UNIQUE
    12.50,   // user 21 → DUPLICATE of user 13
    33.00,   // user 22 → DUPLICATE of user 17
    55.00,   // user 23 → UNIQUE
    60.00,   // user 24 → UNIQUE
    99.99,   // user 25 → UNIQUE
    1.25,    // user 26 → UNIQUE (lowest amount)
    100.00,  // user 27 → UNIQUE
    2.75,    // user 28 → UNIQUE
  ];

  // Calulate expected winner
  const amounts = bidAmounts.slice(0, tokens.length);
  const freq = {};
  for (const a of amounts) freq[a] = (freq[a] || 0) + 1;
  const uniqueSorted = [...new Set(amounts)].filter(a => freq[a] === 1).sort((a, b) => a - b);
  const expectedWinnerAmount = uniqueSorted[0];
  const expectedWinnerIdx = amounts.indexOf(expectedWinnerAmount);

  console.log('3. Placing bids...');
  let success = 0;
  let failed = 0;
  for (let i = 0; i < tokens.length; i++) {
    const amount = amounts[i];
    await payBidFee(tokens[i].token, auction.id);
    const result = await placeBid(tokens[i].token, auction.id, amount);
    if (result.ok) {
      process.stdout.write('.');
      success++;
    } else {
      process.stdout.write('x');
      failed++;
      console.log(`\n  ✗ ${tokens[i].name}: bid ${amount} → HTTP ${result.status}: ${result.body}`);
    }
  }
  console.log(`\n   ${success} accepted, ${failed} failed\n`);

  if (success === 0) {
    console.log('✗ No bids accepted — aborting');
    process.exit(1);
  }

  // 4. Verify Redis state
  console.log('4. Checking Redis bid state...');
  const redisBidCount = await (await fetch(`${ENGINE}/api/v1/admin/auctions/${auction.id}/bids`)).json().catch(() => null);
  const totalBids = Array.isArray(redisBidCount) ? redisBidCount.length : redisBidCount?.data?.length || '?';
  console.log(`   Bids in system: ${totalBids}\n`);

  // 5. Close auction and draw winner
  console.log('5. Closing auction...');
  const adminToken = (await login('0911111111', '1234')).access_token;
  const closed = await closeAuction(adminToken, auction.id);
  console.log(`   Closed: ${JSON.stringify(closed)}\n`);

  // 6. Draw winner
  console.log('6. Drawing winner...');
  const winnerResult = await drawWinner(adminToken, auction.id);
  const winningAmount = Number(winnerResult.winning_bid_amount || winnerResult.winner?.winning_bid_amount || 0);
  const winnerName = winnerResult.winner_name || winnerResult.winner?.user_name || '?';
  console.log(`   Winner: ${winnerName}`);
  console.log(`   Winning amount: ${winningAmount}`);
  console.log(`   Expected winner: ${tokens[expectedWinnerIdx]?.name || '?'} (amount: ${expectedWinnerAmount})`);
  console.log(`   Expected amount: ${expectedWinnerAmount}\n`);

  // 7. Verify
  let pass = true;
  if (Number.isFinite(winningAmount) && winningAmount > 0) {
    console.log(`   ✅ Winner selected: ${winnerName} with ${winningAmount}`);
  } else {
    console.log(`   ⚠️  No winner selected`);
  }

  if (winningAmount === expectedWinnerAmount) {
    console.log(`   ✅ Winning amount matches expected lowest unique bid (${expectedWinnerAmount})`);
  } else if (winningAmount > 0 && winningAmount !== expectedWinnerAmount) {
    console.log(`   ⚠️  Winning amount ${winningAmount} ≠ expected ${expectedWinnerAmount}`);
    console.log(`      Unique sorted amounts: ${uniqueSorted.join(', ')}`);
    pass = false;
  }

  // 8. Print full summary
  console.log('\n📊 Bid Summary:');
  console.log('   Amount  | User                    | Status');
  console.log('   --------|-------------------------|--------');
  for (let i = 0; i < tokens.length; i++) {
    const freqAtAmount = freq[amounts[i]];
    const isUnique = freqAtAmount === 1;
    const isWinner = amounts[i] === expectedWinnerAmount;
    const status = isWinner ? '✅ WINNER' : isUnique ? '  unique' : '  dupe  ';
    console.log(`   ${String(amounts[i]).padStart(7)} | ${tokens[i].name.padEnd(23)} | ${status}`);
  }

  console.log(`\n${pass ? '✅ ALL CHECKS PASSED' : '❌ SOME CHECKS FAILED'}`);
}

main().catch(e => { console.error('\n❌ Fatal:', e.message); process.exit(1); });
