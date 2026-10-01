import type { TransitionMeta } from '../../shared/types'

/**
 * Ficha de "Fundido a negro". Genérica: sirve entre dos animaciones
 * cualesquiera. Dibuja las dos escenas (`showsScenes`): la de salida se funde
 * al color, se sostiene y la de destino aparece desde él.
 */
export const fundidoMeta: TransitionMeta = {
  id: 'fundido',
  name: 'Fundido a negro',
  description: 'La imagen se funde a negro y aparece la siguiente.',
  accent: '#5b6570',
  showsScenes: true,
  params: [
    {
      kind: 'number',
      key: 'durationMs',
      label: 'Duración',
      hint: 'Salida, negro y entrada, en total',
      group: 'Ritmo',
      min: 500,
      max: 15000,
      step: 100,
      unit: ' ms',
      default: 2400,
    },
    {
      kind: 'number',
      key: 'holdMs',
      label: 'Tiempo en negro',
      hint: 'Cuánto se sostiene el negro entre las dos imágenes',
      group: 'Ritmo',
      min: 0,
      max: 5000,
      step: 100,
      unit: ' ms',
      default: 400,
    },
    {
      kind: 'color',
      key: 'color',
      label: 'Color del fundido',
      group: 'Ritmo',
      default: '#000000',
    },
  ],
}
