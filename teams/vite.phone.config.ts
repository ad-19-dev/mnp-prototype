// Builds the phone-number de-duplication study (phone-dedupe.html) on its own, into phone/dist, so tools/lock.mjs can pack it:
//   npx vite build -c vite.phone.config.ts && node tools/lock.mjs <pw> <out.html> teams/phone "<title>"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { outDir: 'phone/dist', emptyOutDir: true, assetsInlineLimit: 100_000_000, rollupOptions: { input: 'phone-dedupe.html' } },
})
