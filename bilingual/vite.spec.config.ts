// Builds the design-spec page (spec.html) on its own, into spec/dist, so tools/lock.mjs can pack it:
//   npx vite build -c vite.spec.config.ts && node tools/lock.mjs <pw> <out.html> bilingual/spec "<title>"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { outDir: 'spec/dist', emptyOutDir: true, rollupOptions: { input: 'spec.html' } },
})
