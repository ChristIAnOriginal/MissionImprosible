import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, 'src/renderer/control'),
  base: './',
  build: { outDir: resolve(__dirname, 'dist/renderer/control'), emptyOutDir: true },
})
