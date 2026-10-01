/**
 * "Nave apagada": la cabina sin corriente. Dentro no hay luz; fuera, la luna y
 * unas pocas estrellas quietas.
 *
 * Lo único que se mueve es la luna, y muy despacio: la nave va a la deriva.
 * Las estrellas no dependen del reloj a propósito.
 */
import React from 'react'
import type { SceneProps } from '../../renderer/scene/contract'
import { CabinFrame, WINDOW } from '../../renderer/scene/CabinFrame'
import { Moon, StillStars, Void } from '../../renderer/scene/space'

export default function NaveApagada({ values, time }: SceneProps) {
  const darkness = values.darkness as number
  const moonSize = values.moonSize as number
  const moonPhase = values.moonPhase as number
  const moonX = values.moonX as number
  const moonY = values.moonY as number
  const moonCraters = values.moonCraters as boolean
  const drift = values.drift as number
  const starCount = values.starCount as number

  // La deriva es un vaivén muy lento y desfasado en los dos ejes, para que no
  // se lea como un ir y venir en línea recta.
  const cx = WINDOW.x + (moonX / 100) * WINDOW.width + Math.sin(time * 0.06 * drift) * 90 * drift
  const cy = WINDOW.y + (moonY / 100) * WINDOW.height + Math.sin(time * 0.043 * drift + 1.7) * 34 * drift

  return (
    <CabinFrame time={time} mode="apagada" dim={darkness}>
      <Void />
      <StillStars count={starCount} />
      <Moon cx={cx} cy={cy} r={moonSize} phase={moonPhase} craters={moonCraters} />
    </CabinFrame>
  )
}
