import { app, BrowserWindow, ipcMain, screen, dialog, protocol, net } from 'electron'
import { pathToFileURL } from 'url'
import * as path from 'path'
import * as fs from 'fs'

// Dev-only: auto-reload main process when bundle changes.
if (process.env.CONTROL_DEV_URL) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('electron-reload')(path.join(__dirname, '..'), {
      electron: path.join(__dirname, '..', '..', 'node_modules', '.bin', 'electron'),
    })
  } catch { /* ignore in prod */ }
}

// Must be called before app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'localfile', privileges: { secure: true, supportFetchAPI: true, stream: true, bypassCSP: true } },
])
import { AppState } from '../shared/types'
import {
  getMissions,
  saveMissions,
  getObjectives,
  saveObjectives,
  getChallenges,
  saveChallenges,
  getCinematics,
  saveCinematics,
  getCinematicAudios,
  saveCinematicAudios,
  getSounds,
  resolveAudioPath,
  getSettings,
  saveSettings,
  getSvgLogoPath,
  getSvgLogoOrangePath,
  deleteDataFile,
} from './store'
import { handleSend, handleSendWithSender, handleInvoke, broadcastIpc, sendToRenderer } from '../shared/ipc'

let controlWindow: BrowserWindow | null = null
let projectionWindow: BrowserWindow | null = null

const savedSettings = getSettings()
let appState: AppState = {
  title: 'MISIÓN IMPROSIBLE',
  subtitle: 'Evaluación de desempeño para el cargo de',
  role: 'Director',
  date: new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, ' - '),
  participants: [
    { id: '1', name: 'Participante 1', score: 0, photoPath: null },
    { id: '2', name: 'Participante 2', score: 0, photoPath: null },
    { id: '3', name: 'Participante 3', score: 0, photoPath: null },
    { id: '4', name: 'Participante 4', score: 0, photoPath: null },
  ],
  visibleParticipants: 4,
  missionView: null,
  volume: savedSettings.volume,
  overlayOpacity: savedSettings.overlayOpacity,
  rouletteTickBase: savedSettings.rouletteTickBase,
  rouletteTickRange: savedSettings.rouletteTickRange,
  curtainFlipEnabled: savedSettings.curtainFlipEnabled,
  curtainFlipDuration: savedSettings.curtainFlipDuration,
  curtainPulseEnabled: savedSettings.curtainPulseEnabled,
  curtainPulseDuration: savedSettings.curtainPulseDuration,
  curtainPulseColor: savedSettings.curtainPulseColor,
  curtainLogoColor: savedSettings.curtainLogoColor,
  curtainWobbleEnabled: savedSettings.curtainWobbleEnabled,
  curtainWobbleDuration: savedSettings.curtainWobbleDuration,
  missionPreloads: savedSettings.missionPreloads,
  curtain: true,
}

function createControlWindow() {
  controlWindow = new BrowserWindow({
    width: 1500,
    height: 960,
    minWidth: 1320,
    minHeight: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Panel de Control',
    backgroundColor: '#1a1a2e',
  })
  const devUrl = process.env.CONTROL_DEV_URL
  if (devUrl) {
    controlWindow.loadURL(devUrl)
  } else {
    const indexPath = path.join(__dirname, '../renderer/control/index.html')
    controlWindow.loadFile(indexPath)
  }
  controlWindow.on('closed', () => { controlWindow = null; app.quit() })
}

function createProjectionWindow(displayId?: number) {
  const displays = screen.getAllDisplays()
  let targetDisplay = displays[0]
  if (displayId !== undefined) {
    const found = displays.find(d => d.id === displayId)
    if (found) targetDisplay = found
  } else if (displays.length > 1) {
    targetDisplay = displays[1]
  }
  if (projectionWindow) {
    projectionWindow.removeAllListeners('closed')
    projectionWindow.destroy()
    projectionWindow = null
  }
  projectionWindow = new BrowserWindow({
    x: targetDisplay.bounds.x,
    y: targetDisplay.bounds.y,
    width: targetDisplay.bounds.width,
    height: targetDisplay.bounds.height,
    fullscreen: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Proyección',
    backgroundColor: '#111111',
  })
  const devUrl = process.env.PROJECTION_DEV_URL
  if (devUrl) {
    projectionWindow.loadURL(devUrl)
  } else {
    const indexPath = path.join(__dirname, '../renderer/projection/index.html')
    projectionWindow.loadFile(indexPath)
  }
  projectionWindow.once('ready-to-show', () => { broadcastState() })
  projectionWindow.on('closed', () => { projectionWindow = null })
}

function allWindows() {
  return [controlWindow, projectionWindow]
}

function broadcastState() {
  broadcastIpc(allWindows(), 'state:update', appState)
}

app.whenReady().then(() => {
  protocol.handle('localfile', (request) => {
    const pathname = new URL(request.url).pathname
    const filePath = decodeURIComponent(pathname).replace(/^\/([A-Z]:)/i, '$1')
    return net.fetch(pathToFileURL(filePath).href, { headers: request.headers })
  })
  createControlWindow()
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

// state:get replies directly to the requester, not a broadcast.
handleSendWithSender(ipcMain, 'state:get', (sender) => {
  sendToRenderer(sender, 'state:update', appState)
})

const PERSISTED_KEYS: (keyof AppState)[] = [
  'volume', 'overlayOpacity', 'rouletteTickBase', 'rouletteTickRange',
  'curtainFlipEnabled', 'curtainFlipDuration', 'curtainPulseEnabled',
  'curtainPulseDuration', 'curtainPulseColor', 'curtainLogoColor',
  'curtainWobbleEnabled', 'curtainWobbleDuration', 'missionPreloads',
]

handleSend(ipcMain, 'appstate:update', (update) => {
  appState = { ...appState, ...update }
  broadcastState()
  if (PERSISTED_KEYS.some(k => k in update)) {
    saveSettings({
      volume: appState.volume ?? 100,
      overlayOpacity: appState.overlayOpacity ?? 80,
      rouletteTickBase: appState.rouletteTickBase ?? 180,
      rouletteTickRange: appState.rouletteTickRange ?? 520,
      curtainFlipEnabled: appState.curtainFlipEnabled ?? true,
      curtainFlipDuration: appState.curtainFlipDuration ?? 10,
      curtainPulseEnabled: appState.curtainPulseEnabled ?? true,
      curtainPulseDuration: appState.curtainPulseDuration ?? 5,
      curtainPulseColor: appState.curtainPulseColor ?? '#ff5500',
      curtainLogoColor: appState.curtainLogoColor ?? 'white',
      curtainWobbleEnabled: appState.curtainWobbleEnabled ?? false,
      curtainWobbleDuration: appState.curtainWobbleDuration ?? 0.35,
      missionPreloads: appState.missionPreloads ?? {},
    })
  }
})

handleSend(ipcMain, 'participant:score', ({ id, delta }) => {
  const p = appState.participants.find(p => p.id === id)
  if (p) { p.score = p.score + delta; broadcastState() }
})

handleSend(ipcMain, 'participant:score-set', ({ id, value }) => {
  const p = appState.participants.find(p => p.id === id)
  if (p) { p.score = value; broadcastState() }
})

handleSend(ipcMain, 'participant:update', (participant) => {
  const idx = appState.participants.findIndex(p => p.id === participant.id)
  if (idx !== -1) { appState.participants[idx] = participant; broadcastState() }
})

handleInvoke(ipcMain, 'file:select-photo', async (participantId) => {
  if (!controlWindow) return null
  const result = await dialog.showOpenDialog(controlWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const filePath = result.filePaths[0]
  const p = appState.participants.find(p => p.id === participantId)
  if (p) { p.photoPath = filePath; broadcastState() }
  return filePath
})

handleInvoke(ipcMain, 'display:list', () => {
  return screen.getAllDisplays().map(d => ({
    id: d.id,
    label: `${d.bounds.width}x${d.bounds.height} (${d.bounds.x},${d.bounds.y})`,
    bounds: d.bounds,
    isPrimary: d.id === screen.getPrimaryDisplay().id,
  }))
})

handleSend(ipcMain, 'display:set', (displayId) => { createProjectionWindow(displayId) })
handleSend(ipcMain, 'window:close-projection', () => {
  if (projectionWindow) { projectionWindow.close(); projectionWindow = null }
})

handleSend(ipcMain, 'objective:announce', (payload) => {
  broadcastIpc(allWindows(), 'objective:announce', payload)
})

handleSend(ipcMain, 'mission:announce', (payload) => {
  broadcastIpc(allWindows(), 'mission:announce', payload)
})

handleSend(ipcMain, 'rating:show', (ratings) => {
  broadcastIpc(allWindows(), 'rating:show', ratings)
})

handleSend(ipcMain, 'rating:clear', () => {
  broadcastIpc(allWindows(), 'rating:clear')
})

handleSend(ipcMain, 'roulette:start', (payload) => {
  broadcastIpc(allWindows(), 'roulette:start', payload)
})

handleSend(ipcMain, 'improsible:start', (payload) => {
  appState = { ...appState, improsibleFinalists: payload.finalistIds }
  const audioPath = resolveAudioPath('audio/misiones/M_Final.wav')
  broadcastIpc(allWindows(), 'improsible:start', { finalistIds: payload.finalistIds, audioPath })
})

handleSend(ipcMain, 'improsible:final-start', (payload) => {
  appState = { ...appState, improsibleWinner: payload.winnerId }
  broadcastIpc(allWindows(), 'improsible:final-start', payload)
})

handleSend(ipcMain, 'improsible:clear', () => {
  appState = { ...appState, improsibleFinalists: null, improsibleWinner: null }
  broadcastIpc(allWindows(), 'improsible:clear')
})

handleInvoke(ipcMain, 'data:get-missions', () => {
  return getMissions().map(m => ({ ...m, audioPath: resolveAudioPath(m.audioPath) }))
})

handleInvoke(ipcMain, 'data:get-objectives', () => getObjectives())

handleInvoke(ipcMain, 'data:get-challenges', () => {
  return getChallenges().map(c => ({ ...c, audioPath: resolveAudioPath(c.audioPath) }))
})

handleInvoke(ipcMain, 'data:get-sounds', () => getSounds())

handleInvoke(ipcMain, 'data:save-missions', (missions) => { saveMissions(missions) })
handleInvoke(ipcMain, 'data:save-objectives', (objectives) => { saveObjectives(objectives) })
handleInvoke(ipcMain, 'data:save-challenges', (challenges) => { saveChallenges(challenges) })

handleInvoke(ipcMain, 'data:get-cinematics', () => {
  return getCinematics().map(c => ({ ...c, videoPath: resolveAudioPath(c.videoPath) }))
})
handleInvoke(ipcMain, 'data:save-cinematics', (cinematics) => { saveCinematics(cinematics) })

handleInvoke(ipcMain, 'data:get-cinematic-audios', () => {
  return getCinematicAudios().map(a => ({ ...a, audioPath: resolveAudioPath(a.audioPath) }))
})
handleInvoke(ipcMain, 'data:save-cinematic-audios', (audios) => { saveCinematicAudios(audios) })

handleInvoke(ipcMain, 'file:delete', (storedPath) => deleteDataFile(storedPath))

handleInvoke(ipcMain, 'file:select-video', async () => {
  if (!controlWindow) return null
  const result = await dialog.showOpenDialog(controlWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Video MP4', extensions: ['mp4'] }],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

handleInvoke(ipcMain, 'data:get-logo-path', () => resolveAudioPath('img/logo.png'))
handleInvoke(ipcMain, 'data:get-svg-logo-path', () => getSvgLogoPath())
handleInvoke(ipcMain, 'data:get-svg-logo-orange-path', () => getSvgLogoOrangePath())
handleInvoke(ipcMain, 'data:get-svg-logo-content', () => fs.readFileSync(getSvgLogoPath(), 'utf-8'))
handleInvoke(ipcMain, 'data:get-svg-logo-orange-content', () => fs.readFileSync(getSvgLogoOrangePath(), 'utf-8'))

handleInvoke(ipcMain, 'file:select-logo', async () => {
  if (!controlWindow) return null
  const result = await dialog.showOpenDialog(controlWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Imagen', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const src = result.filePaths[0]
  const dest = resolveAudioPath('img/logo.png')!
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.copyFileSync(src, dest)
  appState = { ...appState, logoVersion: (appState.logoVersion ?? 0) + 1 }
  broadcastState()
  return dest
})

handleInvoke(ipcMain, 'file:select-audio', async () => {
  if (!controlWindow) return null
  const result = await dialog.showOpenDialog(controlWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Audio', extensions: ['mp3', 'mpeg', 'mp4', 'wav', 'ogg', 'aac', 'm4a'] }],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})
