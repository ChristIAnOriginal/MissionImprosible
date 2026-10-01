import type { TransitionMeta } from '../../shared/types'

/**
 * Ficha de "Mezcla". Genérica: sirve entre dos animaciones cualesquiera.
 * Dibuja las dos escenas (`showsScenes`): la de destino aparece encima de la
 * de salida mientras ésta se desvanece.
 */
export const mezclaMeta: TransitionMeta = {
  id: 'mezcla',
  name: 'Mezcla',
  description: 'Una imagen se desvanece mientras la otra aparece encima.',
  accent: '#17b498',
  showsScenes: true,
  params: [
    {
      kind: 'number',
      key: 'durationMs',
      label: 'Duración',
      group: 'Ritmo',
      min: 300,
      max: 15000,
      step: 100,
      unit: ' ms',
      default: 2000,
    },
    {
      kind: 'select',
      key: 'curve',
      label: 'Ritmo de la mezcla',
      group: 'Ritmo',
      options: [
        { value: 'suave', label: 'Suave' },
        { value: 'lineal', label: 'Lineal' },
      ],
      default: 'suave',
    },
  ],
}
