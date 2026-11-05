// Builds the send-flow UI flow (compose-flow.html) on its own, into compose-flow/dist, so tools/lock.mjs can pack it:
//   npx vite build -c vite.compose-flow.config.ts && node tools/lock.mjs <pw> <out.html> teams/compose-flow "<title>"
// The lock tool packs one CSS and one JS file, so the screenshots are inlined into the JS.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { outDir: 'compose-flow/dist', emptyOutDir: true, assetsInlineLimit: 100_000_000, rollupOptions: { input: 'compose-flow.html' } },
})
