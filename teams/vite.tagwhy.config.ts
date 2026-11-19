// Builds the batch import tag design and why page (tagwhy.html) on its own, into tagwhy/dist, so tools/lock.mjs can pack it:
//   npx vite build -c vite.tagwhy.config.ts && node tools/lock.mjs <pw> <out.html> teams/tagwhy "<title>"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { outDir: 'tagwhy/dist', emptyOutDir: true, assetsInlineLimit: 100_000_000, rollupOptions: { input: 'tagwhy.html' } },
})
