import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { readFileSync } from 'fs'

const { version } = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))

/**
 * Versión web (GitHub Pages): las dos páginas en un solo build, con rutas
 * relativas para que funcione bajo cualquier subruta. Resultado en dist-web/:
 *   control/     panel de control
 *   projection/  pantalla de proyección
 *   data/        audios, imágenes y JSON (los copia scripts/build-web.mjs)
 * Se compila con --mode web: las entradas instalan entonces src/web/install.ts.
 */
export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, 'src/renderer'),
  base: './',
  publicDir: false,
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: {
    outDir: resolve(__dirname, 'dist-web'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        control: resolve(__dirname, 'src/renderer/control/index.html'),
        projection: resolve(__dirname, 'src/renderer/projection/index.html'),
      },
    },
  },
})
