import { contextBridge, ipcRenderer } from 'electron'
import type { DisplayInfo, TimerSettings, TimerTick } from '../shared/types'
import { sendIpc, invokeIpc, onBroadcast } from '../shared/ipc'

/** Fachada `window.dejavuAPI` compartida por el panel y la proyección. */
contextBridge.exposeInMainWorld('dejavuAPI', {
  requestState: () => sendIpc(ipcRenderer, 'state:get'),
  onTick: (cb: (tick: TimerTick) => void) => onBroadcast(ipcRenderer, 'timer:tick', cb),
  onSettings: (cb: (settings: TimerSettings) => void) => onBroadcast(ipcRenderer, 'timer:settings', cb),

  start: () => sendIpc(ipcRenderer, 'timer:start'),
  pause: () => sendIpc(ipcRenderer, 'timer:pause'),
  reset: () => sendIpc(ipcRenderer, 'timer:reset'),
  rewind: () => sendIpc(ipcRenderer, 'timer:rewind'),
  updateSettings: (patch: Partial<TimerSettings>) => sendIpc(ipcRenderer, 'timer:settings', patch),

  listDisplays: (): Promise<DisplayInfo[]> => invokeIpc(ipcRenderer, 'display:list'),
  openProjection: (displayId: number) => sendIpc(ipcRenderer, 'display:set', displayId),
  closeProjection: () => sendIpc(ipcRenderer, 'projection:close'),
  onProjectionState: (cb: (state: { open: boolean; displayId: number | null }) => void) =>
    onBroadcast(ipcRenderer, 'projection:state', cb),
})
