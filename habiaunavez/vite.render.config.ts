import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

/** Página de render de vídeos de ejemplo (ver `scripts/render/record.cjs`). */
export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, 'scripts/render'),
  base: './',
  build: { outDir: resolve(__dirname, 'dist/render'), emptyOutDir: true },
})
