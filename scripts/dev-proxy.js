const { createProxyMiddleware } = require('http-proxy-middleware');
const express = require('express');

const backend = process.env.BACKEND_URL || 'http://localhost:3001';

const backendProxy = createProxyMiddleware({ target: backend, changeOrigin: true });
const wsProxy = createProxyMiddleware({ target: backend, changeOrigin: true, ws: true });

const app = express();
const PORT = 3333;

app.use('/socket.io', wsProxy);
app.use('/api', backendProxy);
app.use('/uploads', backendProxy);

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
  console.log(`  → Backend: ${backend}\n`);
});
