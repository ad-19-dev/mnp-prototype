// Builds the DS component map (dsmap.html) on its own, into dsmap/dist, so tools/lock.mjs can pack it:
//   npx vite build -c vite.dsmap.config.ts && node tools/lock.mjs <pw> <out.html> teams/dsmap "<title>"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { outDir: 'dsmap/dist', emptyOutDir: true, assetsInlineLimit: 100_000_000, rollupOptions: { input: 'dsmap.html' } },
})
