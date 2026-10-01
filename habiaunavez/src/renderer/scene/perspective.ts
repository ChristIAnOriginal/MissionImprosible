/**
 * Perspectiva de un punto para la cabina.
 *
 * La cabina es una caja: el encuadre completo es su boca (lo más cercano) y un
 * rectángulo menor, escalado hacia el punto de fuga, es el mamparo del fondo.
 * Techo, suelo y paredes son los cuatro trapecios que los unen, y todo converge
 * al mismo punto — que es lo que hace que se lea la profundidad.
 *
 * Cualquier cosa que se pegue a una pared (ventanas, tiras de luz, placas) debe
 * colocarse con estos helpers, no a ojo: así sigue la misma fuga que el resto.
 */
import { STAGE } from '../../shared/palette'

export interface Pt {
  x: number
  y: number
}

/** Punto de fuga, algo por encima del centro: la línea de horizonte. */
export const VP: Pt = { x: STAGE.width / 2, y: 400 }

/** Cuánto encoge el mamparo del fondo respecto al encuadre. Menos = más túnel. */
export const DEPTH = 0.66

/** Lleva un punto del plano cercano al plano del fondo. */
export function toFar(p: Pt, depth = DEPTH): Pt {
  return { x: VP.x + (p.x - VP.x) * depth, y: VP.y + (p.y - VP.y) * depth }
}

export function lerp(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

const NEAR = {
  topLeft: { x: 0, y: 0 },
  topRight: { x: STAGE.width, y: 0 },
  bottomLeft: { x: 0, y: STAGE.height },
  bottomRight: { x: STAGE.width, y: STAGE.height },
}

const FAR = {
  topLeft: toFar(NEAR.topLeft),
  topRight: toFar(NEAR.topRight),
  bottomLeft: toFar(NEAR.bottomLeft),
  bottomRight: toFar(NEAR.bottomRight),
}

/** El mamparo del fondo: donde van el parabrisas y el salpicadero. */
export const BULKHEAD = {
  left: FAR.topLeft.x,
  right: FAR.topRight.x,
  top: FAR.topLeft.y,
  bottom: FAR.bottomLeft.y,
  get width() {
    return this.right - this.left
  },
  get height() {
    return this.bottom - this.top
  },
}

/**
 * Punto sobre una pared lateral.
 * `u` es la profundidad (0 = borde de pantalla, 1 = mamparo del fondo) y `v` la
 * altura dentro de la pared a esa profundidad (0 = techo, 1 = suelo).
 */
export function wallPoint(side: 'left' | 'right', u: number, v: number): Pt {
  const nearTop = side === 'left' ? NEAR.topLeft : NEAR.topRight
  const nearBottom = side === 'left' ? NEAR.bottomLeft : NEAR.bottomRight
  const farTop = side === 'left' ? FAR.topLeft : FAR.topRight
  const farBottom = side === 'left' ? FAR.bottomLeft : FAR.bottomRight
  return lerp(lerp(nearTop, farTop, u), lerp(nearBottom, farBottom, u), v)
}

/**
 * Punto sobre el techo. `u` es la profundidad y `h` la posición a lo ancho
 * (0 = izquierda, 1 = derecha).
 */
export function ceilingPoint(u: number, h: number): Pt {
  const left = lerp(NEAR.topLeft, FAR.topLeft, u)
  const right = lerp(NEAR.topRight, FAR.topRight, u)
  return lerp(left, right, h)
}

/** Igual que `ceilingPoint` pero sobre el suelo. */
export function floorPoint(u: number, h: number): Pt {
  const left = lerp(NEAR.bottomLeft, FAR.bottomLeft, u)
  const right = lerp(NEAR.bottomRight, FAR.bottomRight, u)
  return lerp(left, right, h)
}

/**
 * Cualquier punto dentro de la caja: `u` profundidad, `h` posición a lo ancho,
 * `v` altura (0 = techo, 1 = suelo). Con esto se puede modelar una superficie
 * que no sea paralela al mamparo — por ejemplo un parabrisas envolvente, donde
 * cada luna está a su propia profundidad.
 */
export function boxPoint(u: number, h: number, v: number): Pt {
  return lerp(ceilingPoint(u, h), floorPoint(u, h), v)
}

/**
 * A qué profundidad está un punto que, visto desde el punto de fuga, cae a
 * cierta altura de pantalla. Sirve para que los bordes de una pieza apoyada en
 * el suelo (el pedestal) converjan de verdad al punto de fuga.
 */
export function depthAtY(y: number): number {
  return (STAGE.height - y) / (STAGE.height - VP.y)
}

/** Acerca o aleja un punto respecto al punto de fuga. */
export function towardVP(p: Pt, t: number): Pt {
  return lerp(p, VP, t)
}

/** Lo que encoge una pieza a una profundidad dada; para escalar botones. */
export function scaleAt(u: number): number {
  return 1 - u * (1 - DEPTH)
}

export function poly(points: Pt[]): string {
  return points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
}
