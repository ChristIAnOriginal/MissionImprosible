import type { ReactElement, ReactNode } from 'react'
import type { ParamValues } from '../../shared/types'

/**
 * Lo que recibe toda escena. `time` ya viene afectado por la velocidad global y
 * por la pausa, y vuelve a cero al reiniciar: la escena sólo tiene que ser una
 * función de ese reloj y de sus parámetros.
 */
export interface SceneProps {
  /** Valores ya validados y completados con los de la ficha. */
  values: ParamValues
  /** Segundos de reloj de animación. */
  time: number
  /**
   * Segundos de reloj real desde que cambió un parámetro, o `Infinity` si esta
   * ventana no lo ha visto cambiar. Sirve para animar el paso de un valor a
   * otro (un botón que alterna el día y la noche) sin estado propio: una
   * ventana que se abre después ve directamente el estado ya asentado.
   */
  since?: (key: string) => number
}

export type SceneComponent = (props: SceneProps) => ReactElement | null

/**
 * Lo que recibe una transición. Además de `time` lleva `progress`, de 0 a 1 a
 * lo largo de su duración: la escena se escribe contra el avance, no contra los
 * segundos, así cambiar la duración no obliga a retocar nada.
 */
export interface TransitionSceneProps extends SceneProps {
  progress: number
  /**
   * Sólo si la ficha declara `showsScenes`: la animación de salida, en marcha,
   * y la de destino, quieta en su primer fotograma.
   */
  from?: ReactNode
  to?: ReactNode
}

export type TransitionComponent = (props: TransitionSceneProps) => ReactElement | null
