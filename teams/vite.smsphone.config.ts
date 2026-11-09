// Builds the "which phone gets the SMS" comparison (smsphone.html) on its own, into smsphone/dist, so tools/lock.mjs can pack it:
//   npx vite build -c vite.smsphone.config.ts && node tools/lock.mjs <pw> <out.html> teams/smsphone "<title>"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { outDir: 'smsphone/dist', emptyOutDir: true, assetsInlineLimit: 100_000_000, rollupOptions: { input: 'smsphone.html' } },
})
