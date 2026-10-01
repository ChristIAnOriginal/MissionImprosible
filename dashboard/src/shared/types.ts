/** Cómo se arranca una app: su ejecutable portable ya compilado, o su comando de desarrollo. */
export type LaunchMode = 'portable' | 'dev'

export type AppStatus = 'stopped' | 'starting' | 'running' | 'error'

/** Tarea larga que el dashboard puede lanzar sobre una app sin abrirla. */
export type TaskKind = 'build' | 'package'

export interface AppCommand {
  command: string
  args: string[]
}

/**
 * Contenido de `app.manifest.json` en la raíz de cada app.
 * Todos los campos salvo `name` son opcionales: si falta el manifiesto,
 * el dashboard sintetiza uno a partir del package.json de la carpeta.
 */
export interface AppManifest {
  id?: string
  name: string
  description?: string
  /** Ruta relativa a la carpeta de la app. */
  icon?: string
  /** Color de acento de la isla en el dashboard. */
  accent?: string
  dev?: AppCommand
  build?: AppCommand
  package?: AppCommand
  /** Carpeta (relativa) donde electron-builder deja el .exe portable. */
  portableDir?: string
}

/** Una app descubierta, tal y como la ve el renderer. */
export interface DashboardApp {
  id: string
  name: string
  description: string
  accent: string
  /** Ruta absoluta de la carpeta de la app. */
  dir: string
  /** URL localfile:// del icono, o null si la app no tiene. */
  iconUrl: string | null
  /** Iniciales para el placeholder cuando no hay icono. */
  initials: string
  hasManifest: boolean
  hasDeps: boolean
  hasDev: boolean
  hasBuild: boolean
  hasPackage: boolean
  portablePath: string | null
  status: AppStatus
  mode: LaunchMode | null
  task: TaskKind | null
  lastError: string | null
}

export interface LogLine {
  appId: string
  stream: 'stdout' | 'stderr' | 'system'
  text: string
  ts: number
}
