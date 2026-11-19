/**
 * Compila la versión web en dist-web/ y le añade lo que Vite no copia:
 *   data/        los datos de src/data (sin las carpetas user/, que son locales)
 *   index.html   redirige al panel de control
 *   .nojekyll    GitHub Pages sirve los archivos tal cual
 *
 *   npm run build:web
 */
import { spawnSync } from 'node:child_process'
import { cpSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'dist-web')

const vite = spawnSync('npx vite build --config vite.web.config.ts --mode web', { cwd: root, stdio: 'inherit', shell: true })
if (vite.status !== 0) process.exit(vite.status ?? 1)

cpSync(join(root, 'src', 'data'), join(out, 'data'), {
  recursive: true,
  filter: src => basename(src) !== 'user',
})
writeFileSync(
  join(out, 'index.html'),
  `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="0; url=control/" />
  <title>Misión Improsible</title>
</head>
<body><a href="control/">Abrir el panel de control</a></body>
</html>
`
)
writeFileSync(join(out, '.nojekyll'), '')
console.log('Versión web lista en', out)
