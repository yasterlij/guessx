const { createProxyMiddleware } = require('http-proxy-middleware');
const express = require('express');

const identity = 'http://localhost:3001';
const auctionEngine = 'http://localhost:3002';
const queryService = 'http://localhost:3003';

const identityProxy = createProxyMiddleware({ target: identity, changeOrigin: true });
const auctionProxy = createProxyMiddleware({ target: auctionEngine, changeOrigin: true });
const queryProxy = createProxyMiddleware({ target: queryService, changeOrigin: true });
const wsProxy = createProxyMiddleware({ target: auctionEngine, changeOrigin: true, ws: true });

const app = express();
const PORT = 3333;

app.use('/socket.io', wsProxy);

app.use((req, res, next) => {
  const url = req.url;

  if (
    url.startsWith('/api/v1/admin/stats') ||
    url.startsWith('/api/v1/admin/settlement') ||
    url.startsWith('/api/v1/admin/winners') ||
    url.startsWith('/api/v1/admin/transactions') ||
    url.startsWith('/api/v1/admin/compliance') ||
    url.startsWith('/api/v1/admin/analytics') ||
    url.startsWith('/api/v1/audit') ||
    /\/api\/v1\/admin\/auctions\/[^/]+\/(transactions|settlement-config)/.test(url)
  ) {
    return queryProxy(req, res, next);
  }

  if (
    url.startsWith('/api/v1/auth') ||
    url.startsWith('/api/v1/wallet') ||
    url.startsWith('/api/v1/notify') ||
    url.startsWith('/api/v1/otp') ||
    url.startsWith('/api/v1/admin/users') ||
    url.startsWith('/api/v1/admin/rbac') ||
    url.startsWith('/api/v1/rbac') ||
    url.startsWith('/api/v1/disputes')
  ) {
    return identityProxy(req, res, next);
  }

  if (/\/api\/v1\/auctions\/[^/]+\/(bid|result|my-bids)/.test(url)) {
    return auctionProxy(req, res, next);
  }

  if (
    url.startsWith('/api/v1/admin') ||
    url.startsWith('/api/v1/payments') ||
    url.startsWith('/uploads')
  ) {
    return auctionProxy(req, res, next);
  }

  if (
    url.startsWith('/api/v1/auctions') ||
    url.startsWith('/api/v1/products') ||
    url.startsWith('/api/v1/favorites') ||
    url.startsWith('/api')
  ) {
    return queryProxy(req, res, next);
  }

  next();
});

app.use('/payment/success', (req, res) => {
  const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect(`http://localhost:5173/payment/success${qs}`);
});
app.use('/payment/failed', (req, res) => {
  const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect(`http://localhost:5173/payment/failed${qs}`);
});

app.listen(PORT, () => {
  console.log(`\n  ⚡ Dev proxy running on http://localhost:${PORT}`);
  console.log(`  → Identity: ${identity}`);
  console.log(`  → Auction:  ${auctionEngine}`);
  console.log(`  → Query:    ${queryService}\n`);
});
