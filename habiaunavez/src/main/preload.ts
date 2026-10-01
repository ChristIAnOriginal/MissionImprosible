import { contextBridge, ipcRenderer } from 'electron'
import type { Cue, DisplayInfo, Guion, Look, ParamValue, ShowState } from '../shared/types'
import { sendIpc, invokeIpc, onBroadcast } from '../shared/ipc'

/** Fachada `window.hunaAPI`, compartida por el panel y la proyección. */
contextBridge.exposeInMainWorld('hunaAPI', {
  requestState: () => sendIpc(ipcRenderer, 'state:get'),
  onState: (cb: (state: ShowState) => void) => onBroadcast(ipcRenderer, 'show:state', cb),

  setActive: (id: string) => sendIpc(ipcRenderer, 'show:set-active', { id }),
  setPlaying: (playing: boolean) => sendIpc(ipcRenderer, 'show:set-playing', { playing }),
  setSpeed: (speed: number) => sendIpc(ipcRenderer, 'show:set-speed', { speed }),
  restart: () => sendIpc(ipcRenderer, 'show:restart'),
  setParam: (id: string, key: string, value: ParamValue) =>
    sendIpc(ipcRenderer, 'show:set-param', { id, key, value }),
  resetParams: (id: string) => sendIpc(ipcRenderer, 'show:reset-params', { id }),
  setCue: (cue: Partial<Cue>) => sendIpc(ipcRenderer, 'show:set-cue', cue),
  playCue: () => sendIpc(ipcRenderer, 'show:play-cue'),
  setLook: (look: Look) => sendIpc(ipcRenderer, 'show:set-look', { look }),
  createGuion: (name: string) => sendIpc(ipcRenderer, 'guion:create', { name }),
  saveGuion: (guion: Guion) => sendIpc(ipcRenderer, 'guion:save', { guion }),
  deleteGuion: (id: string) => sendIpc(ipcRenderer, 'guion:delete', { id }),
  selectGuion: (id: string | null) => sendIpc(ipcRenderer, 'guion:select', { id }),
  startGuion: (step: number) => sendIpc(ipcRenderer, 'guion:start', { step }),
  nextGuion: () => sendIpc(ipcRenderer, 'guion:next'),
  stopGuion: () => sendIpc(ipcRenderer, 'guion:stop'),
  savePreset: (sceneId: string, name: string) => sendIpc(ipcRenderer, 'preset:save', { sceneId, name }),
  applyPreset: (sceneId: string, presetId: string) => sendIpc(ipcRenderer, 'preset:apply', { sceneId, presetId }),
  overwritePreset: (sceneId: string, presetId: string) =>
    sendIpc(ipcRenderer, 'preset:overwrite', { sceneId, presetId }),
  renamePreset: (sceneId: string, presetId: string, name: string) =>
    sendIpc(ipcRenderer, 'preset:rename', { sceneId, presetId, name }),
  deletePreset: (sceneId: string, presetId: string) => sendIpc(ipcRenderer, 'preset:delete', { sceneId, presetId }),
  cancelTransition: () => sendIpc(ipcRenderer, 'show:cancel-transition'),

  listDisplays: (): Promise<DisplayInfo[]> => invokeIpc(ipcRenderer, 'display:list'),
  openProjection: (displayId: number) => sendIpc(ipcRenderer, 'display:set', displayId),
  closeProjection: () => sendIpc(ipcRenderer, 'projection:close'),
  onProjectionState: (cb: (state: { open: boolean; displayId: number | null }) => void) =>
    onBroadcast(ipcRenderer, 'projection:state', cb),
})
