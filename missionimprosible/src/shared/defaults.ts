/**
 * Estado inicial y ajustes persistidos. Lo comparten el proceso principal de
 * Electron y la versión web (src/web/hub.ts), para que ambos arranquen igual.
 */
import type { AppState, MissionPreload, Participant } from './types'

/** Lo que se guarda de cada agente: su nombre y su foto (los puntos no). */
export type Agent = Pick<Participant, 'id' | 'name' | 'photoPath'>

const DEFAULT_AGENTS: Agent[] = ['1', '2', '3', '4'].map(id => ({ id, name: `Participante ${id}`, photoPath: null }))

/** Campos de AppState que sobreviven a un reinicio. */
export interface Settings {
  volume: number
  overlayOpacity: number
  rouletteTickBase: number
  rouletteTickRange: number
  curtainFlipEnabled: boolean
  curtainFlipDuration: number
  curtainPulseEnabled: boolean
  curtainPulseDuration: number
  curtainPulseColor: string
  curtainLogoColor: 'white' | 'orange'
  curtainWobbleEnabled: boolean
  curtainWobbleDuration: number
  missionPreloads: Record<string, MissionPreload>
  ratingDuration: number
  ratingAutoClear: boolean
  improsibleWinnerLabel: string
  improsibleWinnerSublabel: string
  improsibleWinnerColor: string
  introLocationText: string
  introTimings: Record<string, number>
  visibleParticipants: number
  agents: Agent[]
}

export const SETTINGS_DEFAULTS: Settings = {
  volume: 100,
  overlayOpacity: 80,
  rouletteTickBase: 180,
  rouletteTickRange: 520,
  curtainFlipEnabled: true,
  curtainFlipDuration: 10,
  curtainPulseEnabled: true,
  curtainPulseDuration: 5,
  curtainPulseColor: '#ff5500',
  curtainLogoColor: 'white',
  curtainWobbleEnabled: false,
  curtainWobbleDuration: 0.35,
  missionPreloads: {},
  ratingDuration: 5,
  ratingAutoClear: true,
  improsibleWinnerLabel: '¡GANADOR!',
  improsibleWinnerSublabel: 'MEJOR AGENTE',
  improsibleWinnerColor: '#f97316',
  introLocationText: 'Ubicación clasificada',
  introTimings: {},
  visibleParticipants: 4,
  agents: DEFAULT_AGENTS,
}

/** Ajustes que se copian tal cual de AppState (los agentes salen de `participants`). */
type StateSetting = Exclude<keyof Settings, 'agents'>
const STATE_SETTINGS = Object.keys(SETTINGS_DEFAULTS).filter(k => k !== 'agents') as StateSetting[]

/** Campos de AppState cuyo cambio obliga a guardar los ajustes. */
export const PERSISTED_KEYS: (keyof AppState)[] = [...STATE_SETTINGS, 'participants']

/** Los ajustes que hay que guardar, a partir del estado en curso. */
export function settingsFrom(state: AppState): Settings {
  const out = { ...SETTINGS_DEFAULTS } as Record<keyof Settings, unknown>
  for (const k of STATE_SETTINGS) out[k] = state[k] ?? SETTINGS_DEFAULTS[k]
  out.agents = state.participants.map(({ id, name, photoPath }) => ({ id, name, photoPath }))
  return out as Settings
}

/** Agentes guardados; si el archivo no trae una lista válida, los de fábrica. */
function agentsFrom(saved: unknown): Agent[] {
  if (!Array.isArray(saved) || saved.length === 0) return DEFAULT_AGENTS
  return saved.map((a, i) => ({
    id: typeof a?.id === 'string' ? a.id : String(i + 1),
    name: typeof a?.name === 'string' ? a.name : `Participante ${i + 1}`,
    photoPath: typeof a?.photoPath === 'string' ? a.photoPath : null,
  }))
}

export function initialAppState({ agents, ...settings }: Settings): AppState {
  const participants = agentsFrom(agents).map(a => ({ ...a, score: 0 }))
  return {
    title: 'MISIÓN IMPROSIBLE',
    subtitle: 'Evaluación de desempeño para el cargo de',
    role: 'Director',
    date: new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, ' - '),
    participants,
    missionView: null,
    ...settings,
    curtain: true,
  }
}

/** Audio de la final de Misión Improsible, relativo a la carpeta de datos. */
export const FINAL_AUDIO = 'audio/misiones/M_Final.wav'
