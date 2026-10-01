import type { AnimationMeta } from '../../shared/types'
import { ACCENT, SPACE } from '../../shared/palette'

/**
 * Ficha de "Cabina — deriva estelar". Datos puros: la lee el proceso main para
 * validar y persistir valores, y el panel para construir los mandos.
 */
export const cabinaDerivaMeta: AnimationMeta = {
  id: 'cabina-deriva',
  name: 'Cabina — deriva estelar',
  description: 'La nave avanza en silencio. Estrellas en fuga, un planeta al costado y la consola encendida.',
  accent: ACCENT.teal,
  looks: ['realista'],
  params: [
    {
      kind: 'number',
      key: 'starSpeed',
      label: 'Velocidad de crucero',
      hint: 'Cuánto corren las estrellas hacia la cámara',
      group: 'Espacio',
      min: 0,
      max: 3,
      step: 0.05,
      unit: 'x',
      default: 1,
    },
    {
      kind: 'number',
      key: 'starCount',
      label: 'Densidad de estrellas',
      group: 'Espacio',
      min: 20,
      max: 400,
      step: 10,
      default: 160,
    },
    {
      kind: 'color',
      key: 'nebulaColor',
      label: 'Color de la nebulosa',
      group: 'Espacio',
      default: SPACE.nebula,
    },
    {
      kind: 'boolean',
      key: 'planetVisible',
      label: 'Planeta a la vista',
      group: 'Planeta',
      default: true,
    },
    {
      kind: 'color',
      key: 'planetColor',
      label: 'Color del planeta',
      group: 'Planeta',
      default: ACCENT.orange,
    },
    {
      kind: 'number',
      key: 'planetSize',
      label: 'Tamaño',
      group: 'Planeta',
      // El techo cabe en el parabrisas: más grande se sale del cristal.
      min: 30,
      max: 160,
      step: 5,
      default: 78,
    },
    {
      kind: 'number',
      key: 'planetX',
      label: 'Posición horizontal',
      group: 'Planeta',
      min: 0,
      max: 100,
      step: 1,
      unit: '%',
      default: 74,
    },
    {
      kind: 'number',
      key: 'planetY',
      label: 'Posición vertical',
      group: 'Planeta',
      min: 0,
      max: 100,
      step: 1,
      unit: '%',
      default: 34,
    },
    {
      kind: 'boolean',
      key: 'planetRing',
      label: 'Con anillo',
      group: 'Planeta',
      default: true,
    },
    {
      kind: 'select',
      key: 'consoleMode',
      label: 'Estado de la consola',
      group: 'Cabina',
      options: [
        { value: 'calma', label: 'Calma' },
        { value: 'alerta', label: 'Alerta' },
        { value: 'apagada', label: 'Apagada' },
      ],
      default: 'calma',
    },
  ],
}
