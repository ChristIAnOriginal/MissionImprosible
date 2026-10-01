/**
 * Registro de escenas: id → componente.
 *
 * La otra mitad del registro son las fichas, en `src/shared/animations.ts`.
 * Están separadas porque el proceso main necesita las fichas (datos) pero no
 * puede importar JSX.
 */
import type { SceneComponent } from './scene/contract'
import CabinaDeriva from '../animations/cabina-deriva/Scene'
import NaveApagada from '../animations/nave-apagada/Scene'
import NaveEncendida from '../animations/nave-encendida/Scene'
import TronoRey from '../animations/trono-rey/Scene'
import BibliotecaCartografo from '../animations/biblioteca-cartografo/Scene'
import FarolEnano from '../animations/farol-enano/Scene'
import Blackout from '../animations/blackout/Scene'
import Boa from '../animations/boa/Scene'
import Elefante from '../animations/elefante/Scene'
import TronoDiorama from '../animations/trono-rey/Diorama'
import CartografoDiorama from '../animations/biblioteca-cartografo/Diorama'
import FarolDiorama from '../animations/farol-enano/Diorama'

export const SCENES: Record<string, SceneComponent> = {
  'cabina-deriva': CabinaDeriva,
  'nave-apagada': NaveApagada,
  'nave-encendida': NaveEncendida,
  'trono-rey': TronoRey,
  'biblioteca-cartografo': BibliotecaCartografo,
  'farol-enano': FarolEnano,
  boa: Boa,
  elefante: Elefante,
  blackout: Blackout,
}

/**
 * Escenas del estilo diorama: el mismo escenario reimaginado, con la misma
 * ficha y los mismos parámetros. Una animación sin entrada aquí no tiene
 * diorama (y su ficha no debe declararlo en `looks`).
 */
export const DIORAMA_SCENES: Record<string, SceneComponent> = {
  'trono-rey': TronoDiorama,
  'biblioteca-cartografo': CartografoDiorama,
  'farol-enano': FarolDiorama,
}
