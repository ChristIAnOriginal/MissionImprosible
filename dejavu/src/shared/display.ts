/**
 * Reglas de presentación del reloj, compartidas por la proyección y la vista
 * previa del panel: las dos tienen que verse igual.
 */
import { clamp, Decimals, formatTime, splitClock } from './format'
import { MILLIS_THRESHOLD_MS, TimerPhase, TimerSettings, TimerTick } from './types'

/**
 * Calcula el resto real en este instante a partir del último tick recibido.
 * El main difunde cada 100 ms; el renderer rellena el hueco con esta recta.
 */
export function interpolate(tick: TimerTick, durationMs: number): number {
  if (tick.rate === 0) return tick.remainingMs
  const elapsed = Date.now() - tick.anchorAt
  const value = tick.remainingMs + tick.rate * elapsed
  return clamp(value, 0, Math.max(durationMs, tick.remainingMs))
}

export function decimalsFor(remainingMs: number, settings: TimerSettings): Decimals {
  if (settings.showMillis && remainingMs <= MILLIS_THRESHOLD_MS) return 3
  return settings.showTenths ? 1 : 0
}

/**
 * Cuánto se ha entrado en la zona de aviso: 0 = fuera, 1 = justo en el cero.
 * Sólo mide el umbral; qué se hace con ello (teñir, latir) lo decide clockView.
 */
export function alertIntensity(
  remainingMs: number,
  phase: TimerPhase,
  settings: TimerSettings
): number {
  // Rebobinando el tiempo sube: el aviso no tiene sentido.
  if (phase === 'rewinding') return 0
  if (settings.alertAtMs <= 0 || remainingMs > settings.alertAtMs) return 0
  return clamp(1 - remainingMs / settings.alertAtMs, 0, 1)
}

/** Blanco → naranja → rojo anaranjado a medida que se agota el tiempo. */
const STOPS: [number, number, number][] = [
  [255, 255, 255],
  [255, 150, 60],
  [255, 45, 45],
]

export function alertColor(intensity: number): string {
  if (intensity <= 0) return '#ffffff'
  const t = clamp(intensity, 0, 1) * (STOPS.length - 1)
  const i = Math.min(Math.floor(t), STOPS.length - 2)
  const k = t - i
  const [from, to] = [STOPS[i], STOPS[i + 1]]
  const [r, g, b] = from.map((v, n) => Math.round(v + (to[n] - v) * k))
  return `rgb(${r}, ${g}, ${b})`
}

/** El latido se acelera al acercarse a cero: 1,4 s → 0,45 s. */
export function pulseSeconds(intensity: number): number {
  return 1.4 - clamp(intensity, 0, 1) * 0.95
}

/** Cuánto ocupa el reloj en "anchos de carácter", con la fracción a 0.55 em. */
export const FRAC_EM = 0.55

export interface ClockView {
  main: string
  frac: string
  /** Ancho equivalente en caracteres, para dimensionar el cuerpo de letra. */
  chars: number
  color: string
  /** Sólo late mientras el reloj corre. */
  pulsing: boolean
  pulseSeconds: number
}

export function clockView(
  remainingMs: number,
  phase: TimerPhase,
  settings: TimerSettings
): ClockView {
  const [main, frac] = splitClock(formatTime(remainingMs, decimalsFor(remainingMs, settings)))
  const intensity = alertIntensity(remainingMs, phase, settings)
  return {
    main,
    frac,
    chars: main.length + frac.length * FRAC_EM,
    color: settings.alertTint ? alertColor(intensity) : '#ffffff',
    pulsing: settings.alertPulse && intensity > 0 && phase === 'running',
    pulseSeconds: pulseSeconds(intensity),
  }
}
