/**
 * "Cabina — deriva estelar": la animación de referencia.
 *
 * Sirve de plantilla para las siguientes. Lo que hay que respetar:
 *  - todo se dibuja en el lienzo 1920×1080 y en SVG plano;
 *  - el movimiento sale de `time`, nunca de un estado propio ni de animaciones
 *    CSS, para que pausa / velocidad / reinicio funcionen solos;
 *  - los colores salen de la paleta y las piezas de cabina del kit de escena.
 */
import React from 'react'
import type { SceneProps } from '../../renderer/scene/contract'
import { CabinFrame, WINDOW, type ConsoleMode } from '../../renderer/scene/CabinFrame'
import { Nebula, Planet, Starfield, Void } from '../../renderer/scene/space'

export default function CabinaDeriva({ values, time }: SceneProps) {
  const starSpeed = values.starSpeed as number
  const starCount = values.starCount as number
  const nebulaColor = values.nebulaColor as string
  const planetVisible = values.planetVisible as boolean
  const planetColor = values.planetColor as string
  const planetSize = values.planetSize as number
  const planetX = values.planetX as number
  const planetY = values.planetY as number
  const planetRing = values.planetRing as boolean
  const consoleMode = values.consoleMode as ConsoleMode

  // El planeta se sitúa en porcentaje del hueco del parabrisas, no del lienzo:
  // así "centrado" significa centrado en lo que se ve.
  const cx = WINDOW.x + (planetX / 100) * WINDOW.width
  const cy = WINDOW.y + (planetY / 100) * WINDOW.height

  return (
    <CabinFrame time={time} mode={consoleMode}>
      <Void />
      <Nebula color={nebulaColor} time={time} />
      {planetVisible && (
        <Planet cx={cx} cy={cy} r={planetSize} color={planetColor} ring={planetRing} time={time} />
      )}
      <Starfield
        time={time}
        count={starCount}
        speed={starSpeed}
        originX={WINDOW.x + WINDOW.width / 2}
        originY={WINDOW.y + WINDOW.height * 0.52}
        reach={1500}
      />
    </CabinFrame>
  )
}
