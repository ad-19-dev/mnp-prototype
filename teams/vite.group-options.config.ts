// Builds the grouping options page for the one-record-per-channel list (group-options.html) into group-options/dist:
//   npx vite build -c vite.group-options.config.ts && node tools/lock.mjs <pw> <out.html> teams/group-options "<title>"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { outDir: 'group-options/dist', emptyOutDir: true, assetsInlineLimit: 100_000_000, rollupOptions: { input: 'group-options.html' } },
})
