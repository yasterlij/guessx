/**
 * Pre-generate test users and JWT tokens for k6 load testing.
 *
 * Usage: node load-tests/seed-tokens.js > load-tests/tokens.json
 *
 * Prerequisites: docker compose up -d (identity-service running on :3001)
 */

const http = require('http');

const IDENTITY = 'http://localhost:3001/api/v1';

function fetch(method, path, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(IDENTITY + path);
    const opts = {
      hostname: u.hostname, port: u.port,
      path: u.pathname, method,
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  const COUNT = parseInt(process.argv[2] || '1000', 10);
  const tokens = [];

  for (let i = 0; i < COUNT; i++) {
    const phone = `25199${String(i).padStart(7, '0')}`;
    const email = `loaduser${i}@guessx.com`;

    // Try register; if 409 already exists, login
    let r = await fetch('POST', '/auth/register', {
      phone_number: phone, email,
      password: 'LoadTest123!', full_name: `Load User ${i}`,
    });

    let accessToken;
    if (r.status === 201) {
      accessToken = r.data?.access_token;
    } else if (r.status === 409) {
      r = await fetch('POST', '/auth/login/email', { email, password: 'LoadTest123!' });
      accessToken = r.data?.access_token;
    }

    if (accessToken) {
      tokens.push({ token: accessToken, userId: i });

      // Deposit 500 ETB wallet balance every 10th user
      if (i % 10 === 0) {
        // Resolve UUID
        const { execSync } = require('child_process');
        const uid = execSync(
          `docker exec takelow-postgres-primary-1 psql -U admin -d guessx_db -t -A -c "SELECT id FROM users WHERE phone_number='${phone}'"`,
          { encoding: 'utf8', timeout: 5000 }
        ).trim();
        if (uid) {
          await fetch('POST', '/wallet/webhook/fintech', {
            reference_id: `load-dep-${i}`,
            user_id: uid, amount: 500, status: 'COMPLETED',
          });
        }
      }
    }

    if ((i + 1) % 100 === 0) console.error(`Seeded ${i + 1}/${COUNT} users`);
  }

  // Output JSON for k6
  console.log(JSON.stringify(tokens));
  console.error(`Done: ${tokens.length} tokens generated`);
}

main().catch(err => { console.error(err); process.exit(1); });
