// Builds the Not sent and Resend demo (notsent.html) on its own, into notsent/dist, so tools/lock.mjs can pack it:
//   npx vite build -c vite.notsent.config.ts && node tools/lock.mjs <pw> <out.html> teams/notsent "<title>"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { outDir: 'notsent/dist', emptyOutDir: true, assetsInlineLimit: 100_000_000, rollupOptions: { input: 'notsent.html' } },
})
