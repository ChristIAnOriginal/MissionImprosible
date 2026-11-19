/**
 * Guion de la intro del show — una sola fuente de verdad para los tiempos.
 *
 * El reloj arranca cuando el audio `audio/intro/intro2.mpeg` empieza a sonar.
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
  | 'tag-handle'
  | 'doors'
  | 'protocol'
  | 'protocol-observe'
  | 'protocol-evaluate'
  | 'protocol-decide'
  | 'code-empty'
  | 'code-type'
  | 'alarm'
  | 'destruct'
  | 'destruct-count'
  | 'end'

export interface IntroCue {
  key: IntroCueKey
  /** Segundo por defecto. El valor efectivo sale de `introTimings[key] ?? at`. */
  at: number
  label: string
  /** Escena que pasa a pantalla, o null si el cue sólo dispara un efecto. */
  scene: IntroSceneId | null
}

// Tiempos medidos sobre la locución de intro2.mpeg (en el comentario, la frase).
export const INTRO_CUES: IntroCue[] = [
  { key: 'curtain',    at: 4,    label: 'Se abre la cortinilla — A.I.S',     scene: 'brand' },
  { key: 'subtitle',   at: 6.2,  label: 'Subtítulo de la agencia',           scene: null },        // «agencia de improvisadores»
  { key: 'jury',       at: 8.9,  label: 'Votación del jurado',               scene: 'jury' },      // «Cada uno de ustedes»
  { key: 'map',        at: 16.8, label: 'Mapa señalando la base secreta',    scene: 'map' },       // «en nuestra base secreta»
  { key: 'silence',    at: 19.5, label: 'Celular en modo silencio',          scene: 'silence' },   // «Desde este momento»
  { key: 'classified', at: 23.3, label: 'Información clasificada',           scene: 'classified' },// «Toda la información»
  { key: 'tag',        at: 28.7, label: 'La agencia alienta compartir',      scene: 'tag' },       // «Sin embargo, la agencia autoriza»
  { key: 'tag-handle', at: 37.9, label: 'Etiqueta @falso_vacio',             scene: null },        // «etiquétenos como arroba»
  { key: 'doors',      at: 47.3, label: 'Puertas que se cierran y sellan',   scene: 'doors' },     // «No intenten escapar»
  { key: 'protocol',   at: 55.6, label: 'Su misión es…',                     scene: 'protocol' },
  { key: 'protocol-observe',  at: 56.8, label: '· Observar',                 scene: null },
  { key: 'protocol-evaluate', at: 57.9, label: '· Evaluar',                  scene: null },
  { key: 'protocol-decide',   at: 58.7, label: '· Decidir',                  scene: null },
  { key: 'code-empty', at: 59.9, label: 'Terminal: inicio de la evaluación', scene: 'code' },      // «Damos inicio a la evaluación»
  { key: 'code-type',  at: 61.9, label: 'Se teclea el protocolo',            scene: null },        // «Protocolo, misión imposible»
  { key: 'alarm',      at: 63.4, label: 'Alarma',                            scene: 'alarm' },
  { key: 'destruct',   at: 64.4, label: 'Este mensaje se autodestruirá en…', scene: 'destruct' },  // «Este mensaje»
  { key: 'destruct-count', at: 66.3, label: 'Cuenta atrás 3, 2, 1',          scene: null },        // «tres»; explota en 69,5
  { key: 'end',        at: 71,   label: 'Fin — vuelve la cortinilla',        scene: null },
]

/** Separación mínima entre dos cues al arrastrarlos en el editor, en segundos. */
export const INTRO_CUE_MIN_GAP = 0.2

/** Cuenta atrás de la autodestrucción, en segundos. */
export const INTRO_DESTRUCT_FROM = 3

export const INTRO_TITLE = 'A.I.S'
export const INTRO_SUBTITLE = 'Agencia de improvisadores secretos'
export const INTRO_TAG = '@falso_vacio'
export const INTRO_PROTOCOL_LABEL = 'Protocolo'
export const INTRO_PROTOCOL = 'Misión improsible'

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
