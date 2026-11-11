// Builds the Delivery method proposals (delivery.html) on its own, into delivery/dist, so tools/lock.mjs can pack it:
//   npx vite build -c vite.delivery.config.ts && node tools/lock.mjs <pw> <out.html> teams/delivery "<title>"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { outDir: 'delivery/dist', emptyOutDir: true, assetsInlineLimit: 100_000_000, rollupOptions: { input: 'delivery.html' } },
})
