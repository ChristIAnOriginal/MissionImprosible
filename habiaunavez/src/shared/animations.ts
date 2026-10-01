/**
 * Registro de fichas. Sólo datos: lo importan tanto el proceso main (para
 * validar y persistir valores) como los dos renderers (para pintar la lista
 * y los mandos).
 *
 * Añadir una animación = añadir aquí su `meta` y su componente en
 * `src/renderer/animations.tsx`. No hay que tocar nada más.
 */
import type { AnimationMeta, TransitionMeta } from './types'
import { cabinaDerivaMeta } from '../animations/cabina-deriva/meta'
import { naveApagadaMeta } from '../animations/nave-apagada/meta'
import { naveEncendidaMeta } from '../animations/nave-encendida/meta'
import { tronoReyMeta } from '../animations/trono-rey/meta'
import { bibliotecaCartografoMeta } from '../animations/biblioteca-cartografo/meta'
import { farolEnanoMeta } from '../animations/farol-enano/meta'
import { blackoutMeta } from '../animations/blackout/meta'
import { boaMeta } from '../animations/boa/meta'
import { elefanteMeta } from '../animations/elefante/meta'
import { encendidoMeta } from '../transitions/encendido/meta'
import { despegueMeta } from '../transitions/despegue/meta'
import { aceleracionMeta } from '../transitions/aceleracion/meta'
import { fundidoMeta } from '../transitions/fundido/meta'
import { mezclaMeta } from '../transitions/mezcla/meta'

export const ANIMATIONS: AnimationMeta[] = [cabinaDerivaMeta, naveApagadaMeta, naveEncendidaMeta, tronoReyMeta, bibliotecaCartografoMeta, farolEnanoMeta, boaMeta, elefanteMeta, blackoutMeta]

export const DEFAULT_ANIMATION_ID = ANIMATIONS[0].id

export function findAnimation(id: string): AnimationMeta | undefined {
  return ANIMATIONS.find(a => a.id === id)
}

export const TRANSITIONS: TransitionMeta[] = [fundidoMeta, mezclaMeta, encendidoMeta, despegueMeta, aceleracionMeta]

export function findTransition(id: string): TransitionMeta | undefined {
  return TRANSITIONS.find(t => t.id === id)
}
