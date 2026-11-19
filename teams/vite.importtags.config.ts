// Builds the batch import tag-editing study (importtags.html) on its own, into importtags/dist, so tools/lock.mjs can pack it:
//   npx vite build -c vite.importtags.config.ts && node tools/lock.mjs <pw> <out.html> teams/importtags "<title>"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { outDir: 'importtags/dist', emptyOutDir: true, assetsInlineLimit: 100_000_000, rollupOptions: { input: 'importtags.html' } },
})
