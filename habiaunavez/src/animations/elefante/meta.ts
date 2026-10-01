import type { AnimationMeta } from '../../shared/types'
import { PANEL } from '../../shared/palette'

/** Ficha de "Elefante". Datos puros: sin JSX y sin importar nada de renderer/. */
export const elefanteMeta: AnimationMeta = {
  id: 'elefante',
  name: 'Elefante',
  description: 'Imagen fija: el dibujo número 2, la boa abierta con el elefante dentro.',
  accent: PANEL.bezel,
  params: [],
}
