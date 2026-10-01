/**
 * Guion de la intro del show — una sola fuente de verdad para los tiempos.
 *
 * El reloj arranca cuando el audio `audio/intro/intro.mpeg` empieza a sonar.
 * `at` son los segundos por defecto desde ese instante; el editor de la
 * pestaña "Intro del show" puede sobrescribirlos y los guarda en
 * `AppState.introTimings` (clave del cue → segundo).
 *
 * Un cue con `scene` cambia la escena en pantalla; los que tienen `scene: null`
 * disparan un efecto puntual (mostrar el subtítulo, teclear el código, cerrar).
 */
export type IntroSceneId =
  | 'idle'
  | 'brand'
  | 'jury'
  | 'map'
  | 'silence'
  | 'classified'
  | 'tag'
  | 'doors'
  | 'protocol'
  | 'code'
  | 'alarm'
  | 'destruct'

export type IntroCueKey =
  | 'curtain'
  | 'subtitle'
  | 'jury'
  | 'map'
  | 'silence'
  | 'classified'
  | 'tag'
  | 'doors'
  | 'protocol'
  | 'protocol-observe'
  | 'protocol-evaluate'
  | 'protocol-decide'
  | 'code-empty'
  | 'code-type'
  | 'alarm'
  | 'destruct'
  | 'end'

export interface IntroCue {
  key: IntroCueKey
  /** Segundo por defecto. El valor efectivo sale de `introTimings[key] ?? at`. */
  at: number
  label: string
  /** Escena que pasa a pantalla, o null si el cue sólo dispara un efecto. */
  scene: IntroSceneId | null
}

export const INTRO_CUES: IntroCue[] = [
  { key: 'curtain',    at: 2,  label: 'Se abre la cortinilla — A.I.S',   scene: 'brand' },
  { key: 'subtitle',   at: 6,  label: 'Subtítulo de la agencia',         scene: null },
  { key: 'jury',       at: 9,  label: 'Votación del jurado',             scene: 'jury' },
  { key: 'map',        at: 14, label: 'Mapa señalando la ubicación',     scene: 'map' },
  { key: 'silence',    at: 20, label: 'Celular en modo silencio',        scene: 'silence' },
  { key: 'classified', at: 24, label: 'Información clasificada',         scene: 'classified' },
  { key: 'tag',        at: 30, label: 'Etiqueta @falso_vacio',           scene: 'tag' },
  { key: 'doors',      at: 40, label: 'Puertas que se cierran y sellan', scene: 'doors' },
  { key: 'protocol',   at: 50,   label: 'Su misión es…',                 scene: 'protocol' },
  { key: 'protocol-observe',  at: 51,   label: '· Observar',              scene: null },
  { key: 'protocol-evaluate', at: 52.5, label: '· Evaluar',               scene: null },
  { key: 'protocol-decide',   at: 54,   label: '· Decidir',               scene: null },
  { key: 'code-empty', at: 55.5, label: 'Terminal vacío',                 scene: 'code' },
  { key: 'code-type',  at: 57.5, label: 'Ingreso del código 11-9-25',     scene: null },
  { key: 'alarm',      at: 60, label: 'Alarma',                          scene: 'alarm' },
  { key: 'destruct',   at: 66, label: 'Autodestrucción',                 scene: 'destruct' },
  { key: 'end',        at: 71, label: 'Fin — vuelve la cortinilla',      scene: null },
]

/** Separación mínima entre dos cues al arrastrarlos en el editor, en segundos. */
export const INTRO_CUE_MIN_GAP = 0.2

/** Cuenta atrás de la autodestrucción, en segundos. */
export const INTRO_DESTRUCT_FROM = 3

export const INTRO_TITLE = 'A.I.S'
export const INTRO_SUBTITLE = 'Agencia de improvisadores secretos'
export const INTRO_TAG = '@falso_vacio'
export const INTRO_CODE = '11-9-25'
export const INTRO_PROTOCOL = 'Protocolo: Misión improsible'

/** Resuelve el guion aplicando los ajustes manuales, ordenado por tiempo. */
export function resolveIntroCues(timings: Record<string, number> | undefined): IntroCue[] {
  return INTRO_CUES
    .map(cue => ({ ...cue, at: timings?.[cue.key] ?? cue.at }))
    .sort((a, b) => a.at - b.at)
}

/** Segundo en que termina la secuencia, ya con los ajustes aplicados. */
export function introEndAt(timings: Record<string, number> | undefined): number {
  return timings?.end ?? INTRO_CUES[INTRO_CUES.length - 1].at
}
