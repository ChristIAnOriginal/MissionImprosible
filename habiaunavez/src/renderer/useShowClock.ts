import { useEffect, useRef, useState } from 'react'

/**
 * Reloj de animación en segundos. Avanza por fotograma mientras `playing`,
 * escalado por `speed`, y vuelve a cero cuando cambia `epoch` (reiniciar o
 * cambiar de animación).
 *
 * La proyección y la vista previa llevan cada una el suyo: son vistas
 * independientes y sólo tienen que coincidir tras un reinicio, no fotograma a
 * fotograma.
 */
export function useShowClock(playing: boolean, speed: number, epoch: number): number {
  const [time, setTime] = useState(0)
  const elapsed = useRef(0)

  useEffect(() => {
    elapsed.current = 0
    setTime(0)
  }, [epoch])

  useEffect(() => {
    if (!playing) return
    let frame = 0
    let last = performance.now()
    const step = (now: number) => {
      // El delta se acota: al volver de una pestaña oculta no debe dar un salto.
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      elapsed.current += dt * speed
      setTime(elapsed.current)
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [playing, speed])

  return time
}
