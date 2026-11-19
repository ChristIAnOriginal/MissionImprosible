/**
 * Versión web: instala `window.electronAPI` antes de montar React.
 *
 * Hace de proceso principal con un BroadcastChannel entre las ventanas del mismo
 * navegador. El panel de control es el dueño del estado (hub.ts); la proyección
 * le manda sus mensajes y recibe el estado y los eventos. Las peticiones de datos
 * las resuelve cada ventana por su cuenta (backend.ts), porque comparten origen
 * y por tanto IndexedDB.
 */
import { createElectronAPI } from '../shared/facade'
import type { IpcRendererLike } from '../shared/ipc'
import { createBackend } from './backend'
import { persistStorage } from './db'
import { fileUrl, loadUserFile, loadUserFiles } from './files'
import { createHub, type Hub } from './hub'
import './web.css'

type Role = 'control' | 'projection'
type Listener = (event: unknown, ...args: unknown[]) => void

type Message =
  | { kind: 'event'; channel: string; payload: unknown }
  | { kind: 'send'; channel: string; payload: unknown }
  | { kind: 'file'; id: string }
  | { kind: 'close' }

export async function installWebApi(role: Role) {
  persistStorage()
  await loadUserFiles()

  const bus = new BroadcastChannel('mision-improsible')
  const post = (m: Message) => bus.postMessage(m)
  const listeners = new Map<string, Set<Listener>>()
  // Copia: en Electron cada mensaje llega serializado, y React sólo repinta si el objeto cambia.
  const deliver = (channel: string, payload: unknown) =>
    listeners.get(channel)?.forEach(l => l(null, payload === undefined ? undefined : structuredClone(payload)))

  let hub: Hub | null = null
  const emit = (channel: string, payload: unknown) => {
    deliver(channel, payload)
    post({ kind: 'event', channel, payload })
  }
  if (role === 'control') {
    hub = await createHub(emit as never)
    window.addEventListener('beforeunload', () => post({ kind: 'close' }))
  }

  const backend = createBackend({
    setParticipantPhoto: (id, path) => hub?.setParticipantPhoto(id, path),
    bumpLogo: () => hub?.bumpLogo(),
    fileChanged: id => post({ kind: 'file', id }),
  })

  bus.onmessage = async (e: MessageEvent<Message>) => {
    const m = e.data
    if (m.kind === 'event') deliver(m.channel, m.payload)
    else if (m.kind === 'send') hub?.send(m.channel as never, m.payload as never)
    else if (m.kind === 'file') await loadUserFile(m.id)
    else if (m.kind === 'close' && role === 'projection') window.close()
  }

  const ipc: IpcRendererLike = {
    send: (channel, payload) => {
      if (hub) hub.send(channel as never, payload as never)
      else post({ kind: 'send', channel, payload })
    },
    invoke: async (channel, payload) => (backend as Record<string, (p: unknown) => unknown>)[channel](payload),
    on: (channel, listener) => {
      if (!listeners.has(channel)) listeners.set(channel, new Set())
      listeners.get(channel)!.add(listener)
    },
    removeAllListeners: channel => listeners.delete(channel),
  }

  window.electronAPI = createElectronAPI(ipc, { kind: 'web', fileUrl })
  if (role === 'projection') showStartOverlay()
}

/**
 * El navegador no deja sonar audio ni pasar a pantalla completa sin un clic en
 * esa misma ventana: la proyección arranca con un aviso que lo pide.
 */
function showStartOverlay() {
  const overlay = document.createElement('button')
  overlay.className = 'web-start'
  overlay.innerHTML = '<strong>MISIÓN IMPROSIBLE</strong><span>Haz clic aquí para activar el sonido y la pantalla completa</span>'
  overlay.onclick = () => {
    document.documentElement.requestFullscreen?.().catch(() => undefined)
    overlay.remove()
  }
  document.body.appendChild(overlay)
}
