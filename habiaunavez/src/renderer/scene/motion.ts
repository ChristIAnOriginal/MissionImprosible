/**
 * Utilidades de movimiento para transiciones: tramos del avance y recorridos
 * con velocidad variable. Todo es función pura del avance, así que pausa,
 * reinicio y vista previa siguen funcionando solos.
 */

/** Rampa de 0 a 1 dentro de un tramo; fuera de él vale 0 o 1. */
export function ramp(progress: number, [from, to]: readonly [number, number]): number {
  if (progress <= from) return 0
  if (progress >= to) return 1
  return (progress - from) / (to - from)
}

/** Entrada y salida suaves de 0 a 1. */
export function smooth(x: number): number {
  return x * x * (3 - 2 * x)
}

/**
 * Recorrido acumulado con una velocidad que cambia a lo largo del avance.
 * La posición no puede ser `time × velocidad` — saltaría cada vez que la
 * velocidad cambia —, así que se integra. Da siempre lo mismo para el mismo
 * avance.
 */
export function travelled(speedAt: (progress: number) => number, progress: number, seconds: number): number {
  const steps = 200
  const dp = progress / steps
  let sum = 0
  for (let i = 0; i < steps; i++) sum += speedAt((i + 0.5) * dp)
  return sum * dp * seconds
}

/**
 * `Starfield` avanza con `time × speed`. Para que ese producto sea un
 * recorrido integrado, se le pasa el recorrido dividido por la velocidad.
 */
export function starfieldTime(distance: number, speed: number): number {
  return speed > 0.001 ? distance / speed : 0
}
