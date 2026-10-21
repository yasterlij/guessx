/**
 * Production Gateway & Process Runner for GuessX
 * Suitable for cPanel / Phusion Passenger / VPS / Docker / PM2
 *
 * This file serves as the unified entry point. It boots the NestJS
 * unified modular backend on an internal port and serves the React/Vite
 * frontend SPA, proxying all API and WebSocket (/socket.io) traffic.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;

// Internal port for the unified NestJS backend
let BACKEND_PORT = parseInt(process.env.BACKEND_PORT, 10) || 3001;

// Avoid port collision if PORT is numeric
if (!isNaN(Number(PORT)) && Number(PORT) === BACKEND_PORT) {
  BACKEND_PORT = BACKEND_PORT + 1;
}

const backendTarget = process.env.BACKEND_URL || `http://127.0.0.1:${BACKEND_PORT}`;
const children = [];

function startBackend() {
  if (process.env.SPAWN_BACKEND === 'false') {
    console.log(`[Gateway] SPAWN_BACKEND is false. Forwarding to external backend at ${backendTarget}`);
    return null;
  }

  const backendDir = path.join(ROOT, 'backend');
  const mainPath = path.join(backendDir, 'dist', 'main.js');

  if (!fs.existsSync(mainPath)) {
    console.error(`[Gateway] Backend build not found at: ${mainPath}`);
    console.error(`[Gateway] Please run 'npm run build' or 'npm run build:backend' before starting.`);
    return null;
  }

  const env = {
    ...process.env,
    PORT: String(BACKEND_PORT),
  };

  console.log(`[Gateway] Starting GuessX Unified Backend on internal port ${BACKEND_PORT}...`);
  const child = spawn(process.execPath, [mainPath], {
    cwd: backendDir,
    env,
    stdio: 'inherit',
  });

  child.on('error', (err) => {
    console.error('[Gateway] Failed to start backend process:', err);
  });

  child.on('exit', (code, signal) => {
    console.warn(`[Gateway] Backend process exited with code ${code} / signal ${signal}`);
  });

  children.push(child);
  return child;
}

// 1. Boot internal backend process
startBackend();

// 2. Setup Express Gateway & Proxies
const app = express();

const apiProxy = createProxyMiddleware({
  target: backendTarget,
  changeOrigin: true,
  xfwd: true,
  on: {
    error: (err, req, res) => {
      if (res && !res.headersSent && typeof res.status === 'function') {
        res.status(503).json({
          statusCode: 503,
          error: 'Service Unavailable',
          message: 'Backend service is starting up, please refresh in a moment.',
        });
      }
    },
  },
});

const wsProxy = createProxyMiddleware({
  target: backendTarget,
  changeOrigin: true,
  ws: true,
  on: {
    error: (err, req, socket) => {
      if (socket && typeof socket.destroy === 'function') {
        socket.destroy();
      }
    },
  },
});

// Forward /socket.io, /api, and /uploads to backend preserving full paths
app.use((req, res, next) => {
  if (req.url.startsWith('/socket.io')) {
    return wsProxy(req, res, next);
  }
  if (req.url.startsWith('/api') || req.url.startsWith('/uploads')) {
    return apiProxy(req, res, next);
  }
  next();
});

// Payment callback helpers
app.use('/payment/success', (req, res) => {
  const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect(`/payment/success${qs}`);
});
app.use('/payment/failed', (req, res) => {
  const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  res.redirect(`/payment/failed${qs}`);
});

// 3. Serve Frontend SPA if built
const frontendDist = path.join(ROOT, 'guessx-web', 'dist');
if (fs.existsSync(frontendDist)) {
  console.log(`[Gateway] Serving static frontend from ${frontendDist}`);
  app.use(express.static(frontendDist, {
    maxAge: '1h',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  }));

  app.use((req, res) => {
    if (req.method === 'GET' && !req.url.startsWith('/api') && !req.url.startsWith('/socket.io') && !req.url.startsWith('/uploads')) {
      return res.sendFile(path.join(frontendDist, 'index.html'));
    }
    res.status(404).json({ statusCode: 404, error: 'Not Found' });
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      status: 'healthy',
      app: 'GuessX Production Gateway',
      environment: process.env.NODE_ENV || 'production',
      backend: backendTarget,
      endpoints: {
        health: '/api/v1/health',
        docs: '/api/docs',
      },
      note: 'Frontend dist not found. Run "npm run build:web" to build the web client.',
    });
  });
}

// 4. Start HTTP Server
const server = app.listen(PORT, () => {
  console.log(`[Gateway] GuessX Gateway running on port ${PORT}`);
  console.log(`[Gateway] Target backend: ${backendTarget}`);
});

// WebSocket upgrade forwarding
server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/socket.io')) {
    wsProxy.upgrade(req, socket, head);
  }
});

// 5. Graceful Shutdown
function shutdown(signal) {
  console.log(`[Gateway] Received ${signal}. Shutting down worker processes...`);
  children.forEach((child) => {
    try {
      child.kill('SIGTERM');
    } catch {
      // ignore
    }
  });
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
