import type { DisplayInfo, TimerSettings, TimerTick } from '../shared/types'

declare global {
  interface Window {
    dejavuAPI: {
      requestState: () => void
      onTick: (cb: (tick: TimerTick) => void) => () => void
      onSettings: (cb: (settings: TimerSettings) => void) => () => void

      start: () => void
      pause: () => void
      reset: () => void
      rewind: () => void
      updateSettings: (patch: Partial<TimerSettings>) => void

      listDisplays: () => Promise<DisplayInfo[]>
      openProjection: (displayId: number) => void
      closeProjection: () => void
      onProjectionState: (cb: (state: { open: boolean; displayId: number | null }) => void) => () => void
    }
  }
}

export {}
