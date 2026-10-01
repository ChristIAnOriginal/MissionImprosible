/**
 * "Nave encendida": el cuadro final del encendido de cabina, sostenido.
 *
 * Cabina con todas las zonas a plena luz; fuera, la misma luna y las mismas
 * estrellas quietas que había con la nave apagada.
 */
import React from 'react'
import type { SceneProps } from '../../renderer/scene/contract'
import { CabinFrame, WINDOW, type ConsoleMode } from '../../renderer/scene/CabinFrame'
import { Moon, StillStars, Void } from '../../renderer/scene/space'

export default function NaveEncendida({ values, time }: SceneProps) {
  const mode = values.mode as ConsoleMode
  const moonSize = values.moonSize as number
  const moonPhase = values.moonPhase as number
  const moonX = values.moonX as number
  const moonY = values.moonY as number
  const moonCraters = values.moonCraters as boolean
  const drift = values.drift as number
  const starCount = values.starCount as number

  // Vaivén lento en los dos ejes. Los dos senos arrancan en 0 para que, al
  // llegar desde el encendido, la luna empiece justo donde la dejó.
  const cx = WINDOW.x + (moonX / 100) * WINDOW.width + Math.sin(time * 0.06 * drift) * 90 * drift
  const cy = WINDOW.y + (moonY / 100) * WINDOW.height + Math.sin(time * 0.043 * drift) * 34 * drift

  return (
    <CabinFrame time={time} mode={mode}>
      <Void />
      <StillStars count={starCount} />
      {moonSize > 0 && <Moon cx={cx} cy={cy} r={moonSize} phase={moonPhase} craters={moonCraters} />}
    </CabinFrame>
  )
}
