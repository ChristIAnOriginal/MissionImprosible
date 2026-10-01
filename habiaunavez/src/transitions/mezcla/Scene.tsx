/**
 * "Mezcla": la animación de destino aparece encima de la de salida, que se ve
 * a través hasta desaparecer.
 *
 * El destino se dibuja quieto en su primer fotograma: es el mismo con el que
 * arranca al terminar, así el corte no se nota.
 */
import React from 'react'
import type { TransitionSceneProps } from '../../renderer/scene/contract'
import { smooth } from '../../renderer/scene/motion'

export default function Mezcla({ values, progress, from, to }: TransitionSceneProps) {
  const k = values.curve === 'lineal' ? progress : smooth(progress)
  return (
    <>
      {from}
      <g opacity={k}>{to}</g>
    </>
  )
}
