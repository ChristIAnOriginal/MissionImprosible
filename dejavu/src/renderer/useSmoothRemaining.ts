import { useEffect, useState } from 'react'
import { interpolate } from '../shared/display'
import type { TimerTick } from '../shared/types'

/**
 * Devuelve el resto interpolado en cada fotograma mientras el reloj se mueve,
 * para que los milisegundos avancen suaves aunque el main sólo difunda a 10 Hz.
 * Parado, se queda con el valor exacto del último tick.
 */
export function useSmoothRemaining(tick: TimerTick, durationMs: number): number {
  const [remainingMs, setRemainingMs] = useState(tick.remainingMs)

  useEffect(() => {
    if (tick.rate === 0) {
      setRemainingMs(tick.remainingMs)
      return
    }
    let frame = 0
    const step = () => {
      setRemainingMs(interpolate(tick, durationMs))
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [tick, durationMs])

  return remainingMs
}
