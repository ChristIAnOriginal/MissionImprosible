import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppState,
  Participant,
  MissionData,
  ObjectiveData,
  ChallengeData,
  CinematicData,
  CinematicAudioData,
} from '../shared/types'
import { sendIpc, invokeIpc, onBroadcast } from '../shared/ipc'

/**
 * The shape of window.electronAPI exposed to renderers.
 *
 * Implementation is a thin facade over the typed helpers in
 * `../shared/ipc.ts`. The facade shape is kept stable for the existing
 * renderer code; the underlying channels and payloads are enforced by
 * the discriminated union in ipc.ts so a channel rename fails the build.
 */

contextBridge.exposeInMainWorld('electronAPI', {
  getState: () => sendIpc(ipcRenderer, 'state:get'),
  onStateUpdate: (cb: (state: AppState) => void) => onBroadcast(ipcRenderer, 'state:update', cb),

  updateScore: (id: string, delta: number) => sendIpc(ipcRenderer, 'participant:score', { id, delta }),
  setScore: (id: string, value: number) => sendIpc(ipcRenderer, 'participant:score-set', { id, value }),
  updateParticipant: (p: Participant) => sendIpc(ipcRenderer, 'participant:update', p),
  updateAppState: (update: Partial<AppState>) => sendIpc(ipcRenderer, 'appstate:update', update),

  selectPhoto: (participantId: string): Promise<string | null> =>
    invokeIpc(ipcRenderer, 'file:select-photo', participantId),

  listDisplays: () => invokeIpc(ipcRenderer, 'display:list'),
  setDisplay: (displayId: number) => sendIpc(ipcRenderer, 'display:set', displayId),

  announceObjective: (name: string) => sendIpc(ipcRenderer, 'objective:announce', { name }),
  onObjectiveAnnounce: (cb: (name: string) => void) =>
    onBroadcast(ipcRenderer, 'objective:announce', (p) => cb(p.name)),

  announceMission: (name: string) => sendIpc(ipcRenderer, 'mission:announce', { name }),
  onMissionAnnounce: (cb: (name: string) => void) =>
    onBroadcast(ipcRenderer, 'mission:announce', (p) => cb(p.name)),

  showRatings: (ratings: Record<string, string>) => sendIpc(ipcRenderer, 'rating:show', ratings),
  clearRatings: () => sendIpc(ipcRenderer, 'rating:clear'),
  onShowRatings: (cb: (ratings: Record<string, string>) => void) =>
    onBroadcast(ipcRenderer, 'rating:show', cb),
  onClearRatings: (cb: () => void) =>
    onBroadcast(ipcRenderer, 'rating:clear', () => cb()),

  startRoulette: (winnerIndex: number, challenges: string[], skipAnimation?: boolean) =>
    sendIpc(ipcRenderer, 'roulette:start', { winnerIndex, challenges, skipAnimation: !!skipAnimation }),
  onRouletteStart: (cb: (winnerIndex: number, challenges: string[], skipAnimation: boolean) => void) =>
    onBroadcast(ipcRenderer, 'roulette:start', ({ winnerIndex, challenges, skipAnimation }) =>
      cb(winnerIndex, challenges, !!skipAnimation)
    ),

  getMissions: (): Promise<MissionData[]> => invokeIpc(ipcRenderer, 'data:get-missions'),
  saveMissions: (missions: MissionData[]): Promise<void> => invokeIpc(ipcRenderer, 'data:save-missions', missions),
  getObjectives: (): Promise<ObjectiveData[]> => invokeIpc(ipcRenderer, 'data:get-objectives'),
  saveObjectives: (objectives: ObjectiveData[]): Promise<void> =>
    invokeIpc(ipcRenderer, 'data:save-objectives', objectives),
  getChallenges: (): Promise<ChallengeData[]> => invokeIpc(ipcRenderer, 'data:get-challenges'),
  saveChallenges: (challenges: ChallengeData[]): Promise<void> =>
    invokeIpc(ipcRenderer, 'data:save-challenges', challenges),
  getSounds: (): Promise<Record<string, string | null>> => invokeIpc(ipcRenderer, 'data:get-sounds'),
  getLogoPath: (): Promise<string | null> => invokeIpc(ipcRenderer, 'data:get-logo-path'),
  getSvgLogoPath: (): Promise<string> => invokeIpc(ipcRenderer, 'data:get-svg-logo-path'),
  getSvgLogoOrangePath: (): Promise<string> => invokeIpc(ipcRenderer, 'data:get-svg-logo-orange-path'),
  getSvgLogoContent: (): Promise<string> => invokeIpc(ipcRenderer, 'data:get-svg-logo-content'),
  getSvgLogoOrangeContent: (): Promise<string> => invokeIpc(ipcRenderer, 'data:get-svg-logo-orange-content'),
  selectLogo: (): Promise<string | null> => invokeIpc(ipcRenderer, 'file:select-logo'),
  getCinematics: (): Promise<CinematicData[]> => invokeIpc(ipcRenderer, 'data:get-cinematics'),
  saveCinematics: (cinematics: CinematicData[]): Promise<void> =>
    invokeIpc(ipcRenderer, 'data:save-cinematics', cinematics),
  getCinematicAudios: (): Promise<CinematicAudioData[]> => invokeIpc(ipcRenderer, 'data:get-cinematic-audios'),
  saveCinematicAudios: (audios: CinematicAudioData[]): Promise<void> =>
    invokeIpc(ipcRenderer, 'data:save-cinematic-audios', audios),
  selectAudio: (): Promise<string | null> => invokeIpc(ipcRenderer, 'file:select-audio'),
  selectVideo: (): Promise<string | null> => invokeIpc(ipcRenderer, 'file:select-video'),
  deleteFile: (storedPath: string | null): Promise<boolean> =>
    invokeIpc(ipcRenderer, 'file:delete', storedPath),
  closeProjection: () => sendIpc(ipcRenderer, 'window:close-projection'),

  startImprosible: (finalistIds: [string, string]) => sendIpc(ipcRenderer, 'improsible:start', { finalistIds }),
  onImprosibleStart: (cb: (finalistIds: [string, string], audioPath: string | null) => void) =>
    onBroadcast(ipcRenderer, 'improsible:start', (p) => cb(p.finalistIds, p.audioPath ?? null)),
  clearImprosible: () => sendIpc(ipcRenderer, 'improsible:clear'),
  onImprosibleClear: (cb: () => void) => onBroadcast(ipcRenderer, 'improsible:clear', () => cb()),

  startImprosibleFinal: (winnerId: string) => sendIpc(ipcRenderer, 'improsible:final-start', { winnerId }),
  onImprosibleFinalStart: (cb: (winnerId: string) => void) =>
    onBroadcast(ipcRenderer, 'improsible:final-start', (p) => cb(p.winnerId)),
})
