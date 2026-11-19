import type { ElectronAPI } from '../shared/facade'

declare global {
  interface Window {
    /**
     * Fachada sobre el IPC con tipos (ver `src/shared/facade.ts`). En Electron la
     * expone el preload; en la web, `src/web/install.ts`.
     */
    electronAPI: ElectronAPI
  }
}
