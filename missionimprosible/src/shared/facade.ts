/**
 * La forma de window.electronAPI, igual en Electron y en la web.
 *
 * Es una fachada sobre los helpers con tipos de `./ipc.ts`: los canales y sus
 * datos se comprueban ahí, así que renombrar un canal rompe la compilación. Lo
 * único que cambia entre plataformas es el transporte (`ipc`) y cómo una ruta de
 * archivo se convierte en URL.
 */
import type {
  AppState,
  Participant,
  MissionData,
  ObjectiveData,
  ChallengeData,
  CinematicData,
  CinematicAudioData,
  UpdateInfo,
  UpdateProgress,
} from './types'
import { sendIpc, invokeIpc, onBroadcast, type IpcRendererLike } from './ipc'

export interface Platform {
  kind: 'electron' | 'web'
  /** URL que el renderer puede cargar para una ruta de archivo o de datos. */
  fileUrl: (path: string | null) => string | null
}

/** Electron: rutas absolutas servidas por el protocolo localfile:// (main.ts). */
export function localFileUrl(absPath: string | null): string | null {
  if (!absPath) return null
  const normalized = absPath.replace(/\\/g, '/')
  const encoded = normalized.split('/').map((seg, i) =>
    i === 0 && /^[A-Za-z]:$/.test(seg) ? seg : encodeURIComponent(seg)
  ).join('/')
  return `localfile:///${encoded}`
}

export function createElectronAPI(ipc: IpcRendererLike, platform: Platform) {
  return {
    platform: platform.kind,
    fileUrl: platform.fileUrl,

    getState: () => sendIpc(ipc, 'state:get'),
    onStateUpdate: (cb: (state: AppState) => void) => onBroadcast(ipc, 'state:update', cb),

    updateScore: (id: string, delta: number) => sendIpc(ipc, 'participant:score', { id, delta }),
    setScore: (id: string, value: number) => sendIpc(ipc, 'participant:score-set', { id, value }),
    updateParticipant: (p: Participant) => sendIpc(ipc, 'participant:update', p),
    updateAppState: (update: Partial<AppState>) => sendIpc(ipc, 'appstate:update', update),

    selectPhoto: (participantId: string): Promise<string | null> =>
      invokeIpc(ipc, 'file:select-photo', participantId),

    listDisplays: () => invokeIpc(ipc, 'display:list'),
    setDisplay: (displayId: number) => sendIpc(ipc, 'display:set', displayId),

    announceObjective: (name: string) => sendIpc(ipc, 'objective:announce', { name }),
    onObjectiveAnnounce: (cb: (name: string) => void) =>
      onBroadcast(ipc, 'objective:announce', (p) => cb(p.name)),

    announceMission: (name: string) => sendIpc(ipc, 'mission:announce', { name }),
    onMissionAnnounce: (cb: (name: string) => void) =>
      onBroadcast(ipc, 'mission:announce', (p) => cb(p.name)),

    showRatings: (ratings: Record<string, string>) => sendIpc(ipc, 'rating:show', ratings),
    clearRatings: () => sendIpc(ipc, 'rating:clear'),
    onShowRatings: (cb: (ratings: Record<string, string>) => void) =>
      onBroadcast(ipc, 'rating:show', cb),
    onClearRatings: (cb: () => void) =>
      onBroadcast(ipc, 'rating:clear', () => cb()),

    startRoulette: (winnerIndex: number, challenges: string[], skipAnimation?: boolean) =>
      sendIpc(ipc, 'roulette:start', { winnerIndex, challenges, skipAnimation: !!skipAnimation }),
    onRouletteStart: (cb: (winnerIndex: number, challenges: string[], skipAnimation: boolean) => void) =>
      onBroadcast(ipc, 'roulette:start', ({ winnerIndex, challenges, skipAnimation }) =>
        cb(winnerIndex, challenges, !!skipAnimation)
      ),

    getMissions: (): Promise<MissionData[]> => invokeIpc(ipc, 'data:get-missions'),
    saveMissions: (missions: MissionData[]): Promise<void> => invokeIpc(ipc, 'data:save-missions', missions),
    getObjectives: (): Promise<ObjectiveData[]> => invokeIpc(ipc, 'data:get-objectives'),
    saveObjectives: (objectives: ObjectiveData[]): Promise<void> =>
      invokeIpc(ipc, 'data:save-objectives', objectives),
    getChallenges: (): Promise<ChallengeData[]> => invokeIpc(ipc, 'data:get-challenges'),
    saveChallenges: (challenges: ChallengeData[]): Promise<void> =>
      invokeIpc(ipc, 'data:save-challenges', challenges),
    getSounds: (): Promise<Record<string, string | null>> => invokeIpc(ipc, 'data:get-sounds'),
    getLogoPath: (): Promise<string | null> => invokeIpc(ipc, 'data:get-logo-path'),
    getSvgLogoPath: (): Promise<string> => invokeIpc(ipc, 'data:get-svg-logo-path'),
    getSvgLogoOrangePath: (): Promise<string> => invokeIpc(ipc, 'data:get-svg-logo-orange-path'),
    getSvgLogoContent: (): Promise<string> => invokeIpc(ipc, 'data:get-svg-logo-content'),
    getSvgLogoOrangeContent: (): Promise<string> => invokeIpc(ipc, 'data:get-svg-logo-orange-content'),
    selectLogo: (): Promise<string | null> => invokeIpc(ipc, 'file:select-logo'),
    getCinematics: (): Promise<CinematicData[]> => invokeIpc(ipc, 'data:get-cinematics'),
    saveCinematics: (cinematics: CinematicData[]): Promise<void> =>
      invokeIpc(ipc, 'data:save-cinematics', cinematics),
    getCinematicAudios: (): Promise<CinematicAudioData[]> => invokeIpc(ipc, 'data:get-cinematic-audios'),
    saveCinematicAudios: (audios: CinematicAudioData[]): Promise<void> =>
      invokeIpc(ipc, 'data:save-cinematic-audios', audios),
    selectAudio: (): Promise<string | null> => invokeIpc(ipc, 'file:select-audio'),
    selectVideo: (): Promise<string | null> => invokeIpc(ipc, 'file:select-video'),
    deleteFile: (storedPath: string | null): Promise<boolean> =>
      invokeIpc(ipc, 'file:delete', storedPath),
    closeProjection: () => sendIpc(ipc, 'window:close-projection'),

    startImprosible: (finalistIds: [string, string]) => sendIpc(ipc, 'improsible:start', { finalistIds }),
    onImprosibleStart: (cb: (finalistIds: [string, string], audioPath: string | null) => void) =>
      onBroadcast(ipc, 'improsible:start', (p) => cb(p.finalistIds, p.audioPath ?? null)),
    clearImprosible: () => sendIpc(ipc, 'improsible:clear'),
    onImprosibleClear: (cb: () => void) => onBroadcast(ipc, 'improsible:clear', () => cb()),

    startImprosibleFinal: (winnerId: string) => sendIpc(ipc, 'improsible:final-start', { winnerId }),
    onImprosibleFinalStart: (cb: (winnerId: string) => void) =>
      onBroadcast(ipc, 'improsible:final-start', (p) => cb(p.winnerId)),

    startIntro: () => sendIpc(ipc, 'intro:start'),
    onIntroStart: (cb: (audioPath: string | null) => void) =>
      onBroadcast(ipc, 'intro:start', (p) => cb(p.audioPath ?? null)),
    stopIntro: () => sendIpc(ipc, 'intro:stop'),
    onIntroStop: (cb: () => void) => onBroadcast(ipc, 'intro:stop', () => cb()),

    checkForUpdate: (): Promise<UpdateInfo> => invokeIpc(ipc, 'update:check'),
    installUpdate: () => sendIpc(ipc, 'update:install'),
    openReleasePage: () => sendIpc(ipc, 'update:open-page'),
    onUpdateProgress: (cb: (p: UpdateProgress) => void) => onBroadcast(ipc, 'update:progress', cb),
  }
}

export type ElectronAPI = ReturnType<typeof createElectronAPI>
