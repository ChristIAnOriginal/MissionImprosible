import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main/main.ts'),
      formats: ['cjs'],
      fileName: () => 'main.js',
    },
    outDir: resolve(__dirname, 'dist/main'),
    emptyOutDir: true,
    rollupOptions: {
      external: ['electron', 'path', 'fs', 'os', 'url'],
      output: {
        format: 'cjs',
        entryFileNames: 'main.js',
      },
    },
    minify: false,
    sourcemap: true,
  },
  resolve: {
    conditions: ['node'],
  },
})
