// Builds the channel-reach design options page (options.html) on its own, into options/dist, so tools/lock.mjs can pack it:
//   npx vite build -c vite.options.config.ts && node tools/lock.mjs <pw> <out.html> bilingual/options "<title>"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { outDir: 'options/dist', emptyOutDir: true, rollupOptions: { input: 'options.html' } },
})
