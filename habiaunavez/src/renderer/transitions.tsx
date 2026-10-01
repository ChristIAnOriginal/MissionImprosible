/**
 * Registro de escenas de transición: id → componente.
 * La otra mitad son las fichas, en `src/shared/animations.ts`.
 */
import type { TransitionComponent } from './scene/contract'
import Encendido from '../transitions/encendido/Scene'
import Despegue from '../transitions/despegue/Scene'
import Aceleracion from '../transitions/aceleracion/Scene'
import Fundido from '../transitions/fundido/Scene'
import Mezcla from '../transitions/mezcla/Scene'
import despegueAudio from '../../assets/audio/despegue.mpeg?url'
import aceleracionAudio from '../../assets/audio/aceleracion.mpeg?url'

export const TRANSITION_SCENES: Record<string, TransitionComponent> = {
  encendido: Encendido,
  despegue: Despegue,
  aceleracion: Aceleracion,
  fundido: Fundido,
  mezcla: Mezcla,
}

/**
 * Audio de cada transición, si tiene. Lo reproduce el panel (ver
 * `useTransitionAudio`), sincronizado con el reloj de la transición.
 */
export const TRANSITION_AUDIO: Record<string, string> = {
  despegue: despegueAudio,
  aceleracion: aceleracionAudio,
}
