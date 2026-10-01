import { app, BrowserWindow, ipcMain, screen } from 'electron'
import * as path from 'path'
import { loadSettings, saveSettings } from './store'
import {
  initTimer,
  start,
  pause,
  reset,
  rewind,
  updateSettings,
  snapshotTick,
  snapshotSettings,
  stopClock,
} from './timer'
import { handleSend, handleInvoke, broadcastIpc } from '../shared/ipc'

let controlWindow: BrowserWindow | null = null
let projectionWindow: BrowserWindow | null = null
let projectionDisplayId: number | null = null

function allWindows() {
  return [controlWindow, projectionWindow]
}

function createControlWindow() {
  controlWindow = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 920,
    minHeight: 640,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'DejaVu — Panel',
    backgroundColor: '#07090c',
  })
  controlWindow.loadFile(path.join(__dirname, '../renderer/control/index.html'))
  controlWindow.on('closed', () => {
    controlWindow = null
    app.quit()
  })
}

function createProjectionWindow(displayId?: number) {
  const displays = screen.getAllDisplays()
  let target = displays[0]
  if (displayId !== undefined) {
    const found = displays.find(d => d.id === displayId)
    if (found) target = found
  } else if (displays.length > 1) {
    target = displays[1]
  }

  if (projectionWindow) {
    projectionWindow.removeAllListeners('closed')
    projectionWindow.destroy()
    projectionWindow = null
  }

  projectionWindow = new BrowserWindow({
    x: target.bounds.x,
    y: target.bounds.y,
    width: target.bounds.width,
    height: target.bounds.height,
    fullscreen: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'DejaVu',
    backgroundColor: '#000000',
  })
  projectionDisplayId = target.id
  projectionWindow.loadFile(path.join(__dirname, '../renderer/projection/index.html'))
  projectionWindow.once('ready-to-show', () => broadcastAll())
  projectionWindow.on('closed', () => {
    projectionWindow = null
    projectionDisplayId = null
    broadcastProjectionState()
  })
  broadcastProjectionState()
}

function broadcastProjectionState() {
  broadcastIpc(allWindows(), 'projection:state', {
    open: projectionWindow !== null,
    displayId: projectionDisplayId,
  })
}

function broadcastAll() {
  broadcastIpc(allWindows(), 'timer:settings', snapshotSettings())
  broadcastIpc(allWindows(), 'timer:tick', snapshotTick())
  broadcastProjectionState()
}

app.whenReady().then(() => {
  initTimer(loadSettings(), {
    onTick: tick => broadcastIpc(allWindows(), 'timer:tick', tick),
    onSettings: s => broadcastIpc(allWindows(), 'timer:settings', s),
    onPersist: saveSettings,
  })
  createControlWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => stopClock())

handleSend(ipcMain, 'state:get', () => broadcastAll())
handleSend(ipcMain, 'timer:start', () => start())
handleSend(ipcMain, 'timer:pause', () => pause())
handleSend(ipcMain, 'timer:reset', () => reset())
handleSend(ipcMain, 'timer:rewind', () => rewind())
handleSend(ipcMain, 'timer:settings', patch => updateSettings(patch))

handleInvoke(ipcMain, 'display:list', () =>
  screen.getAllDisplays().map(d => ({
    id: d.id,
    label: `${d.bounds.width}×${d.bounds.height} (${d.bounds.x}, ${d.bounds.y})`,
    isPrimary: d.id === screen.getPrimaryDisplay().id,
  }))
)

handleSend(ipcMain, 'display:set', displayId => createProjectionWindow(displayId))
handleSend(ipcMain, 'projection:close', () => {
  if (projectionWindow) projectionWindow.close()
})
