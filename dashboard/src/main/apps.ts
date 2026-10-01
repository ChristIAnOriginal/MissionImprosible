/**
 * Descubrimiento y ciclo de vida de las apps del workspace.
 *
 * Una "app" es cualquier carpeta hermana de `dashboard/` que contenga
 * `app.manifest.json` (o, en su defecto, un `package.json`). El dashboard
 * nunca importa código de las apps: las arranca como procesos externos,
 * usando el .exe portable si existe o el comando de desarrollo si no.
 */
import { spawn, ChildProcess } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import type {
  AppCommand,
  AppManifest,
  AppStatus,
  DashboardApp,
  LaunchMode,
  LogLine,
  TaskKind,
} from '../shared/types'

const IGNORED_DIRS = new Set(['dashboard', 'node_modules', 'build', 'dist', 'release', 'out'])
const MAX_LOG_LINES = 400

/** Info estática leída del disco en cada refresh. */
interface Discovered {
  id: string
  dir: string
  name: string
  description: string
  accent: string
  icon: string | null
  hasManifest: boolean
  hasDeps: boolean
  dev: AppCommand | null
  build: AppCommand | null
  pkg: AppCommand | null
  portablePath: string | null
}

/** Estado vivo de una app: proceso, tarea en curso y logs. */
interface Runtime {
  status: AppStatus
  mode: LaunchMode | null
  task: TaskKind | null
  child: ChildProcess | null
  taskChild: ChildProcess | null
  lastError: string | null
  logs: LogLine[]
}

let workspaceRoot = process.cwd()
let discovered: Discovered[] = []
const runtimes = new Map<string, Runtime>()

let onChange: () => void = () => {}
let onLog: (line: LogLine) => void = () => {}

export function initApps(
  root: string,
  hooks: { onChange: () => void; onLog: (line: LogLine) => void }
) {
  workspaceRoot = root
  onChange = hooks.onChange
  onLog = hooks.onLog
  refresh()
}

export function getWorkspaceRoot() {
  return workspaceRoot
}

// ----- Descubrimiento ----------------------------------------------------

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T
  } catch {
    return null
  }
}

function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '??'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

/** Busca el .exe más reciente dentro de las carpetas candidatas de salida. */
function findPortable(dir: string, portableDir?: string): string | null {
  const candidates = portableDir ? [portableDir] : ['release', 'dist-electron', 'out']
  let best: { file: string; mtime: number } | null = null
  for (const rel of candidates) {
    const abs = path.join(dir, rel)
    if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) continue
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.exe')) continue
      const file = path.join(abs, entry.name)
      const mtime = fs.statSync(file).mtimeMs
      if (!best || mtime > best.mtime) best = { file, mtime }
    }
  }
  return best ? best.file : null
}

/** Convierte un script de package.json en un AppCommand npm. */
function npmScript(scripts: Record<string, string> | undefined, name: string): AppCommand | null {
  return scripts && scripts[name] ? { command: 'npm', args: ['run', name] } : null
}

function discoverOne(dir: string, folder: string): Discovered | null {
  const manifest = readJson<AppManifest>(path.join(dir, 'app.manifest.json'))
  const pkg = readJson<{ name?: string; description?: string; scripts?: Record<string, string> }>(
    path.join(dir, 'package.json')
  )
  if (!manifest && !pkg) return null

  const scripts = pkg?.scripts
  const name = manifest?.name ?? pkg?.name ?? folder
  const iconRel = manifest?.icon ?? null
  const iconAbs = iconRel ? path.join(dir, iconRel) : null

  return {
    id: manifest?.id ?? folder,
    dir,
    name,
    description: manifest?.description ?? pkg?.description ?? '',
    accent: manifest?.accent ?? '#6366f1',
    icon: iconAbs && fs.existsSync(iconAbs) ? iconAbs : null,
    hasManifest: manifest !== null,
    hasDeps: fs.existsSync(path.join(dir, 'node_modules')),
    dev: manifest?.dev ?? npmScript(scripts, 'start') ?? npmScript(scripts, 'dev'),
    build: manifest?.build ?? npmScript(scripts, 'build'),
    pkg: manifest?.package ?? npmScript(scripts, 'package:portable') ?? npmScript(scripts, 'package'),
    portablePath: findPortable(dir, manifest?.portableDir),
  }
}

export function refresh() {
  const found: Discovered[] = []
  let entries: fs.Dirent[] = []
  try {
    entries = fs.readdirSync(workspaceRoot, { withFileTypes: true })
  } catch {
    entries = []
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (entry.name.startsWith('.') || IGNORED_DIRS.has(entry.name)) continue
    const app = discoverOne(path.join(workspaceRoot, entry.name), entry.name)
    if (app) found.push(app)
  }
  found.sort((a, b) => a.name.localeCompare(b.name, 'es'))
  discovered = found
  for (const app of found) if (!runtimes.has(app.id)) runtimes.set(app.id, freshRuntime())
  onChange()
}

function freshRuntime(): Runtime {
  return {
    status: 'stopped',
    mode: null,
    task: null,
    child: null,
    taskChild: null,
    lastError: null,
    logs: [],
  }
}

function runtimeOf(id: string): Runtime {
  let r = runtimes.get(id)
  if (!r) {
    r = freshRuntime()
    runtimes.set(id, r)
  }
  return r
}

// ----- Vista para el renderer -------------------------------------------

function toLocalFileUrl(abs: string) {
  return 'localfile:///' + encodeURI(abs.replace(/\\/g, '/'))
}

export function listApps(): DashboardApp[] {
  return discovered.map(app => {
    const r = runtimeOf(app.id)
    return {
      id: app.id,
      name: app.name,
      description: app.description,
      accent: app.accent,
      dir: app.dir,
      iconUrl: app.icon ? toLocalFileUrl(app.icon) : null,
      initials: initialsOf(app.name),
      hasManifest: app.hasManifest,
      hasDeps: app.hasDeps,
      hasDev: app.dev !== null,
      hasBuild: app.build !== null,
      hasPackage: app.pkg !== null,
      portablePath: app.portablePath,
      status: r.status,
      mode: r.mode,
      task: r.task,
      lastError: r.lastError,
    }
  })
}

export function getLogs(id: string): LogLine[] {
  return runtimeOf(id).logs
}

export function clearLogs(id: string) {
  runtimeOf(id).logs = []
  onChange()
}

function log(id: string, stream: LogLine['stream'], text: string) {
  const r = runtimeOf(id)
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trimEnd()
    if (!line) continue
    const entry: LogLine = { appId: id, stream, text: line, ts: Date.now() }
    r.logs.push(entry)
    onLog(entry)
  }
  if (r.logs.length > MAX_LOG_LINES) r.logs.splice(0, r.logs.length - MAX_LOG_LINES)
}

// ----- Arranque y parada -------------------------------------------------

/**
 * Con `shell: true`, pasar los argumentos por separado hace que Node los
 * concatene sin escapar (DEP0190). Montamos la linea nosotros y la mandamos
 * como un unico comando.
 */
function spawnShell(cwd: string, cmd: AppCommand): ChildProcess {
  const line = [cmd.command, ...cmd.args].join(' ')
  return spawn(line, { cwd, shell: true, windowsHide: true })
}

function pipeInto(id: string, child: ChildProcess) {
  child.stdout?.on('data', (d: Buffer) => log(id, 'stdout', d.toString()))
  child.stderr?.on('data', (d: Buffer) => log(id, 'stderr', d.toString()))
}

export function launch(id: string, mode: LaunchMode) {
  const app = discovered.find(a => a.id === id)
  if (!app) return
  const r = runtimeOf(id)
  if (r.child) {
    log(id, 'system', 'Ya está en ejecución.')
    return
  }

  let child: ChildProcess
  if (mode === 'portable') {
    if (!app.portablePath) {
      fail(id, 'No hay ejecutable portable. Compilá la app primero.')
      return
    }
    log(id, 'system', `Abriendo ${path.basename(app.portablePath)}`)
    child = spawn(app.portablePath, [], { cwd: app.dir, windowsHide: false })
  } else {
    if (!app.dev) {
      fail(id, 'La app no define un comando de desarrollo.')
      return
    }
    if (!app.hasDeps) {
      fail(id, 'Faltan dependencias: ejecutá npm install en la carpeta de la app.')
      return
    }
    log(id, 'system', `> ${app.dev.command} ${app.dev.args.join(' ')}`)
    child = spawnShell(app.dir, app.dev)
  }

  r.child = child
  r.mode = mode
  r.status = 'starting'
  r.lastError = null
  onChange()

  pipeInto(id, child)
  child.on('spawn', () => {
    r.status = 'running'
    onChange()
  })
  child.on('error', err => {
    r.child = null
    fail(id, err.message)
  })
  child.on('exit', code => {
    r.child = null
    r.mode = null
    r.status = code ? 'error' : 'stopped'
    r.lastError = code ? `El proceso terminó con código ${code}.` : null
    log(id, 'system', `Proceso finalizado (código ${code ?? 0}).`)
    onChange()
  })
}

function fail(id: string, message: string) {
  const r = runtimeOf(id)
  r.status = 'error'
  r.mode = null
  r.lastError = message
  log(id, 'system', message)
  onChange()
}

/** En Windows, `shell: true` crea un cmd.exe intermedio: hay que matar el árbol. */
function killTree(child: ChildProcess) {
  if (!child.pid) return
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true })
  } else {
    child.kill('SIGTERM')
  }
}

export function stop(id: string) {
  const r = runtimeOf(id)
  if (!r.child) return
  log(id, 'system', 'Deteniendo…')
  killTree(r.child)
}

export function stopAll() {
  for (const r of runtimes.values()) {
    if (r.child) killTree(r.child)
    if (r.taskChild) killTree(r.taskChild)
  }
}

// ----- Tareas (build / package) ------------------------------------------

export function runTask(id: string, task: TaskKind) {
  const app = discovered.find(a => a.id === id)
  if (!app) return
  const r = runtimeOf(id)
  if (r.taskChild) {
    log(id, 'system', 'Ya hay una tarea en curso.')
    return
  }
  const cmd = task === 'build' ? app.build : app.pkg
  if (!cmd) {
    fail(id, `La app no define un comando de ${task}.`)
    return
  }
  if (!app.hasDeps) {
    fail(id, 'Faltan dependencias: ejecutá npm install en la carpeta de la app.')
    return
  }

  log(id, 'system', `> ${cmd.command} ${cmd.args.join(' ')}`)
  const child = spawnShell(app.dir, cmd)
  r.taskChild = child
  r.task = task
  r.lastError = null
  onChange()

  pipeInto(id, child)
  child.on('error', err => {
    r.taskChild = null
    r.task = null
    fail(id, err.message)
  })
  child.on('exit', code => {
    r.taskChild = null
    r.task = null
    if (code) {
      r.lastError = `La tarea ${task} falló (código ${code}).`
      r.status = 'error'
    }
    log(id, 'system', `Tarea ${task} finalizada (código ${code ?? 0}).`)
    // El build puede haber creado el .exe portable: releer el disco.
    refresh()
  })
}
