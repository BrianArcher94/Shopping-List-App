/// <reference types="vitest" />
import { defineConfig } from 'vite'
import path from 'path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Local full-stack mode: SPA on :5173, `func start` on :7071. Mirrors what
    // server.js does in production so /api stays same-origin (no CORS, and the
    // Authorization header rides along untouched).
    proxy: {
      '/api': { target: 'http://localhost:7071', changeOrigin: true },
    },
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // The component test suite runs against the LocalStorage adapter
    // (see src/data/index.ts) — MODE === 'test' forces it regardless of
    // VITE_USE_API, so no backend or network is ever touched in tests.
  },
})
