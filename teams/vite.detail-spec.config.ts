// Builds the Message details UI flow and design spec (detail-spec.html) on its own, into detail-spec/dist, so tools/lock.mjs can pack it:
//   npx vite build -c vite.detail-spec.config.ts && node tools/lock.mjs <pw> <out.html> teams/detail-spec "<title>"
// The lock tool packs one CSS and one JS file, so the screenshots are inlined into the JS.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { outDir: 'detail-spec/dist', emptyOutDir: true, assetsInlineLimit: 100_000_000, rollupOptions: { input: 'detail-spec.html' } },
})
