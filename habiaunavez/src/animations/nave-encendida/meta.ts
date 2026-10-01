import type { AnimationMeta } from '../../shared/types'
import { ACCENT } from '../../shared/palette'

/**
 * Ficha de "Nave encendida". Datos puros: sin JSX y sin importar nada de renderer/.
 *
 * Es el cuadro final del encendido de cabina: los valores por defecto del
 * exterior coinciden con los de la transición para que el paso no dé salto.
 */
export const naveEncendidaMeta: AnimationMeta = {
  id: 'nave-encendida',
  name: 'Nave encendida',
  description: 'La cabina ya en marcha, con todas las luces; fuera siguen la luna y las estrellas quietas.',
  accent: ACCENT.amber,
  looks: ['realista'],
  params: [
    {
      kind: 'select',
      key: 'mode',
      label: 'Estado de la consola',
      group: 'Cabina',
      options: [
        { value: 'calma', label: 'Calma' },
        { value: 'alerta', label: 'Alerta' },
      ],
      default: 'calma',
    },
    {
      kind: 'number',
      key: 'moonSize',
      label: 'Tamaño de la luna',
      hint: 'A 0 no hay luna',
      group: 'Luna',
      min: 0,
      max: 150,
      step: 2,
      default: 62,
    },
    {
      kind: 'number',
      key: 'moonPhase',
      label: 'Fase',
      hint: '0 llena · 0,5 media · 1 nueva',
      group: 'Luna',
      min: 0,
      max: 1,
      step: 0.02,
      default: 0.26,
    },
    {
      kind: 'number',
      key: 'moonX',
      label: 'Posición horizontal',
      group: 'Luna',
      min: 0,
      max: 100,
      step: 1,
      unit: '%',
      default: 72,
    },
    {
      kind: 'number',
      key: 'moonY',
      label: 'Posición vertical',
      group: 'Luna',
      min: 0,
      max: 100,
      step: 1,
      unit: '%',
      default: 30,
    },
    {
      kind: 'boolean',
      key: 'moonCraters',
      label: 'Cráteres',
      group: 'Luna',
      default: true,
    },
    {
      kind: 'number',
      key: 'drift',
      label: 'Deriva',
      hint: 'La luna se desplaza despacio. A 0 queda todo quieto.',
      group: 'Luna',
      min: 0,
      max: 1,
      step: 0.05,
      default: 0.25,
    },
    {
      kind: 'number',
      key: 'starCount',
      label: 'Estrellas',
      group: 'Cielo',
      min: 0,
      max: 120,
      step: 2,
      default: 34,
    },
  ],
}
