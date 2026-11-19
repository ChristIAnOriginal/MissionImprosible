/**
 * Pantallas y ventana de proyección en el navegador.
 *
 * Chrome y Edge exponen los monitores con la Window Management API (el navegador
 * pide permiso una vez); con ella la ventana de proyección se abre directamente
 * en el monitor elegido. Sin ella sólo se conoce la pantalla actual y la ventana
 * hay que arrastrarla.
 */
import type { InvokeMap } from '../shared/ipc'

type Display = InvokeMap['display:list']['response'][number]

interface ScreenDetailed {
  left: number
  top: number
  width: number
  height: number
  isPrimary: boolean
  label?: string
}

declare global {
  interface Window {
    getScreenDetails?: () => Promise<{ screens: ScreenDetailed[] }>
  }
}

const PROJECTION_URL = new URL('../projection/', document.baseURI).href
const WINDOW_NAME = 'mision-improsible-proyeccion'

let displays: Display[] = []
let projection: Window | null = null

export async function listDisplays(): Promise<Display[]> {
  try {
    if (window.getScreenDetails) {
      const { screens } = await window.getScreenDetails()
      displays = screens.map((s, i) => ({
        id: i,
        label: `${s.label || `Pantalla ${i + 1}`} · ${s.width}x${s.height}`,
        bounds: { x: s.left, y: s.top, width: s.width, height: s.height },
        isPrimary: s.isPrimary,
      }))
      return displays
    }
  } catch {
    // Permiso denegado: sólo la pantalla actual.
  }
  const s = window.screen
  displays = [{ id: 0, label: `Esta pantalla · ${s.width}x${s.height}`, bounds: { x: 0, y: 0, width: s.width, height: s.height }, isPrimary: true }]
  return displays
}

/** Debe llamarse dentro del clic: el navegador sólo abre ventanas con un gesto. */
export function openProjection(displayId: number) {
  const b = displays.find(d => d.id === displayId)?.bounds
  const features = b ? `popup,left=${b.x},top=${b.y},width=${b.width},height=${b.height}` : 'popup,width=1280,height=720'
  projection = window.open(PROJECTION_URL, WINDOW_NAME, features)
  projection?.focus()
}

export function closeProjection() {
  projection?.close()
  projection = null
}
