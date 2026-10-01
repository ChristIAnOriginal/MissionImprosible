import type { Cue, DisplayInfo, Guion, Look, ParamValue, ShowState } from '../shared/types'

declare global {
  interface Window {
    hunaAPI: {
      requestState: () => void
      onState: (cb: (state: ShowState) => void) => () => void

      setActive: (id: string) => void
      setPlaying: (playing: boolean) => void
      setSpeed: (speed: number) => void
      restart: () => void
      setParam: (id: string, key: string, value: ParamValue) => void
      resetParams: (id: string) => void
      setCue: (cue: Partial<Cue>) => void
      playCue: () => void
      setLook: (look: Look) => void
      createGuion: (name: string) => void
      saveGuion: (guion: Guion) => void
      deleteGuion: (id: string) => void
      selectGuion: (id: string | null) => void
      startGuion: (step: number) => void
      nextGuion: () => void
      stopGuion: () => void
      savePreset: (sceneId: string, name: string) => void
      applyPreset: (sceneId: string, presetId: string) => void
      overwritePreset: (sceneId: string, presetId: string) => void
      renamePreset: (sceneId: string, presetId: string, name: string) => void
      deletePreset: (sceneId: string, presetId: string) => void
      cancelTransition: () => void

      listDisplays: () => Promise<DisplayInfo[]>
      openProjection: (displayId: number) => void
      closeProjection: () => void
      onProjectionState: (cb: (state: { open: boolean; displayId: number | null }) => void) => () => void
    }
  }
}

export {}
