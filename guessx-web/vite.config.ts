import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

import basicSsl from '@vitejs/plugin-basic-ssl';

const IDENTITY = process.env.VITE_IDENTITY_API_BASE_URL || 'http://localhost:3001';
const ENGINE = process.env.VITE_ENGINE_API_BASE_URL || 'http://localhost:3002';
const QUERY = process.env.VITE_QUERY_API_BASE_URL || 'http://localhost:3003';
const useHttps = process.env.VITE_HTTPS === 'true' || process.env.HTTPS === 'true' || process.argv.includes('--https');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), ...(useHttps ? [basicSsl()] : [])],
  resolve: {
    alias: {
      "@takelow/api": path.resolve(__dirname, "../packages/guessx-api/src/index.ts"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('/screens/Admin') ||
            id.includes('WinnerManagementScreen') ||
            id.includes('SettlementReportScreen') ||
            id.includes('DisputesScreen') ||
            id.includes('RbacScreen') ||
            id.includes('/components/admin/')
          ) {
            return 'admin-portal';
          }
          if (id.includes('node_modules')) {
            if (id.includes('framer-motion') || id.includes('motion-dom') || id.includes('motion-utils')) return 'framer-motion'
            if (id.includes('lucide-react')) return 'icons'
            if (id.includes('socket.io-client') || id.includes('engine.io-client')) return 'socket'
            if (id.includes('axios')) return 'axios'
            if (id.includes('react') || id.includes('scheduler')) return 'react-vendor'
            return 'vendor'
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api/v1/auth': { target: IDENTITY, changeOrigin: true },
      '/api/v1/wallet': { target: IDENTITY, changeOrigin: true },
      '/api/v1/notify': { target: IDENTITY, changeOrigin: true },
      '/api/v1/otp': { target: IDENTITY, changeOrigin: true },
      '/api/v1/admin/users': { target: IDENTITY, changeOrigin: true },
      '/api/v1/payments': { target: ENGINE, changeOrigin: true },
      '/api/v1/favorites': { target: QUERY, changeOrigin: true },
      '/api/v1/audit': { target: QUERY, changeOrigin: true },
      '^/api/v1/admin/auctions/[^/]+/transactions': { target: QUERY, changeOrigin: true },
      '^/api/v1/admin/auctions/[^/]+/settlement-config': { target: QUERY, changeOrigin: true },
      '/api/v1/admin/transactions': { target: QUERY, changeOrigin: true },
      '/api/v1/admin/compliance': { target: QUERY, changeOrigin: true },
      '/api/v1/admin/analytics': { target: QUERY, changeOrigin: true },
      '/api/v1/admin/auctions': { target: ENGINE, changeOrigin: true },
      '/api/v1/admin/products': { target: ENGINE, changeOrigin: true },
      '/api/v1/admin/stats': { target: QUERY, changeOrigin: true },
      '/api/v1/admin/settlement': { target: QUERY, changeOrigin: true },
      '/api/v1/admin/winners': { target: QUERY, changeOrigin: true },
      '/api/v1/admin/rbac': { target: IDENTITY, changeOrigin: true },
      '/api/v1/rbac': { target: IDENTITY, changeOrigin: true },
      '/api/v1/disputes': { target: IDENTITY, changeOrigin: true },
      '/api/v1/admin': { target: ENGINE, changeOrigin: true },
      '/api/v1/products': { target: QUERY, changeOrigin: true },
      '/api/v1/auctions/result': { target: ENGINE, changeOrigin: true },
      '^/api/v1/auctions/[^/]+/result': { target: ENGINE, changeOrigin: true },
      '^/api/v1/auctions/[^/]+/bid': { target: ENGINE, changeOrigin: true },
      '^/api/v1/auctions/[^/]+/my-bids': { target: ENGINE, changeOrigin: true },
      '/api/v1/auctions': { target: QUERY, changeOrigin: true },
      '/api': { target: QUERY, changeOrigin: true },
      '/socket.io': { target: ENGINE, ws: true },
      '/uploads': { target: ENGINE, changeOrigin: true },
    },
  },
});
