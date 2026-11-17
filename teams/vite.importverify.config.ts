// Builds the batch import comparison (verify on Add) (importverify.html) on its own, into importverify/dist, so tools/lock.mjs can pack it:
//   npx vite build -c vite.importverify.config.ts && node tools/lock.mjs <pw> <out.html> teams/importverify "<title>"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { outDir: 'importverify/dist', emptyOutDir: true, assetsInlineLimit: 100_000_000, rollupOptions: { input: 'importverify.html' } },
})
