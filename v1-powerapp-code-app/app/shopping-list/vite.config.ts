/// <reference types="vitest" />
import { defineConfig } from 'vite'
import path from 'path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { powerApps } from '@microsoft/power-apps-vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    powerApps()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // The component test suite stays on the LocalStorage impl (see src/data/index.ts).
    // Stub @microsoft/power-apps so the Dataverse module graph never has to resolve
    // in Node — the published ESM has bare imports that Node's resolver rejects.
    alias: {
      '@microsoft/power-apps/data': path.resolve(__dirname, './src/test/stubs/power-apps-data.ts'),
      '@microsoft/power-apps/data/metadata/dataverse': path.resolve(__dirname, './src/test/stubs/power-apps-metadata.ts'),
    },
  },
})
