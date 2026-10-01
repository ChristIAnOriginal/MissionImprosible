import { contextBridge, ipcRenderer } from 'electron'
import type { DashboardApp, LaunchMode, LogLine, TaskKind } from '../shared/types'
import { sendIpc, invokeIpc, onBroadcast } from '../shared/ipc'

/**
 * Fachada `window.dashboardAPI` expuesta al renderer del dashboard.
 * Es una capa fina sobre los helpers tipados de `../shared/ipc.ts`.
 */
contextBridge.exposeInMainWorld('dashboardAPI', {
  listApps: (): Promise<DashboardApp[]> => invokeIpc(ipcRenderer, 'apps:list'),
  onAppsUpdate: (cb: (apps: DashboardApp[]) => void) => onBroadcast(ipcRenderer, 'apps:update', cb),

  refresh: () => sendIpc(ipcRenderer, 'apps:refresh'),
  launch: (id: string, mode: LaunchMode) => sendIpc(ipcRenderer, 'apps:launch', { id, mode }),
  stop: (id: string) => sendIpc(ipcRenderer, 'apps:stop', { id }),
  runTask: (id: string, task: TaskKind) => sendIpc(ipcRenderer, 'apps:task', { id, task }),

  getLogs: (id: string): Promise<LogLine[]> => invokeIpc(ipcRenderer, 'apps:logs', id),
  clearLogs: (id: string) => sendIpc(ipcRenderer, 'apps:logs-clear', { id }),
  onLog: (cb: (line: LogLine) => void) => onBroadcast(ipcRenderer, 'apps:log', cb),

  openFolder: (id: string): Promise<void> => invokeIpc(ipcRenderer, 'apps:open-folder', id),
  openWorkspaceRoot: (): Promise<void> => invokeIpc(ipcRenderer, 'workspace:open-root'),
})
