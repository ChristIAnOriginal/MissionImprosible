/**
 * Contrato entre el gestor y las animaciones.
 *
 * Una animación declara sus parámetros como datos (`ParamSpec[]`); el panel de
 * control construye los mandos solo, y el proceso main valida y persiste los
 * valores. Ninguna animación escribe interfaz de control propia.
 */

export type ParamValue = number | string | boolean

export type ParamValues = Record<string, ParamValue>

interface ParamBase {
  key: string
  label: string
  /** Texto corto bajo el mando. Opcional. */
  hint?: string
  /** Agrupa mandos en tarjetas del panel. Por defecto, 'General'. */
  group?: string
  /** Sólo se muestra en el panel cuando otro parámetro tiene cierto valor. */
  showIf?: { key: string; equals: ParamValue }
  /**
   * Control rápido: se pinta justo bajo la vista previa, para la animación en
   * pantalla, en vez de con el resto de parámetros. Para lo que se toca en
   * pleno show.
   */
  quick?: boolean
}

export interface NumberParam extends ParamBase {
  kind: 'number'
  min: number
  max: number
  step: number
  /** Se pinta junto al valor: 'px', '°', 'x'… */
  unit?: string
  default: number
}

export interface BooleanParam extends ParamBase {
  kind: 'boolean'
  default: boolean
  /**
   * Se pinta como un botón que alterna el valor en vez de un interruptor.
   * `toTrue` es el texto para pasar a verdadero y `toFalse` para volver.
   * La escena puede animar el cambio con `since` (ver `SceneProps`).
   */
  button?: { toTrue: string; toFalse: string }
}

export interface ColorParam extends ParamBase {
  kind: 'color'
  default: string
}

export interface SelectParam extends ParamBase {
  kind: 'select'
  options: { value: string; label: string }[]
  default: string
  /**
   * Juego de miniaturas del panel (`OPTION_PREVIEWS`, en el renderer). Si lo
   * hay, las opciones se muestran como cuadros con imagen en vez de chips.
   */
  preview?: string
}

export interface TextParam extends ParamBase {
  kind: 'text'
  maxLength?: number
  default: string
}

export type ParamSpec = NumberParam | BooleanParam | ColorParam | SelectParam | TextParam

/**
 * Estilo de dibujo:
 *  - `plano`: la línea gráfica de la referencia;
 *  - `realista`: la misma composición con luz, sombra y materiales encima;
 *  - `diorama`: el escenario reimaginado como decorado de capas recortadas,
 *    con profundidad y juego de luces, dentro de la línea gráfica.
 */
export type Look = 'plano' | 'realista' | 'diorama'

export const LOOKS: Look[] = ['plano', 'realista', 'diorama']

export const LOOK_LABELS: Record<Look, string> = {
  plano: 'Plano',
  realista: 'Realista',
  diorama: 'Diorama',
}

/** Ficha de una animación. Datos puros: la importa también el proceso main. */
export interface AnimationMeta {
  id: string
  name: string
  /** Una frase para la lista del panel. */
  description: string
  /** Color de acento de la tarjeta en la lista. */
  accent: string
  /**
   * Estilos que tiene además del plano. Si el estilo elegido no está aquí, la
   * animación se dibuja plana.
   */
  looks?: Exclude<Look, 'plano'>[]
  params: ParamSpec[]
}

/**
 * Ficha de una transición: una escena con principio y fin que enlaza dos
 * animaciones. El cambio de animación ocurre **al terminar** la transición,
 * nunca antes.
 */
export interface TransitionMeta {
  id: string
  name: string
  description: string
  /**
   * Animación para la que está pensada como punto de partida. Sin ella, la
   * transición es genérica: vale entre dos animaciones cualesquiera.
   */
  from?: string
  /** Destino sugerido: se pone en «siguiente» al soltarla si está vacía. */
  to?: string
  accent: string
  /**
   * Color con el que termina la transición, si acaba en un destello. La
   * animación de destino arranca saliendo de ese color, en `FLASH_OUT_KEY` ms.
   */
  exitFlash?: string
  /**
   * Estilos que tiene además del plano. Si el elegido no está aquí, la
   * transición se dibuja plana.
   */
  looks?: Exclude<Look, 'plano'>[]
  /**
   * La escena recibe dibujadas la animación de salida y la de destino
   * (`from` y `to` en sus props) para mezclarlas, como un fundido.
   */
  showsScenes?: boolean
  /**
   * Toda transición debe declarar un parámetro numérico con la clave
   * `DURATION_KEY`: es lo que el proceso main usa para saber cuándo termina.
   */
  params: ParamSpec[]
}

/** Clave obligatoria del parámetro de duración de una transición. */
export const DURATION_KEY = 'durationMs'

/** Parámetro opcional: cuánto tarda el destino en salir del destello. */
export const FLASH_OUT_KEY = 'flashOutMs'

/** Parámetro opcional: volumen del audio de la transición, de 0 a 1. */
export const VOLUME_KEY = 'volume'

export function transitionDuration(meta: TransitionMeta, values: ParamValues | undefined): number {
  const raw = values?.[DURATION_KEY]
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  const spec = meta.params.find(p => p.key === DURATION_KEY)
  return spec && spec.kind === 'number' ? spec.default : 6000
}

/** Transición en curso. `elapsedMs` acumula lo ya corrido antes de una pausa. */
export interface RunningTransition {
  id: string
  /** Animación que queda activa al terminar. */
  to: string
  /** Último instante en que echó a andar; null mientras está en pausa. */
  startedAt: number | null
  elapsedMs: number
  /**
   * Valores y estilo con los que queda el destino, si vienen de una
   * configuración del guion. Se aplican al terminar; mientras, el fundido ya
   * los usa para dibujarlo.
   */
  toValues?: ParamValues
  toLook?: Look
  /** Paso del guion al que lleva, si la lanzó el guion. */
  step?: number
}

/**
 * Lo que está preparado para salir: la transición y la animación que quedará
 * activa al terminarla. Se arma arrastrando desde las listas del panel.
 */
export interface Cue {
  transitionId: string | null
  nextId: string | null
}

/**
 * Configuración guardada de una escena: sus parámetros y, si la escena tiene
 * varios estilos, el estilo con el que se guardó.
 */
export interface Preset {
  id: string
  name: string
  values: ParamValues
  look?: Look
  savedAt: number
}

/** Largo máximo del nombre de una configuración. */
export const PRESET_NAME_MAX = 40

/**
 * Paso de un guion: la animación que queda en pantalla y la transición con la
 * que se llega a ella, cada una con su configuración guardada (o la actual si
 * no tiene). En el primer paso la transición no se usa.
 */
export interface GuionStep {
  id: string
  animationId: string
  animationPresetId: string | null
  /** Sin transición se usa la genérica, `GENERIC_TRANSITION_ID`. */
  transitionId: string | null
  transitionPresetId: string | null
}

/** Secuencia fija de animaciones que se recorre con «Siguiente». */
export interface Guion {
  id: string
  name: string
  steps: GuionStep[]
}

/** Transición que usa un paso del guion que no declara ninguna. */
export const GENERIC_TRANSITION_ID = 'fundido'

/** Estado del espectáculo, autoritativo en el proceso main. */
export interface ShowState {
  activeId: string
  playing: boolean
  /** Multiplicador de velocidad del reloj de animación. */
  speed: number
  /**
   * Sube en cada reinicio. Los relojes de la proyección y de la vista previa
   * vuelven a cero cuando cambia, para que no queden desfasados.
   */
  epoch: number
  /** Valores por animación y por transición; se conservan al cambiar. */
  values: Record<string, ParamValues>
  /** Transición en marcha, si la hay. Mientras dure, es lo que se proyecta. */
  running: RunningTransition | null
  cue: Cue
  /**
   * Transición que acaba de terminar, mientras su destello se disuelve sobre
   * la animación de destino. Es de sesión: no se persiste.
   */
  arrival: string | null
  /** Estilo de dibujo global: se aplica a toda animación que lo tenga. */
  look: Look
  /** Configuraciones guardadas, por escena (animación o transición). */
  presets: Record<string, Preset[]>
  guiones: Guion[]
  /**
   * `id` es el guion que se edita en el panel. Con `step` en un número está el
   * modo guion: la cola la arma el guion y «Siguiente» avanza un paso.
   */
  guion: { id: string | null; step: number | null }
}

export interface DisplayInfo {
  id: number
  label: string
  isPrimary: boolean
}

export const SPEED_LIMITS = { min: 0.1, max: 3 } as const

// ----- Utilidades de parámetros ------------------------------------------

export function defaultsOf(meta: { params: ParamSpec[] }): ParamValues {
  return Object.fromEntries(meta.params.map(p => [p.key, p.default]))
}

/**
 * Devuelve los valores de una animación completos y dentro de rango. Un valor
 * guardado que ya no encaje con la ficha (parámetro retirado, tipo cambiado)
 * se descarta en favor del que declara la animación.
 */
export function sanitizeValues(
  meta: { params: ParamSpec[] },
  stored: ParamValues | undefined
): ParamValues {
  const out: ParamValues = {}
  for (const spec of meta.params) {
    const raw = stored?.[spec.key]
    switch (spec.kind) {
      case 'number': {
        const n = typeof raw === 'number' && Number.isFinite(raw) ? raw : spec.default
        out[spec.key] = Math.min(spec.max, Math.max(spec.min, n))
        break
      }
      case 'boolean':
        out[spec.key] = typeof raw === 'boolean' ? raw : spec.default
        break
      case 'color':
        out[spec.key] = typeof raw === 'string' && /^#[0-9a-f]{6}$/i.test(raw) ? raw : spec.default
        break
      case 'select':
        out[spec.key] = spec.options.some(o => o.value === raw) ? (raw as string) : spec.default
        break
      case 'text':
        out[spec.key] =
          typeof raw === 'string' ? raw.slice(0, spec.maxLength ?? 120) : spec.default
        break
    }
  }
  return out
}
