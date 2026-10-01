/**
 * "Fundido a negro": la escena de salida se cubre de color, el color se
 * sostiene y la de destino aparece desde él.
 *
 * El destino se dibuja quieto en su primer fotograma: es el mismo con el que
 * arranca al terminar, así el corte no se nota.
 */
import React from 'react'
import { STAGE } from '../../shared/palette'
import type { TransitionSceneProps } from '../../renderer/scene/contract'
import { smooth } from '../../renderer/scene/motion'

export default function Fundido({ values, progress, from, to }: TransitionSceneProps) {
  const duration = values.durationMs as number
  const hold = Math.min(values.holdMs as number, duration)
  const color = values.color as string

  const t = progress * duration
  const half = (duration - hold) / 2
  const out = half > 0 ? Math.min(1, t / half) : 1
  const back = half > 0 ? Math.min(1, Math.max(0, (t - half - hold) / half)) : 1
  const leaving = t < half + hold

  return (
    <>
      {leaving ? from : to}
      <rect
        width={STAGE.width}
        height={STAGE.height}
        fill={color}
        opacity={leaving ? smooth(out) : 1 - smooth(back)}
      />
    </>
  )
}
