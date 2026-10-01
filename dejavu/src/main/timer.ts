/**
 * El reloj vive en el proceso main: el panel y la proyección sólo pintan lo
 * que reciben, así los dos muestran exactamente el mismo número.
 *
 * El tiempo nunca se acumula sumando ticks (derivaría): cada tick se calcula
 * desde un ancla en `Date.now()`.
 */
import { clamp } from '../shared/format'
import { DEFAULT_SETTINGS, LIMITS, TimerPhase, TimerSettings, TimerTick } from '../shared/types'

/*
 * Los renderers interpolan entre ticks (ver shared/display.ts), así que no hace
 * falta difundir a 60 Hz para que los milisegundos se vean fluidos.
 */
const TICK_MS = 100

let settings: TimerSettings = { ...DEFAULT_SETTINGS }
let phase: TimerPhase = 'idle'
let remainingMs = settings.durationMs
let laps = 0

/** Instante en que la cuenta atrás llega a cero. */
let endAt = 0
/** Ancla del rebobinado: desde cuándo, y desde qué valor. */
let rewindStartedAt = 0
let rewindFrom = 0

let interval: ReturnType<typeof setInterval> | null = null
let emitTick: (tick: TimerTick) => void = () => {}
let emitSettings: (s: TimerSettings) => void = () => {}
let persist: (s: TimerSettings) => void = () => {}

export function initTimer(
  initial: TimerSettings,
  hooks: {
    onTick: (tick: TimerTick) => void
    onSettings: (s: TimerSettings) => void
    onPersist: (s: TimerSettings) => void
  }
) {
  settings = sanitize(initial)
  remainingMs = settings.durationMs
  emitTick = hooks.onTick
  emitSettings = hooks.onSettings
  persist = hooks.onPersist
}

function sanitize(s: TimerSettings): TimerSettings {
  return {
    durationMs: Math.round(clamp(s.durationMs, LIMITS.durationMs.min, LIMITS.durationMs.max)),
    rewindMs: Math.round(clamp(s.rewindMs, LIMITS.rewindMs.min, LIMITS.rewindMs.max)),
    loop: !!s.loop,
    showTenths: !!s.showTenths,
    digitScale: clamp(s.digitScale, LIMITS.digitScale.min, LIMITS.digitScale.max),
    showViewpoint: !!s.showViewpoint,
    viewpointText: String(s.viewpointText ?? '').slice(0, LIMITS.viewpointText.maxLength),
    alertTint: !!s.alertTint,
    alertPulse: !!s.alertPulse,
    alertAtMs: Math.round(clamp(s.alertAtMs, LIMITS.alertAtMs.min, LIMITS.alertAtMs.max)),
    showMillis: !!s.showMillis,
  }
}

/** Milisegundos de reloj por milisegundo real, para que el renderer interpole. */
function currentRate(): number {
  if (phase === 'running') return -1
  if (phase === 'rewinding') return (settings.durationMs - rewindFrom) / settings.rewindMs
  return 0
}

export function snapshotTick(): TimerTick {
  return {
    phase,
    remainingMs: Math.round(remainingMs),
    laps,
    anchorAt: Date.now(),
    rate: currentRate(),
  }
}

export function snapshotSettings(): TimerSettings {
  return { ...settings }
}

function emit() {
  emitTick(snapshotTick())
}

/** El intervalo sólo corre mientras el reloj se mueve. */
function syncInterval() {
  const moving = phase === 'running' || phase === 'rewinding'
  if (moving && interval === null) {
    interval = setInterval(step, TICK_MS)
  } else if (!moving && interval !== null) {
    clearInterval(interval)
    interval = null
  }
}

function step() {
  const now = Date.now()

  if (phase === 'running') {
    remainingMs = endAt - now
    if (remainingMs <= 0) {
      remainingMs = 0
      beginRewind(now)
    }
  } else if (phase === 'rewinding') {
    const progress = clamp((now - rewindStartedAt) / settings.rewindMs, 0, 1)
    remainingMs = rewindFrom + (settings.durationMs - rewindFrom) * progress
    if (progress >= 1) {
      remainingMs = settings.durationMs
      laps += 1
      if (settings.loop) {
        phase = 'running'
        endAt = now + settings.durationMs
      } else {
        phase = 'idle'
      }
      syncInterval()
    }
  }

  emit()
}

function beginRewind(now: number) {
  phase = 'rewinding'
  rewindStartedAt = now
  rewindFrom = Math.max(0, remainingMs)
  syncInterval()
}

// ----- Acciones ----------------------------------------------------------

export function start() {
  if (phase === 'running' || phase === 'rewinding') return
  if (remainingMs <= 0) remainingMs = settings.durationMs
  phase = 'running'
  endAt = Date.now() + remainingMs
  syncInterval()
  emit()
}

export function pause() {
  if (phase !== 'running' && phase !== 'rewinding') return
  // `remainingMs` ya tiene el valor del último step; sólo hay que congelarlo.
  phase = 'paused'
  syncInterval()
  emit()
}

export function toggle() {
  if (phase === 'running' || phase === 'rewinding') pause()
  else start()
}

export function reset() {
  phase = 'idle'
  remainingMs = settings.durationMs
  laps = 0
  syncInterval()
  emit()
}

/** Rebobina desde donde esté hasta el tiempo inicial. */
export function rewind() {
  if (phase === 'rewinding') return
  beginRewind(Date.now())
  emit()
}

export function updateSettings(patch: Partial<TimerSettings>) {
  const next = sanitize({ ...settings, ...patch })
  const durationChanged = next.durationMs !== settings.durationMs
  settings = next

  if (durationChanged) {
    if (phase === 'idle') {
      remainingMs = settings.durationMs
    } else if (remainingMs > settings.durationMs) {
      // Acortar la duración no puede dejar el reloj por encima del nuevo tope.
      remainingMs = settings.durationMs
      if (phase === 'running') endAt = Date.now() + remainingMs
    }
  }

  emitSettings(snapshotSettings())
  persist(snapshotSettings())
  emit()
}

export function stopClock() {
  if (interval !== null) {
    clearInterval(interval)
    interval = null
  }
}
