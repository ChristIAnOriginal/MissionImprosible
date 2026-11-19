/**
 * Actualización desde GitHub Releases.
 *
 * `checkForUpdate` compara la versión en curso con la última release publicada.
 * `installUpdate` descarga el .exe nuevo junto al actual y lanza un PowerShell
 * oculto que espera a que la app se cierre, reemplaza el ejecutable y lo abre.
 * Sólo funciona desde el .exe portable: electron-builder define entonces
 * PORTABLE_EXECUTABLE_FILE con la ruta del ejecutable que lanzó la app.
 */
import { app, net, shell } from 'electron'
import { spawn } from 'child_process'
import { createHash } from 'crypto'
import * as fs from 'fs'
import type { UpdateInfo, UpdateProgress } from '../shared/types'
import { compareVersions, latestRelease, type GithubRelease, type Release } from './version'

const REPO = 'ChristIAnOriginal/MissionImprosible'
const RELEASES_URL = `https://api.github.com/repos/${REPO}/releases?per_page=30`
const HEADERS = { Accept: 'application/vnd.github+json', 'User-Agent': 'MisionImprosible-actualizador' }

let found: Release | null = null

function portableExe(): string | null {
  return process.env.PORTABLE_EXECUTABLE_FILE || null
}

export async function checkForUpdate(): Promise<UpdateInfo> {
  const current = app.getVersion()
  const canInstall = portableExe() !== null
  try {
    const res = await net.fetch(RELEASES_URL, { headers: HEADERS })
    if (!res.ok) throw new Error(`GitHub respondió ${res.status}`)
    found = latestRelease((await res.json()) as GithubRelease[])
    const latest = found?.version ?? null
    return {
      current,
      latest,
      available: latest !== null && compareVersions(latest, current) > 0,
      canInstall,
      notes: found?.notes ?? '',
    }
  } catch (e) {
    return { current, latest: null, available: false, canInstall, notes: '', error: (e as Error).message }
  }
}

export function openReleasePage() {
  shell.openExternal(found?.pageUrl ?? `https://github.com/${REPO}/releases`)
}

async function download(release: Release, dest: string, progress: (p: UpdateProgress) => void) {
  const res = await net.fetch(release.exe.browser_download_url, { headers: { 'User-Agent': HEADERS['User-Agent'] } })
  if (!res.ok || !res.body) throw new Error(`La descarga falló (${res.status})`)
  const total = release.exe.size
  const hash = createHash('sha256')
  const out = fs.createWriteStream(dest)
  let received = 0
  let lastSent = 0
  const reader = res.body.getReader()
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      hash.update(value)
      received += value.length
      if (!out.write(value)) await new Promise(r => out.once('drain', r))
      if (received - lastSent > total / 100 || received === total) {
        lastSent = received
        progress({ phase: 'descargando', received, total })
      }
    }
  } finally {
    await new Promise<void>((resolve, reject) => out.end((err?: Error | null) => (err ? reject(err) : resolve())))
  }
  if (received !== total) throw new Error(`Descarga incompleta (${received} de ${total} bytes)`)
  const expected = release.exe.digest?.replace(/^sha256:/, '')
  if (expected && hash.digest('hex') !== expected) throw new Error('El archivo descargado no coincide con el publicado')
}

/** Cadena entre comillas simples para PowerShell. */
const psQuote = (s: string) => `'${s.replace(/'/g, "''")}'`

/**
 * Espera a que el .exe quede libre (el lanzador portable lo bloquea hasta que la
 * app termina), lo reemplaza y abre la versión nueva. Va codificado en base64:
 * así las rutas con tildes llegan intactas.
 */
function scheduleSwap(downloaded: string, target: string) {
  const script = [
    `$new = ${psQuote(downloaded)}`,
    `$target = ${psQuote(target)}`,
    'for ($i = 0; $i -lt 120; $i++) {',
    '  try { Move-Item -LiteralPath $new -Destination $target -Force -ErrorAction Stop; Start-Process -FilePath $target; exit 0 }',
    '  catch { Start-Sleep -Milliseconds 500 }',
    '}',
    'exit 1',
  ].join('\n')
  const encoded = Buffer.from(script, 'utf16le').toString('base64')
  // Sin -WindowStyle Hidden: desacoplado no tiene consola y ese parámetro lo hace
  // fallar al arrancar. windowsHide ya evita la ventana.
  const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  })
  child.unref()
}

export async function installUpdate(progress: (p: UpdateProgress) => void) {
  const target = portableExe()
  const release = found
  try {
    if (!target) throw new Error('La actualización automática sólo funciona desde el .exe portable')
    if (!release || compareVersions(release.version, app.getVersion()) <= 0) throw new Error('No hay una versión más nueva')
    const dest = `${target}.descarga`
    try {
      await download(release, dest, progress)
    } catch (e) {
      fs.rmSync(dest, { force: true })
      throw e
    }
    progress({ phase: 'instalando', received: release.exe.size, total: release.exe.size })
    scheduleSwap(dest, target)
    // Margen para que el aviso llegue al panel antes de cerrar.
    setTimeout(() => app.quit(), 600)
  } catch (e) {
    progress({ phase: 'error', received: 0, total: 0, message: (e as Error).message })
  }
}
