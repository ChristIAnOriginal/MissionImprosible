import { app, BrowserWindow, ipcMain, protocol, net, shell } from 'electron'
import { pathToFileURL } from 'url'
import * as path from 'path'

// Debe registrarse antes de que la app esté lista.
protocol.registerSchemesAsPrivileged([
  { scheme: 'localfile', privileges: { secure: true, supportFetchAPI: true, stream: true, bypassCSP: true } },
])

import {
  initApps,
  refresh,
  listApps,
  launch,
  stop,
  stopAll,
  runTask,
  getLogs,
  clearLogs,
  getWorkspaceRoot,
} from './apps'
import { handleSend, handleInvoke, broadcastIpc } from '../shared/ipc'

let dashboardWindow: BrowserWindow | null = null

/**
 * La raíz del workspace es la carpeta que contiene `dashboard/` y las apps.
 * En dev se deduce de la ruta del bundle; empaquetado, de la ubicación del
 * ejecutable portable. `APPS_ROOT` permite forzarla.
 */
function resolveWorkspaceRoot(): string {
  if (process.env.APPS_ROOT) return path.resolve(process.env.APPS_ROOT)
  if (app.isPackaged) {
    return process.env.PORTABLE_EXECUTABLE_DIR ?? path.dirname(process.execPath)
  }
  // dist/main/main.js -> dashboard/ -> raíz del workspace
  return path.resolve(__dirname, '../../..')
}

function createDashboardWindow() {
  dashboardWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 900,
    minHeight: 640,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'Falso Vacío Hub',
    backgroundColor: '#0b0b12',
  })
  const devUrl = process.env.DASHBOARD_DEV_URL
  if (devUrl) {
    dashboardWindow.loadURL(devUrl)
  } else {
    dashboardWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
  dashboardWindow.on('closed', () => {
    dashboardWindow = null
  })
}

app.whenReady().then(() => {
  protocol.handle('localfile', request => {
    const pathname = new URL(request.url).pathname
    const filePath = decodeURIComponent(pathname).replace(/^\/([A-Z]:)/i, '$1')
    return net.fetch(pathToFileURL(filePath).href, { headers: request.headers })
  })

  initApps(resolveWorkspaceRoot(), {
    onChange: () => broadcastIpc([dashboardWindow], 'apps:update', listApps()),
    onLog: line => broadcastIpc([dashboardWindow], 'apps:log', line),
  })

  createDashboardWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Ninguna app lanzada debe sobrevivir al dashboard.
app.on('before-quit', () => stopAll())

handleInvoke(ipcMain, 'apps:list', () => listApps())
handleInvoke(ipcMain, 'apps:logs', id => getLogs(id))
handleInvoke(ipcMain, 'workspace:open-root', () => {
  shell.openPath(getWorkspaceRoot())
})
handleInvoke(ipcMain, 'apps:open-folder', id => {
  const found = listApps().find(a => a.id === id)
  if (found) shell.openPath(found.dir)
})

handleSend(ipcMain, 'apps:refresh', () => refresh())
handleSend(ipcMain, 'apps:launch', ({ id, mode }) => launch(id, mode))
handleSend(ipcMain, 'apps:stop', ({ id }) => stop(id))
handleSend(ipcMain, 'apps:task', ({ id, task }) => runTask(id, task))
handleSend(ipcMain, 'apps:logs-clear', ({ id }) => clearLogs(id))
