/**
 * Formato compartido por el panel y la proyección: los dos tienen que
 * mostrar exactamente los mismos dígitos.
 */

/** Cuántos decimales de segundo se pintan. */
export type Decimals = 0 | 1 | 3

/** `H:MM:SS`, `MM:SS`, `MM:SS.d` o `MM:SS.mmm` según la duración y los decimales. */
export function formatTime(ms: number, decimals: Decimals = 0): string {
  const clamped = Math.max(0, ms)
  // Unidades por segundo: 1, 10 o 1000 según los decimales pedidos.
  const scale = decimals === 3 ? 1000 : decimals === 1 ? 10 : 1
  // Se redondea hacia arriba para que "1" se vea durante todo el último instante.
  const units = Math.ceil((clamped * scale) / 1000)
  const totalSeconds = Math.floor(units / scale)
  const frac = units % scale

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const pad = (n: number) => String(n).padStart(2, '0')
  const base = hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`
  return decimals > 0 ? `${base}.${String(frac).padStart(decimals, '0')}` : base
}

/**
 * Parte el reloj en cuerpo y decimales (`"00:09.500"` → `["00:09", ".500"]`)
 * para poder pintar la fracción más pequeña y que el número principal no
 * encoja al aparecer los milisegundos.
 */
export function splitClock(text: string): [string, string] {
  const dot = text.indexOf('.')
  return dot === -1 ? [text, ''] : [text.slice(0, dot), text.slice(dot)]
}

/** Descompone milisegundos en horas / minutos / segundos para los inputs. */
export function splitDuration(ms: number) {
  const total = Math.round(ms / 1000)
  return {
    hours: Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  }
}

export function joinDuration(hours: number, minutes: number, seconds: number) {
  return (hours * 3600 + minutes * 60 + seconds) * 1000
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
