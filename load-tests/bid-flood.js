import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

export const options = {
  scenarios: {
    flood_bids: {
      executor: 'constant-arrival-rate',
      rate: 5000,
      timeUnit: '1s',
      duration: '60s',
      preAllocatedVUs: 10000,
      maxVUs: 100000,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3002/api/v1';
const AUCTION_ID = __ENV.AUCTION_ID || '';

if (!AUCTION_ID) {
  throw new Error('AUCTION_ID environment variable is required. Run: node load-tests/seed-tokens.js first, then use an active auction ID from the seed script output.');
}

// Pre-seeded tokens from seed-tokens.js
const tokens = new SharedArray('tokens', function () {
  const raw = open('./k6-tokens.json');
  return JSON.parse(raw);
});

export default function () {
  const { token } = tokens[Math.floor(Math.random() * tokens.length)];
  const amount = randomIntBetween(1, 100);

  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'x-bid-nonce': nonce,
    'x-bid-timestamp': String(Date.now()),
  };

  const body = JSON.stringify({ amount });

  const res = http.post(`${BASE_URL}/auctions/${AUCTION_ID}/bid`, body, {
    headers,
    tags: { name: 'bid_submit' },
  });

  check(res, {
    'status is 202 or 400/409': (r) => r.status === 202 || r.status === 400 || r.status === 409,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(randomIntBetween(0.01, 0.05));
}

export function teardown() {
  http.get(`${BASE_URL.split('/api')[0]}/metrics`);
}
