import React from 'react'
import { SPACE } from '../../shared/palette'
import { WORLD_SCALE, WorldPlanet, type WorldKind } from '../scene/worlds'

/**
 * Miniaturas para selectores. Una ficha las pide con `preview` en su
 * `SelectParam` y el panel pinta cada opción como un cuadro con su imagen.
 * Las fichas no pueden importar JSX, por eso el dibujo vive aquí.
 *
 * Cada juego recibe el valor de la opción y devuelve el contenido de un
 * lienzo de 100×100.
 */
export const OPTION_PREVIEWS: Record<string, (value: string) => React.ReactNode> = {
  // Planetas de destino, con la escala relativa de cada tipo: el enano se ve
  // pequeño también aquí.
  world: value => {
    const kind = value as WorldKind
    // El anillado necesita margen para que el anillo quepa en el cuadro.
    const base = kind === 'anillado' ? 22 : 34
    return (
      <>
        <rect width={100} height={100} fill={SPACE.deep} />
        <WorldPlanet kind={kind} cx={50} cy={50} r={base * (WORLD_SCALE[kind] ?? 1)} />
      </>
    )
  },
}
