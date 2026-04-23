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
import { AppState, Participant } from '../shared/types'
import { getMissions, saveMissions, getObjectives, saveObjectives, getChallenges, saveChallenges, getCinematics, saveCinematics, getCinematicAudios, saveCinematicAudios, getSounds, resolveAudioPath, getSettings, saveSettings, getSvgLogoPath, getSvgLogoOrangePath, deleteDataFile } from './store'
import { MissionData, ObjectiveData, ChallengeData, CinematicData, CinematicAudioData } from '../shared/types'

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

function broadcastState() {
  if (controlWindow) controlWindow.webContents.send('state:update', appState)
  if (projectionWindow) projectionWindow.webContents.send('state:update', appState)
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

ipcMain.on('state:get', (event) => { event.sender.send('state:update', appState) })
const PERSISTED_KEYS: (keyof AppState)[] = ['volume', 'overlayOpacity', 'rouletteTickBase', 'rouletteTickRange', 'curtainFlipEnabled', 'curtainFlipDuration', 'curtainPulseEnabled', 'curtainPulseDuration', 'curtainPulseColor', 'curtainLogoColor', 'curtainWobbleEnabled', 'curtainWobbleDuration', 'missionPreloads']

ipcMain.on('appstate:update', (_event, update: Partial<AppState>) => {
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

ipcMain.on('participant:score', (_event, { id, delta }: { id: string; delta: number }) => {
  const p = appState.participants.find(p => p.id === id)
  if (p) { p.score = p.score + delta; broadcastState() }
})
ipcMain.on('participant:score-set', (_event, { id, value }: { id: string; value: number }) => {
  const p = appState.participants.find(p => p.id === id)
  if (p) { p.score = value; broadcastState() }
})
ipcMain.on('participant:update', (_event, participant: Participant) => {
  const idx = appState.participants.findIndex(p => p.id === participant.id)
  if (idx !== -1) { appState.participants[idx] = participant; broadcastState() }
})

ipcMain.handle('file:select-photo', async (_event, participantId: string) => {
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

ipcMain.handle('display:list', () => {
  return screen.getAllDisplays().map(d => ({
    id: d.id,
    label: `${d.bounds.width}x${d.bounds.height} (${d.bounds.x},${d.bounds.y})`,
    bounds: d.bounds,
    isPrimary: d.id === screen.getPrimaryDisplay().id,
  }))
})
ipcMain.on('display:set', (_event, displayId: number) => { createProjectionWindow(displayId) })
ipcMain.on('window:close-projection', () => { if (projectionWindow) { projectionWindow.close(); projectionWindow = null } })

function broadcastToRenderers(channel: string, payload?: unknown) {
  if (projectionWindow) projectionWindow.webContents.send(channel, payload)
  if (controlWindow) controlWindow.webContents.send(channel, payload)
}

ipcMain.on('objective:announce', (_event, payload: { name: string }) => {
  broadcastToRenderers('objective:announce', payload)
})

ipcMain.on('mission:announce', (_event, payload: { name: string }) => {
  broadcastToRenderers('mission:announce', payload)
})

ipcMain.on('rating:show', (_event, ratings: Record<string, string>) => {
  broadcastToRenderers('rating:show', ratings)
})
ipcMain.on('rating:clear', () => {
  broadcastToRenderers('rating:clear')
})

ipcMain.on('roulette:start', (_event, payload: { winnerIndex: number; challenges: string[]; skipAnimation?: boolean }) => {
  broadcastToRenderers('roulette:start', payload)
})

ipcMain.on('improsible:start', (_event, payload: { finalistIds: [string, string] }) => {
  appState = { ...appState, improsibleFinalists: payload.finalistIds }
  const audioPath = resolveAudioPath('audio/misiones/M_Final.wav')
  broadcastToRenderers('improsible:start', { ...payload, audioPath })
})

ipcMain.on('improsible:final-start', (_event, payload: { winnerId: string }) => {
  appState = { ...appState, improsibleWinner: payload.winnerId }
  broadcastToRenderers('improsible:final-start', payload)
})

ipcMain.on('improsible:clear', () => {
  appState = { ...appState, improsibleFinalists: null, improsibleWinner: null }
  broadcastToRenderers('improsible:clear')
})

ipcMain.handle('data:get-missions', () => {
  const missions = getMissions()
  return missions.map(m => ({ ...m, audioPath: resolveAudioPath(m.audioPath) }))
})

ipcMain.handle('data:get-objectives', () => {
  return getObjectives()
})

ipcMain.handle('data:get-challenges', () => {
  const challenges = getChallenges()
  return challenges.map(c => ({ ...c, audioPath: resolveAudioPath(c.audioPath) }))
})

ipcMain.handle('data:get-sounds', () => {
  return getSounds()
})

ipcMain.handle('data:save-missions', (_event, missions: MissionData[]) => {
  saveMissions(missions)
})

ipcMain.handle('data:save-objectives', (_event, objectives: ObjectiveData[]) => {
  saveObjectives(objectives)
})

ipcMain.handle('data:save-challenges', (_event, challenges: ChallengeData[]) => {
  saveChallenges(challenges)
})

ipcMain.handle('data:get-cinematics', () => {
  const cinematics = getCinematics()
  return cinematics.map(c => ({ ...c, videoPath: resolveAudioPath(c.videoPath) }))
})
ipcMain.handle('data:save-cinematics', (_event, cinematics: CinematicData[]) => { saveCinematics(cinematics) })

ipcMain.handle('data:get-cinematic-audios', () => {
  const audios = getCinematicAudios()
  return audios.map(a => ({ ...a, audioPath: resolveAudioPath(a.audioPath) }))
})
ipcMain.handle('data:save-cinematic-audios', (_event, audios: CinematicAudioData[]) => { saveCinematicAudios(audios) })

ipcMain.handle('file:delete', (_event, storedPath: string | null) => deleteDataFile(storedPath))

ipcMain.handle('file:select-video', async () => {
  if (!controlWindow) return null
  const result = await dialog.showOpenDialog(controlWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Video MP4', extensions: ['mp4'] }],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

ipcMain.handle('data:get-logo-path', () => {
  return resolveAudioPath('img/logo.png')
})
ipcMain.handle('data:get-svg-logo-path', () => getSvgLogoPath())
ipcMain.handle('data:get-svg-logo-orange-path', () => getSvgLogoOrangePath())
ipcMain.handle('data:get-svg-logo-content', () => fs.readFileSync(getSvgLogoPath(), 'utf-8'))
ipcMain.handle('data:get-svg-logo-orange-content', () => fs.readFileSync(getSvgLogoOrangePath(), 'utf-8'))

ipcMain.handle('file:select-logo', async () => {
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

ipcMain.handle('file:select-audio', async () => {
  if (!controlWindow) return null
  const result = await dialog.showOpenDialog(controlWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Audio', extensions: ['mp3', 'mpeg', 'mp4', 'wav', 'ogg', 'aac', 'm4a'] }],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})
