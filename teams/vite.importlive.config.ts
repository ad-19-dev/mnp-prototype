// Builds the batch import proposals (importlive.html) on its own, into importlive/dist, so tools/lock.mjs can pack it:
//   npx vite build -c vite.importlive.config.ts && node tools/lock.mjs <pw> <out.html> teams/importlive "<title>"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { outDir: 'importlive/dist', emptyOutDir: true, assetsInlineLimit: 100_000_000, rollupOptions: { input: 'importlive.html' } },
})
