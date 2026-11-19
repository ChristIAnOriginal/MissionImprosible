/**
 * Estado inicial y ajustes persistidos. Lo comparten el proceso principal de
 * Electron y la versión web (src/web/hub.ts), para que ambos arranquen igual.
 */
import type { AppState, MissionPreload } from './types'

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
}

export const PERSISTED_KEYS = Object.keys(SETTINGS_DEFAULTS) as (keyof Settings)[]

/** Los ajustes que hay que guardar, a partir del estado en curso. */
export function settingsFrom(state: AppState): Settings {
  const out = { ...SETTINGS_DEFAULTS } as Record<keyof Settings, unknown>
  for (const k of PERSISTED_KEYS) out[k] = state[k] ?? SETTINGS_DEFAULTS[k]
  return out as Settings
}

export function initialAppState(settings: Settings): AppState {
  return {
    title: 'MISIÓN IMPROSIBLE',
    subtitle: 'Evaluación de desempeño para el cargo de',
    role: 'Director',
    date: new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, ' - '),
    participants: [
      { id: '1', name: 'Participante 1', score: 0, photoPath: null },
      { id: '2', name: 'Participante 2', score: 0, photoPath: null },
      { id: '3', name: 'Participante 3', score: 0, photoPath: null },
      { id: '4', name: 'Participante 4', score: 0, photoPath: null },
    ],
    visibleParticipants: 4,
    missionView: null,
    ...settings,
    curtain: true,
  }
}

/** Audio de la final de Misión Improsible, relativo a la carpeta de datos. */
export const FINAL_AUDIO = 'audio/misiones/M_Final.wav'
