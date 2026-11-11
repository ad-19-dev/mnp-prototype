// Builds the per-recipient delivery details proposals (sendlog.html) on its own, into sendlog/dist, so tools/lock.mjs can pack it:
//   npx vite build -c vite.sendlog.config.ts && node tools/lock.mjs <pw> <out.html> teams/sendlog "<title>"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { outDir: 'sendlog/dist', emptyOutDir: true, assetsInlineLimit: 100_000_000, rollupOptions: { input: 'sendlog.html' } },
})
