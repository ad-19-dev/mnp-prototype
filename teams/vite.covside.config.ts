// Builds the "coverage on the right" demo (covside.html: the prototype with the src/lib/demo.ts switch on) into
// covside/dist, so tools/lock.mjs can pack it:
//   npx vite build -c vite.covside.config.ts && node tools/lock.mjs <pw> <out.html> teams/covside "<title>"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { outDir: 'covside/dist', emptyOutDir: true, assetsInlineLimit: 100_000_000, rollupOptions: { input: 'covside.html' } },
})
