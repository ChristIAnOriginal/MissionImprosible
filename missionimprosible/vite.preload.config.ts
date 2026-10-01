import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main/preload.ts'),
      formats: ['cjs'],
      fileName: () => 'preload.js',
    },
    outDir: resolve(__dirname, 'dist/main'),
    emptyOutDir: false,
    rollupOptions: {
      external: ['electron'],
      output: {
        format: 'cjs',
        entryFileNames: 'preload.js',
      },
    },
    minify: false,
  },
})
