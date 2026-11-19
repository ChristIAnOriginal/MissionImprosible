export interface Participant {
  id: string
  name: string
  score: number
  photoPath: string | null
  eliminated?: boolean
}

export interface MissionView {
  active: boolean
  name: string
  teamImpro: string[]
  teamSible: string[]
  allPlay?: boolean
}

export type MissionAssignmentMap = Record<string, 'impro' | 'sible' | 'none'>

export interface MissionPreload {
  allPlay: boolean
  assignments: MissionAssignmentMap
}

export interface AppState {
  title: string
  subtitle: string
  role: string
  date: string
  participants: Participant[]
  visibleParticipants: number
  missionView: MissionView | null
  volume: number
  overlayOpacity: number
  curtain?: boolean
  activeCinematic?: string | null
  activeCinematicName?: string | null
  activeCinematicAudio?: string | null
  activeCinematicAudioName?: string | null
  logoVersion?: number
  rouletteTickBase?: number
  rouletteTickRange?: number
  curtainFlipEnabled?: boolean
  curtainFlipDuration?: number
  curtainPulseEnabled?: boolean
  curtainPulseDuration?: number
  curtainPulseColor?: string
  curtainLogoColor?: 'white' | 'orange'
  curtainWobbleEnabled?: boolean
  curtainWobbleDuration?: number
  missionPreloads?: Record<string, MissionPreload>
  improsibleFinalists?: [string, string] | null
  improsibleWinner?: string | null
  improsibleWinnerLabel?: string
  improsibleWinnerSublabel?: string
  improsibleWinnerColor?: string
  ratingDuration?: number
  ratingAutoClear?: boolean
  /** Texto del punto señalado en el mapa de la intro (parámetro reemplazable). */
  introLocationText?: string
  /** Ajustes manuales del guion de la intro: clave del cue → segundo. */
  introTimings?: Record<string, number>
  /** Disparo especial activo: se muestra como etiqueta en una esquina de la proyección. */
  specialShot?: string | null
}

export interface MissionData {
  id: number
  name: string
  audioPath: string | null
}

export interface ObjectiveData {
  id: number
  name: string
  points: number
  description: string
  audioPath: string | null
}

export interface ChallengeData {
  name: string
  audioPath: string | null
}

export interface CinematicData {
  name: string
  videoPath: string | null
}

export interface CinematicAudioData {
  name: string
  audioPath: string | null
}

/** Resultado de comparar la versión en curso con la última publicada en GitHub. */
export interface UpdateInfo {
  current: string
  /** Null si no hay releases o no se pudo consultar. */
  latest: string | null
  available: boolean
  /** Sólo el .exe portable puede reemplazarse a sí mismo. */
  canInstall: boolean
  notes: string
  error?: string
}

export interface UpdateProgress {
  phase: 'descargando' | 'instalando' | 'error'
  received: number
  total: number
  message?: string
}
