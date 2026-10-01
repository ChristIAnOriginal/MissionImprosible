/**
 * Single source of truth for all IPC channels between main and renderers.
 *
 * Three categories:
 *  - Send: renderer -> main, fire-and-forget (ipcRenderer.send / ipcMain.on).
 *  - Invoke: renderer -> main, request/response (ipcRenderer.invoke / ipcMain.handle).
 *  - Broadcast: main -> renderers, fire-and-forget (webContents.send / ipcRenderer.on).
 *
 * Renaming a channel here breaks compilation everywhere it's used. That is the point.
 */
import type {
  AppState,
  Participant,
  MissionData,
  ObjectiveData,
  ChallengeData,
  CinematicData,
  CinematicAudioData,
} from './types'

// ----- Send: renderer -> main, fire-and-forget ---------------------------

export interface SendMap {
  'state:get': void
  'appstate:update': Partial<AppState>
  'participant:score': { id: string; delta: number }
  'participant:score-set': { id: string; value: number }
  'participant:update': Participant
  'display:set': number
  'window:close-projection': void
  'objective:announce': { name: string }
  'mission:announce': { name: string }
  'rating:show': Record<string, string>
  'rating:clear': void
  'roulette:start': { winnerIndex: number; challenges: string[]; skipAnimation?: boolean }
  'improsible:start': { finalistIds: [string, string] }
  'improsible:final-start': { winnerId: string }
  'improsible:clear': void
  'intro:start': void
  'intro:stop': void
}

export type SendChannel = keyof SendMap

// ----- Invoke: renderer -> main, request/response ------------------------

export interface InvokeMap {
  'file:select-photo': { request: string; response: string | null }
  'display:list': {
    request: void
    response: {
      id: number
      label: string
      bounds: { x: number; y: number; width: number; height: number }
      isPrimary: boolean
    }[]
  }
  'data:get-missions': { request: void; response: MissionData[] }
  'data:save-missions': { request: MissionData[]; response: void }
  'data:get-objectives': { request: void; response: ObjectiveData[] }
  'data:save-objectives': { request: ObjectiveData[]; response: void }
  'data:get-challenges': { request: void; response: ChallengeData[] }
  'data:save-challenges': { request: ChallengeData[]; response: void }
  'data:get-sounds': { request: void; response: Record<string, string | null> }
  'data:get-cinematics': { request: void; response: CinematicData[] }
  'data:save-cinematics': { request: CinematicData[]; response: void }
  'data:get-cinematic-audios': { request: void; response: CinematicAudioData[] }
  'data:save-cinematic-audios': { request: CinematicAudioData[]; response: void }
  'data:get-logo-path': { request: void; response: string | null }
  'data:get-svg-logo-path': { request: void; response: string }
  'data:get-svg-logo-orange-path': { request: void; response: string }
  'data:get-svg-logo-content': { request: void; response: string }
  'data:get-svg-logo-orange-content': { request: void; response: string }
  'file:select-logo': { request: void; response: string | null }
  'file:select-audio': { request: void; response: string | null }
  'file:select-video': { request: void; response: string | null }
  'file:delete': { request: string | null; response: boolean }
}

export type InvokeChannel = keyof InvokeMap

// ----- Broadcast: main -> renderers, fire-and-forget ---------------------

export interface BroadcastMap {
  'state:update': AppState
  'objective:announce': { name: string }
  'mission:announce': { name: string }
  'rating:show': Record<string, string>
  'rating:clear': void
  'roulette:start': { winnerIndex: number; challenges: string[]; skipAnimation?: boolean }
  'improsible:start': { finalistIds: [string, string]; audioPath: string | null }
  'improsible:final-start': { winnerId: string }
  'improsible:clear': void
  'intro:start': { audioPath: string | null }
  'intro:stop': void
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

/**
 * Like handleSend but exposes the sender so the handler can reply
 * directly to the requester (used for 'state:get' which replies with
 * a 'state:update' only to the window that asked).
 */
export function handleSendWithSender<C extends SendChannel>(
  ipc: IpcMainLike,
  channel: C,
  handler: (sender: WebContentsLike, payload: SendMap[C]) => void
): void {
  ipc.on(channel, (event, payload) => {
    const sender = (event as { sender: WebContentsLike }).sender
    handler(sender, payload as SendMap[C])
  })
}

export function sendToRenderer<C extends BroadcastChannel>(
  sender: WebContentsLike,
  channel: C,
  ...args: BroadcastMap[C] extends void ? [] : [payload: BroadcastMap[C]]
): void {
  sender.send(channel, args[0])
}

export function handleInvoke<C extends InvokeChannel>(
  ipc: IpcMainLike,
  channel: C,
  handler: (payload: InvokeMap[C]['request']) => InvokeMap[C]['response'] | Promise<InvokeMap[C]['response']>
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
