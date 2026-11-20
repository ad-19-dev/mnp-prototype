// Builds the audience-by-phone examples page (audphone.html) on its own, into audphone/dist, so tools/lock.mjs can pack it:
//   npx vite build -c vite.audphone.config.ts && node tools/lock.mjs <pw> <out.html> teams/audphone "<title>"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { outDir: 'audphone/dist', emptyOutDir: true, assetsInlineLimit: 100_000_000, rollupOptions: { input: 'audphone.html' } },
})
