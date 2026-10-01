/**
 * Perspectiva de un punto para fondos de sala (el salón del trono, la
 * biblioteca…). La cabina tiene la suya en `perspective.ts`, atada a su
 * encuadre; esta es genérica: cada escena elige su punto de fuga y su fondo.
 *
 * La sala es una caja de 1920×1080 de boca. Un punto se da con `x`, `y` en el
 * plano cercano y una profundidad `w` (0 = boca, 1 = pared del fondo).
 */
export interface Pt {
  x: number
  y: number
}

export interface Room {
  vp: Pt
  /** Escala a una profundidad. No es lineal: pasos iguales de `w` se acortan al alejarse. */
  depthScale: (w: number) => number
  /** Punto de la sala en pantalla. */
  P: (x: number, y: number, w: number) => Pt
  /** Transforma un dibujo hecho a escala del encuadre en un plano paralelo al fondo. */
  onPlane: (w: number) => string
}

/**
 * @param vp   punto de fuga, en pantalla
 * @param back escala de la pared del fondo respecto al encuadre (0,5 = la mitad)
 */
export function createRoom(vp: Pt, back: number): Room {
  const k = 1 / back - 1
  const depthScale = (w: number) => 1 / (1 + k * w)
  return {
    vp,
    depthScale,
    P: (x, y, w) => {
      const s = depthScale(w)
      return { x: vp.x + (x - vp.x) * s, y: vp.y + (y - vp.y) * s }
    },
    onPlane: w => {
      const s = depthScale(w)
      return `translate(${vp.x * (1 - s)} ${vp.y * (1 - s)}) scale(${s})`
    },
  }
}

export function pts(list: Pt[]): string {
  return list.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
}

export function lerpPt(a: Pt, b: Pt, t: number): Pt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

/**
 * Punto dentro de un cuadrilátero (esquinas en orden: arriba-izq, arriba-der,
 * abajo-der, abajo-izq). Sirve para dibujar sobre una superficie ya puesta en
 * perspectiva — un mapa en la pared, una hoja sobre un tablero —.
 */
export function quadPoint(q: [Pt, Pt, Pt, Pt], u: number, v: number): Pt {
  return lerpPt(lerpPt(q[0], q[1], u), lerpPt(q[3], q[2], u), v)
}

/** Ruido determinista: nada de Math.random(), preview y proyección iguales. */
export function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}
