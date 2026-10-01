import type { AnimationMeta } from '../../shared/types'
import { PANEL } from '../../shared/palette'

/** Ficha de "Boa". Datos puros: sin JSX y sin importar nada de renderer/. */
export const boaMeta: AnimationMeta = {
  id: 'boa',
  name: 'Boa',
  description: 'Imagen fija: el dibujo número 1, una boa que parece un sombrero.',
  accent: PANEL.screw,
  params: [],
}
