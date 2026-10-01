/**
 * La línea gráfica de "Había una vez", extraída de
 * `assets/referencia-linea-grafica.jpeg`.
 *
 * Diseño plano: colores planos, sin degradados ni sombras difusas. El volumen
 * se sugiere con un tono más oscuro del mismo color, nunca con blur. Todas las
 * animaciones tiran de aquí: si un color no está en esta tabla, no se usa.
 */

/** Chapa, tornillos y mamparos de la cabina. */
export const PANEL = {
  /** Fondo general entre placas. */
  room: '#eef1f5',
  /** Cara de una placa de instrumentos. */
  plate: '#dfe5ea',
  /** Placa clara (la que lleva los instrumentos grandes). */
  plateLight: '#e9edf1',
  /** Canto inferior de la placa: el mismo gris, un paso más oscuro. */
  plateEdge: '#c3ccd4',
  /** Tornillos de las esquinas. */
  screw: '#8d99a4',
  /** Carcasa negra de los instrumentos (radar, display, joystick). */
  bezel: '#2c323a',
  /** Interior de pantalla. */
  screen: '#1b2027',
  /** Retícula de las pantallas. */
  grid: '#2f9e8f',
} as const

/**
 * Tinta: texto y trazos finos que son el objeto (agujas, marcas de escala).
 * Nunca para rodear una forma: la línea gráfica no lleva contornos.
 */
export const INK = {
  line: '#1b1f24',
  text: '#1b1f24',
  textOnDark: '#e9edf1',
  /** Etiquetas secundarias bajo los mandos. */
  label: '#5b6570',
} as const

/** Acentos saturados. Son los únicos colores vivos permitidos. */
export const ACCENT = {
  red: '#e8453c',
  redDark: '#c3352d',
  blue: '#3b7dd8',
  blueDark: '#2d61a8',
  teal: '#17b498',
  tealDark: '#0f8b75',
  green: '#4caf6a',
  greenDark: '#3a8a52',
  amber: '#f2c230',
  amberDark: '#cb9e1c',
  orange: '#ef8a3c',
  orangeDark: '#c86c29',
  white: '#ffffff',
} as const

/** Paleta ofrecida en los selectores de color del panel de control. */
export const SWATCHES: { value: string; label: string }[] = [
  { value: ACCENT.red, label: 'Rojo' },
  { value: ACCENT.orange, label: 'Naranja' },
  { value: ACCENT.amber, label: 'Ámbar' },
  { value: ACCENT.green, label: 'Verde' },
  { value: ACCENT.teal, label: 'Verde azulado' },
  { value: ACCENT.blue, label: 'Azul' },
  { value: ACCENT.white, label: 'Blanco' },
  { value: PANEL.bezel, label: 'Grafito' },
]

/** El vacío al otro lado del parabrisas. */
export const SPACE = {
  /** Fondo del espacio: azul casi negro, nunca negro puro. */
  deep: '#141b26',
  /** Segundo plano de nebulosa. */
  nebula: '#22304a',
  star: '#ffffff',
  starDim: '#9fb3cc',
} as const

/**
 * Medidas del lenguaje: grosores y radios constantes en todo el kit.
 * Están en unidades del lienzo de diseño (ver STAGE), no en píxeles de pantalla.
 */
export const STROKE = {
  /** Trazo grueso (agujas grandes, cables). No es un contorno. */
  heavy: 6,
  /** Trazo normal. */
  regular: 4,
  /** Retícula y marcas finas. */
  hair: 2,
} as const

export const RADIUS = {
  plate: 14,
  instrument: 10,
  button: 8,
} as const

/**
 * Lienzo de diseño. Toda animación se dibuja en este espacio y el escenario la
 * escala; así la vista previa del panel y la proyección son idénticas.
 */
export const STAGE = { width: 1920, height: 1080 } as const

/** Familia tipográfica de los rótulos de cabina: geométrica, en mayúsculas. */
export const FONT = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif"

/**
 * Oscurece o aclara un color plano manteniendo el tono.
 * El volumen de esta línea gráfica se hace así, nunca con degradados ni blur.
 */
export function shade(hex: string, amount: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const mix = (c: number) =>
    Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount)
      .toString(16)
      .padStart(2, '0')
  return `#${mix((n >> 16) & 255)}${mix((n >> 8) & 255)}${mix(n & 255)}`
}

/**
 * Mezcla plana entre dos colores (0 = `a`, 1 = `b`). Es un color liso, no un
 * degradado: sirve para que un relleno cambie de tono con el tiempo.
 */
export function mix(a: string, b: string, t: number): string {
  const parse = (hex: string) => {
    const n = parseInt(hex.slice(1), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const k = Math.min(1, Math.max(0, t))
  const ca = parse(a)
  const cb = parse(b)
  return `#${ca.map((c, i) => Math.round(c + (cb[i] - c) * k).toString(16).padStart(2, '0')).join('')}`
}
