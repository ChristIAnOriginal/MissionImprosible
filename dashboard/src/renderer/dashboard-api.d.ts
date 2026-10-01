import type { DashboardApp, LaunchMode, LogLine, TaskKind } from '../shared/types'

declare global {
  interface Window {
    dashboardAPI: {
      listApps: () => Promise<DashboardApp[]>
      onAppsUpdate: (cb: (apps: DashboardApp[]) => void) => () => void

      refresh: () => void
      launch: (id: string, mode: LaunchMode) => void
      stop: (id: string) => void
      runTask: (id: string, task: TaskKind) => void

      getLogs: (id: string) => Promise<LogLine[]>
      clearLogs: (id: string) => void
      onLog: (cb: (line: LogLine) => void) => () => void

      openFolder: (id: string) => Promise<void>
      openWorkspaceRoot: () => Promise<void>
    }
  }
}

export {}
