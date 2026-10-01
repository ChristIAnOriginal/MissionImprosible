/**
 * `idle`      — parado en el tiempo inicial.
 * `running`   — contando hacia atrás.
 * `paused`    — congelado en un valor intermedio.
 * `rewinding` — el tiempo corre hacia adelante hasta volver al inicio.
 */
export type TimerPhase = 'idle' | 'running' | 'paused' | 'rewinding'

/** Lo que el usuario configura; se persiste entre sesiones. */
export interface TimerSettings {
  /** Duración de la cuenta atrás, en milisegundos. */
  durationMs: number
  /** Cuánto tarda el rebobinado en devolver el reloj al inicio, en milisegundos. */
  rewindMs: number
  /** Al terminar el rebobinado, ¿vuelve a arrancar la cuenta atrás? */
  loop: boolean
  /** Mostrar décimas de segundo. */
  showTenths: boolean
  /** Tamaño de los dígitos en proyección (1 = tamaño base). */
  digitScale: number
  /** Mostrar la línea "Punto de vista: …" sobre el reloj. */
  showViewpoint: boolean
  /** La parte editable de esa línea; vacía la oculta aunque esté activada. */
  viewpointText: string
  /** Teñir los dígitos al acercarse a cero. Independiente del latido. */
  alertTint: boolean
  /** Hacer latir los dígitos al acercarse a cero. Independiente del teñido. */
  alertPulse: boolean
  /** A cuánto del cero arrancan ambos avisos, en milisegundos. */
  alertAtMs: number
  /** Mostrar milisegundos en los últimos segundos (ver MILLIS_THRESHOLD_MS). */
  showMillis: boolean
}

/** Lo que cambia en cada tick. */
export interface TimerTick {
  phase: TimerPhase
  remainingMs: number
  /** Vueltas completadas: cada rebobinado terminado suma una. */
  laps: number
  /**
   * `Date.now()` del momento en que se emitió. Junto con `rate`, permite a los
   * renderers interpolar entre ticks y pintar milisegundos fluidos sin que el
   * main tenga que difundir a 60 Hz.
   */
  anchorAt: number
  /** Milisegundos de reloj por milisegundo real: -1 contando, >0 rebobinando, 0 parado. */
  rate: number
}

export interface DisplayInfo {
  id: number
  label: string
  isPrimary: boolean
}

export const DEFAULT_SETTINGS: TimerSettings = {
  durationMs: 5 * 60_000,
  rewindMs: 3_000,
  loop: true,
  showTenths: false,
  digitScale: 1,
  showViewpoint: false,
  viewpointText: '',
  alertTint: false,
  alertPulse: false,
  alertAtMs: 60_000,
  showMillis: true,
}

export const LIMITS = {
  durationMs: { min: 1_000, max: 24 * 60 * 60_000 },
  rewindMs: { min: 200, max: 60_000 },
  digitScale: { min: 0.4, max: 1.6 },
  viewpointText: { maxLength: 80 },
  alertAtMs: { min: 1_000, max: 60 * 60_000 },
}

/** Por debajo de este resto, el reloj pasa a mostrar milisegundos. */
export const MILLIS_THRESHOLD_MS = 10_000
