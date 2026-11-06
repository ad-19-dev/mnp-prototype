// Builds the one-record-per-channel UI flow and design spec (split-spec.html) on its own, into split-spec/dist, so tools/lock.mjs can pack it:
//   npx vite build -c vite.split-spec.config.ts && node tools/lock.mjs <pw> <out.html> teams/split-spec "<title>"
// The lock tool packs one CSS and one JS file, so the screenshots are inlined into the JS.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { outDir: 'split-spec/dist', emptyOutDir: true, assetsInlineLimit: 100_000_000, rollupOptions: { input: 'split-spec.html' } },
})
