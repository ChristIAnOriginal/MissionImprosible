/**
 * Única fuente de verdad de los canales IPC del dashboard.
 * Mismo patrón que el de las apps: Send (fire-and-forget), Invoke
 * (request/response) y Broadcast (main -> renderers).
 */
import type { DashboardApp, LaunchMode, LogLine, TaskKind } from './types'

// ----- Send: renderer -> main -------------------------------------------

export interface SendMap {
  'apps:refresh': void
  'apps:launch': { id: string; mode: LaunchMode }
  'apps:stop': { id: string }
  'apps:task': { id: string; task: TaskKind }
  'apps:logs-clear': { id: string }
}

export type SendChannel = keyof SendMap

// ----- Invoke: renderer -> main -----------------------------------------

export interface InvokeMap {
  'apps:list': { request: void; response: DashboardApp[] }
  'apps:logs': { request: string; response: LogLine[] }
  'apps:open-folder': { request: string; response: void }
  'workspace:open-root': { request: void; response: void }
}

export type InvokeChannel = keyof InvokeMap

// ----- Broadcast: main -> renderers --------------------------------------

export interface BroadcastMap {
  'apps:update': DashboardApp[]
  'apps:log': LogLine
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
