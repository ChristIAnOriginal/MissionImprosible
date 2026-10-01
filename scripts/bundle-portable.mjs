/**
 * Ensambla la distribución portable: el .exe de Falso Vacío Hub con las apps
 * ya compiladas al lado, en la forma exacta que el hub espera descubrir.
 *
 *   dist-portable/FalsoVacioHub/
 *   ├── FalsoVacioHub.exe
 *   ├── missionimprosible/
 *   │   ├── app.manifest.json      (versión recortada: sólo modo ejecutable)
 *   │   ├── release/Mision Improsible 2.0.3.exe
 *   │   └── src/data/img/logo.png  (el icono, en su ruta relativa original)
 *   └── dejavu/
 *       └── …
 *
 * Requiere que `npm run package:all` haya dejado los .exe en cada `release/`.
 * Uso: node scripts/bundle-portable.mjs [--zip]
 */
import { execFileSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outRoot = path.join(root, 'dist-portable')
const bundleName = 'FalsoVacioHub'
const bundleDir = path.join(outRoot, bundleName)

/** Campos que sobreviven al recorte: en el bundle no hay código fuente que compilar. */
const RUNTIME_MANIFEST_KEYS = ['id', 'name', 'description', 'icon', 'accent', 'portableDir']

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'))
}

/** El .exe más reciente dentro de una carpeta. */
function newestExe(dir) {
  if (!fs.existsSync(dir)) return null
  const exes = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(e => e.isFile() && e.name.toLowerCase().endsWith('.exe'))
    .map(e => {
      const file = path.join(dir, e.name)
      return { file, mtime: fs.statSync(file).mtimeMs }
    })
    .sort((a, b) => b.mtime - a.mtime)
  return exes[0]?.file ?? null
}

function copyInto(src, destDir, destName = path.basename(src)) {
  fs.mkdirSync(destDir, { recursive: true })
  fs.copyFileSync(src, path.join(destDir, destName))
  return path.join(destDir, destName)
}

function mb(file) {
  return (fs.statSync(file).size / 1024 / 1024).toFixed(1) + ' MB'
}

// ----- Apps ---------------------------------------------------------------

function discoverApps() {
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter(e => e.isDirectory() && !e.name.startsWith('.') && e.name !== 'dashboard')
    .map(e => path.join(root, e.name))
    .filter(dir => fs.existsSync(path.join(dir, 'app.manifest.json')))
    .map(dir => ({ dir, manifest: readJson(path.join(dir, 'app.manifest.json')) }))
}

function bundleApp({ dir, manifest }) {
  const folder = path.basename(dir)
  const portableDir = manifest.portableDir ?? 'release'
  const exe = newestExe(path.join(dir, portableDir))
  if (!exe) {
    return { folder, ok: false, reason: `sin .exe en ${portableDir}/ — ¿corriste npm run package:all?` }
  }

  const destDir = path.join(bundleDir, folder)
  copyInto(exe, path.join(destDir, portableDir))

  // El icono viaja en su misma ruta relativa para que el manifiesto siga siendo válido.
  if (manifest.icon) {
    const iconSrc = path.join(dir, manifest.icon)
    if (fs.existsSync(iconSrc)) {
      copyInto(iconSrc, path.join(destDir, path.dirname(manifest.icon)))
    }
  }

  // Sin código fuente no hay dev/build/package: se recortan para no ofrecer botones muertos.
  const runtime = Object.fromEntries(
    RUNTIME_MANIFEST_KEYS.filter(k => manifest[k] !== undefined).map(k => [k, manifest[k]])
  )
  fs.writeFileSync(
    path.join(destDir, 'app.manifest.json'),
    JSON.stringify(runtime, null, 2) + '\n'
  )

  return { folder, ok: true, exe: path.basename(exe), size: mb(exe) }
}

// ----- Ensamblado ---------------------------------------------------------

const hubExe = newestExe(path.join(root, 'dashboard', 'release'))
if (!hubExe) {
  console.error('No hay .exe del hub en dashboard/release/. Corré primero: npm run package:all')
  process.exit(1)
}

fs.rmSync(bundleDir, { recursive: true, force: true })
fs.mkdirSync(bundleDir, { recursive: true })

const hubDest = copyInto(hubExe, bundleDir, `${bundleName}.exe`)
console.log(`hub   ${bundleName}.exe  ${mb(hubDest)}`)

const results = discoverApps().map(bundleApp)
for (const r of results) {
  console.log(r.ok ? `app   ${r.folder}/${r.exe}  ${r.size}` : `SALTADA  ${r.folder}: ${r.reason}`)
}

fs.writeFileSync(
  path.join(bundleDir, 'LEEME.txt'),
  [
    'Falso Vacio Hub - version portable',
    '',
    `Ejecuta ${bundleName}.exe. Las apps se descubren en las carpetas de al lado,`,
    'asi que hay que mantener esta carpeta junta: si mueves el .exe solo, no vera nada.',
    '',
    'Apps incluidas:',
    ...results.filter(r => r.ok).map(r => `  - ${r.folder}`),
    '',
    'No requiere instalacion ni permisos de administrador.',
  ].join('\r\n')
)

if (process.argv.includes('--zip')) {
  const zip = path.join(outRoot, `${bundleName}.zip`)
  fs.rmSync(zip, { force: true })
  execFileSync(
    'powershell',
    ['-NoProfile', '-Command', `Compress-Archive -Path '${bundleDir}' -DestinationPath '${zip}'`],
    { stdio: 'inherit' }
  )
  console.log(`zip   ${path.relative(root, zip)}  ${mb(zip)}`)
}

const failed = results.filter(r => !r.ok)
console.log(`\nListo: ${path.relative(root, bundleDir)}`)
if (failed.length) process.exitCode = 1
