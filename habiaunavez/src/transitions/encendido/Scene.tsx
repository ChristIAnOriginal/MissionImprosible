/**
 * "Encendido de cabina": de la nave apagada a la nave en marcha.
 *
 * El arranque es escalonado y en ese orden: centro → laterales → techo. Los
 * tramos se solapan un poco para que no se lea como tres interruptores, y la
 * iluminación general de la nave sube siguiendo el mismo ritmo — es la suma de
 * las tres zonas, no una curva aparte.
 */
import React from 'react'
import type { TransitionSceneProps } from '../../renderer/scene/contract'
import { CabinFrame, type ConsoleMode } from '../../renderer/scene/CabinFrame'
import { Moon, StillStars, Void } from '../../renderer/scene/space'
import { WINDOW } from '../../renderer/scene/CabinFrame'

/**
 * Tramo de cada zona dentro de la transición, en fracción del total. Se solapan
 * un poco para que no se lea como tres interruptores, y acaban antes del final
 * para que la nave se vea un momento entera antes de pasar al destino.
 */
const STAGES = {
  centre: [0.05, 0.42],
  sides: [0.4, 0.68],
  overhead: [0.66, 0.92],
} as const

/** Rampa de 0 a 1 dentro de un tramo, fuera de él vale 0 o 1. */
function ramp(progress: number, [from, to]: readonly [number, number]): number {
  if (progress <= from) return 0
  if (progress >= to) return 1
  return (progress - from) / (to - from)
}

export default function Encendido({ values, time, progress }: TransitionSceneProps) {
  const ease = values.ease as number
  const endMode = values.endMode as ConsoleMode
  const moonSize = values.moonSize as number
  const starCount = values.starCount as number
  const fadeOut = values.fadeOut as boolean

  /*
   * El arranque lento se aplica **dentro** de la primera etapa, no al avance
   * entero: curvando el avance global, las dos últimas etapas se apelotonaban
   * al final y el techo apenas llegaba a encenderse antes del corte.
   */
  const power = {
    centre: Math.pow(ramp(progress, STAGES.centre), ease),
    sides: ramp(progress, STAGES.sides),
    overhead: ramp(progress, STAGES.overhead),
  }

  // La luz de la nave es lo que dan las tres zonas juntas, con algo de base en
  // cuanto entra la primera: la cabina deja de estar a ciegas antes de llenarse.
  const litFraction = (power.centre + power.sides + power.overhead) / 3
  const dim = 0.86 * (1 - Math.min(1, litFraction * 1.15))

  // Si el destino tiene otro cielo, el exterior se va en el último tramo para
  // que el corte no sea seco. Hacia «Nave encendida» se queda: es el mismo.
  const moonFade = fadeOut ? 1 - ramp(progress, [0.78, 1]) : 1

  return (
    <CabinFrame
      time={time}
      mode={power.centre > 0 ? endMode : 'apagada'}
      power={power}
      dim={dim}
    >
      <Void />
      <g opacity={moonFade}>
        <StillStars count={starCount} />
        {moonSize > 0 && (
          <Moon
            cx={WINDOW.x + 0.72 * WINDOW.width}
            cy={WINDOW.y + 0.3 * WINDOW.height}
            r={moonSize}
            phase={0.26}
          />
        )}
      </g>
    </CabinFrame>
  )
}
