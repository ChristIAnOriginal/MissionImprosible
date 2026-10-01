/**
 * Única fuente de verdad de los canales IPC de DejaVu.
 * Send: renderer -> main. Invoke: request/response. Broadcast: main -> renderers.
 */
import type { DisplayInfo, TimerSettings, TimerTick } from './types'

// ----- Send: renderer -> main -------------------------------------------

export interface SendMap {
  'state:get': void
  'timer:start': void
  'timer:pause': void
  'timer:reset': void
  'timer:rewind': void
  'timer:settings': Partial<TimerSettings>
  'display:set': number
  'projection:close': void
}

export type SendChannel = keyof SendMap

// ----- Invoke: renderer -> main -----------------------------------------

export interface InvokeMap {
  'display:list': { request: void; response: DisplayInfo[] }
}

export type InvokeChannel = keyof InvokeMap

// ----- Broadcast: main -> renderers --------------------------------------

export interface BroadcastMap {
  /** Alta frecuencia: sólo lo que cambia con el reloj. */
  'timer:tick': TimerTick
  /** Baja frecuencia: la configuración completa. */
  'timer:settings': TimerSettings
  /** La proyección está abierta o no (para el panel). */
  'projection:state': { open: boolean; displayId: number | null }
}

export type BroadcastChannel = keyof BroadcastMap

// ----- Helpers: renderer side --------------------------------------------

type IpcRendererLike = {
  send: (channel: string, ...args: unknown[]) => void
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
  on: (channel: string, listener: (event: unknown, ...args: unknown[]) => void) => void
  removeAllListeners: (channel: string) => void
}

export function sendIpc<C extends SendChannel>(
  ipc: IpcRendererLike,
  channel: C,
  ...args: SendMap[C] extends void ? [] : [payload: SendMap[C]]
): void {
  ipc.send(channel, ...(args as unknown[]))
}

export function invokeIpc<C extends InvokeChannel>(
  ipc: IpcRendererLike,
  channel: C,
  ...args: InvokeMap[C]['request'] extends void ? [] : [payload: InvokeMap[C]['request']]
): Promise<InvokeMap[C]['response']> {
  return ipc.invoke(channel, ...(args as unknown[])) as Promise<InvokeMap[C]['response']>
}

export function onBroadcast<C extends BroadcastChannel>(
  ipc: IpcRendererLike,
  channel: C,
  handler: (payload: BroadcastMap[C]) => void
): () => void {
  ipc.on(channel, (_e, payload) => handler(payload as BroadcastMap[C]))
  return () => ipc.removeAllListeners(channel)
}

// ----- Helpers: main side ------------------------------------------------

type IpcMainLike = {
  on: (channel: string, listener: (event: unknown, ...args: unknown[]) => void) => void
  handle: (
    channel: string,
    listener: (event: unknown, ...args: unknown[]) => unknown | Promise<unknown>
  ) => void
}

type WebContentsLike = { send: (channel: string, ...args: unknown[]) => void }
type BrowserWindowLike = { webContents: WebContentsLike } | null

export function handleSend<C extends SendChannel>(
  ipc: IpcMainLike,
  channel: C,
  handler: (payload: SendMap[C]) => void
): void {
  ipc.on(channel, (_e, payload) => handler(payload as SendMap[C]))
}

export function handleInvoke<C extends InvokeChannel>(
  ipc: IpcMainLike,
  channel: C,
  handler: (
    payload: InvokeMap[C]['request']
  ) => InvokeMap[C]['response'] | Promise<InvokeMap[C]['response']>
): void {
  ipc.handle(channel, (_e, payload) => handler(payload as InvokeMap[C]['request']))
}

export function broadcastIpc<C extends BroadcastChannel>(
  windows: BrowserWindowLike[],
  channel: C,
  ...args: BroadcastMap[C] extends void ? [] : [payload: BroadcastMap[C]]
): void {
  const payload = args[0]
  for (const w of windows) {
    if (w) w.webContents.send(channel, payload)
  }
}
