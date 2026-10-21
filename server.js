/**
 * Production Gateway & Process Runner for cPanel / Phusion Passenger
 *
 * This file serves as the main startup file for cPanel ("Setup Node.js App").
 * It boots the 3 NestJS microservices on internal ports and routes incoming
 * HTTP and WebSocket traffic through an Express reverse proxy on Passenger's PORT.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;

// Internal ports for the 3 NestJS microservices
const IDENTITY_PORT = process.env.IDENTITY_PORT || 3001;
const AUCTION_PORT = process.env.AUCTION_PORT || 3002;
const QUERY_PORT = process.env.QUERY_PORT || 3003;

const identityTarget = `http://127.0.0.1:${IDENTITY_PORT}`;
const auctionTarget = `http://127.0.0.1:${AUCTION_PORT}`;
const queryTarget = `http://127.0.0.1:${QUERY_PORT}`;

const children = [];

function startService(name, serviceDir, port) {
  const mainPath = path.join(ROOT, serviceDir, 'dist', 'main.js');
  if (!fs.existsSync(mainPath)) {
    console.error(`[${name}] Build file not found: ${mainPath}`);
    console.error(`[${name}] Please run 'npm run build' inside ${serviceDir} before starting.`);
    return null;
  }

  const env = {
    ...process.env,
    PORT: String(port),
  };

  console.log(`[Gateway] Starting ${name} on internal port ${port}...`);
  const child = spawn(process.execPath, [mainPath], {
    cwd: path.join(ROOT, serviceDir),
    env,
    stdio: 'inherit',
  });

  child.on('error', (err) => {
    console.error(`[${name}] Failed to start:`, err);
  });

  child.on('exit', (code, signal) => {
    console.warn(`[${name}] Exited with code ${code} / signal ${signal}`);
  });

  children.push(child);
  return child;
}

// 1. Boot internal microservices
startService('identity-service', 'identity-service', IDENTITY_PORT);
startService('auction-engine', 'auction-engine', AUCTION_PORT);
startService('query-service', 'query-service', QUERY_PORT);

// 2. Setup Reverse Proxy Gateway
const app = express();

const identityProxy = createProxyMiddleware({ target: identityTarget, changeOrigin: true });
const auctionProxy = createProxyMiddleware({ target: auctionTarget, changeOrigin: true });
const queryProxy = createProxyMiddleware({ target: queryTarget, changeOrigin: true });
const wsProxy = createProxyMiddleware({ target: auctionTarget, changeOrigin: true, ws: true });

// WebSocket / Socket.IO -> Auction Engine
app.use('/socket.io', wsProxy);

// Dynamic API routing
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

// Serve static frontend build if present
const frontendDist = path.join(ROOT, 'guessx-web', 'dist');
if (fs.existsSync(frontendDist)) {
  console.log(`[Gateway] Serving static frontend from ${frontendDist}`);
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    if (!req.url.startsWith('/api') && !req.url.startsWith('/socket.io')) {
      res.sendFile(path.join(frontendDist, 'index.html'));
    }
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      status: 'healthy',
      app: 'GuessX / Takelow Production Gateway',
      environment: process.env.NODE_ENV || 'production',
      services: {
        identity: identityTarget,
        auctionEngine: auctionTarget,
        query: queryTarget,
      },
    });
  });
}

const server = app.listen(PORT, () => {
  console.log(`[Gateway] Passenger reverse proxy running on port ${PORT}`);
});

server.on('upgrade', wsProxy.upgrade);

// 3. Graceful shutdown
function shutdown(signal) {
  console.log(`[Gateway] Received ${signal}. Shutting down worker processes...`);
  children.forEach((child) => {
    try {
      child.kill('SIGTERM');
    } catch (e) {
      // ignore
    }
  });
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
