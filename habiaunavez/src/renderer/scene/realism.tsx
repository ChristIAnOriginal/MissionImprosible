/**
 * Estilo realista: luz, sombra y materiales sobre la misma composición plana.
 *
 * Las escenas no se duplican. Cada una lee el estilo con `useRealistic()` y,
 * en realista, añade capas encima de sus formas planas:
 *  - `Shaded`: repite una forma con un sombreado translúcido (cilindro,
 *    esfera, desvanecido…). Como el sombreado es blanco/negro transparente,
 *    sirve para cualquier color sin definir un degradado por pieza;
 *  - `SoftGlow`: resplandor radial que se desvanece, en vez de discos planos;
 *  - `Vignette`: oscurece los bordes del encuadre.
 *
 * Los degradados viven en `RealismDefs`, que el `Stage` monta una sola vez.
 * Sólo degradados — nada de `filter` ni `blur` —: se repintan cada fotograma
 * y los filtros hundirían la proyección.
 */
import React, { createContext, useContext } from 'react'
import { ACCENT, SPACE, STAGE, shade } from '../../shared/palette'
import type { Look } from '../../shared/types'

export const LookContext = createContext<Look>('plano')

export function useRealistic(): boolean {
  return useContext(LookContext) === 'realista'
}

export type ShadeKind =
  | 'cylX' // cilindro de pie: luz a la izquierda, sombra a la derecha
  | 'cylXRev' // el mismo, con la luz a la derecha
  | 'cylY' // cilindro tumbado: luz arriba, sombra abajo
  | 'fadeDown' // se oscurece hacia abajo
  | 'fadeUp' // se oscurece hacia arriba (suelos: el fondo, más oscuro)
  | 'sphere' // esfera con brillo arriba a la izquierda
  | 'sheen' // brillo especular en diagonal (metal, cera, barniz)
  | 'aged' // bordes tostados de papel viejo
  | 'glass' // reflejo de cristal: dos franjas claras en diagonal

export function shadeFill(kind: ShadeKind): string {
  return `url(#rl-${kind})`
}

type Stop = [offset: number, color: string, opacity: number]

function Linear({ id, x2 = 1, y2 = 0, stops }: { id: string; x2?: number; y2?: number; stops: Stop[] }) {
  return (
    <linearGradient id={id} x1={0} y1={0} x2={x2} y2={y2}>
      {stops.map(([o, c, a]) => (
        <stop key={o} offset={o} stopColor={c} stopOpacity={a} />
      ))}
    </linearGradient>
  )
}

function Radial({ id, cx = 0.5, cy = 0.5, r = 0.5, fx, fy, stops, user }: { id: string; cx?: number; cy?: number; r?: number; fx?: number; fy?: number; stops: Stop[]; user?: boolean }) {
  return (
    <radialGradient
      id={id}
      cx={cx}
      cy={cy}
      r={r}
      fx={fx ?? cx}
      fy={fy ?? cy}
      gradientUnits={user ? 'userSpaceOnUse' : 'objectBoundingBox'}
    >
      {stops.map(([o, c, a]) => (
        <stop key={o} offset={o} stopColor={c} stopOpacity={a} />
      ))}
    </radialGradient>
  )
}

const W = '#ffffff'
const K = SPACE.deep

/** Colores que tienen su propio resplandor: los acentos de pilotos y botones. */
const GLOW_COLORS = [ACCENT.teal, ACCENT.green, ACCENT.blue, ACCENT.red, ACCENT.amber, ACCENT.orange]
const glowId = (color: string) => `rl-glow-${color.slice(1).toLowerCase()}`

export function RealismDefs() {
  return (
    <defs>
      <Linear id="rl-cylX" stops={[[0, W, 0.26], [0.28, W, 0], [0.62, K, 0.1], [1, K, 0.42]]} />
      <Linear id="rl-cylXRev" stops={[[0, K, 0.42], [0.38, K, 0.1], [0.72, W, 0], [1, W, 0.26]]} />
      <Linear id="rl-cylY" x2={0} y2={1} stops={[[0, W, 0.3], [0.3, W, 0], [0.7, K, 0.12], [1, K, 0.4]]} />
      <Linear id="rl-fadeDown" x2={0} y2={1} stops={[[0, K, 0], [1, K, 0.5]]} />
      <Linear id="rl-fadeUp" x2={0} y2={1} stops={[[0, K, 0.55], [1, K, 0]]} />
      <Radial id="rl-sphere" cx={0.4} cy={0.38} r={0.62} fx={0.3} fy={0.26} stops={[[0, W, 0.5], [0.3, W, 0], [0.7, K, 0.12], [1, K, 0.5]]} />
      <Linear
        id="rl-sheen"
        x2={1}
        y2={1}
        stops={[[0, W, 0], [0.42, W, 0], [0.5, W, 0.3], [0.58, W, 0], [1, W, 0]]}
      />
      <Radial id="rl-aged" r={0.72} stops={[[0, ACCENT.orangeDark, 0], [0.6, ACCENT.orangeDark, 0.04], [1, shade(ACCENT.orange, -0.5), 0.5]]} />
      <Radial id="rl-glowWarm" stops={[[0, shade(ACCENT.amber, 0.5), 0.75], [0.25, ACCENT.amber, 0.35], [0.6, ACCENT.orange, 0.1], [1, ACCENT.orange, 0]]} />
      <Radial id="rl-glowCool" stops={[[0, W, 0.5], [0.3, SPACE.starDim, 0.2], [1, SPACE.starDim, 0]]} />
      <Radial id="rl-glowSun" stops={[[0, W, 0.9], [0.18, shade(ACCENT.amber, 0.6), 0.7], [0.45, ACCENT.amber, 0.18], [1, ACCENT.amber, 0]]} />
      {GLOW_COLORS.map(c => (
        <Radial key={c} id={glowId(c)} stops={[[0, c, 0.6], [0.32, c, 0.24], [1, c, 0]]} />
      ))}
      <Linear
        id="rl-glass"
        x2={1}
        y2={1}
        stops={[[0, W, 0.16], [0.3, W, 0.03], [0.46, W, 0], [0.56, W, 0.09], [0.64, W, 0], [1, W, 0]]}
      />
      <Radial id="rl-contact" stops={[[0, K, 0.6], [0.55, K, 0.3], [1, K, 0]]} />
      <Linear id="rl-beamWarm" x2={0} y2={1} stops={[[0, ACCENT.amber, 0.45], [1, ACCENT.amber, 0]]} />
      <Linear id="rl-beamWhite" x2={0} y2={1} stops={[[0, W, 0.5], [1, W, 0]]} />
      <Linear id="rl-beamCool" x2={0} y2={1} stops={[[0, SPACE.starDim, 0.35], [1, SPACE.starDim, 0]]} />
      <Radial
        id="rl-vignette"
        user
        cx={STAGE.width / 2}
        cy={STAGE.height / 2}
        r={STAGE.width * 0.62}
        stops={[[0, K, 0], [0.62, K, 0], [1, K, 0.6]]}
      />
    </defs>
  )
}

/**
 * Pinta la forma y, en realista, la repite encima rellena con un sombreado.
 * El hijo debe ser una forma con relleno propio (rect, polygon, path…).
 */
export function Shaded({ kind, children, opacity }: { kind: ShadeKind; children: React.ReactElement; opacity?: number }) {
  const real = useRealistic()
  if (!real) return children
  return (
    <>
      {children}
      {React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        fill: shadeFill(kind),
        stroke: undefined,
        opacity,
      })}
    </>
  )
}

/** Resplandor radial que se desvanece. Sólo en realista. */
export function SoftGlow({ cx, cy, r, tone = 'warm', opacity = 1 }: { cx: number; cy: number; r: number; tone?: 'warm' | 'cool' | 'sun'; opacity?: number }) {
  if (!useRealistic() || opacity <= 0) return null
  const id = tone === 'warm' ? 'rl-glowWarm' : tone === 'cool' ? 'rl-glowCool' : 'rl-glowSun'
  return <circle cx={cx} cy={cy} r={r} fill={`url(#${id})`} opacity={opacity} />
}

/**
 * Resplandor del color de una luz (piloto, botón, tira). Si el color no es un
 * acento con resplandor propio, usa el cálido. Sólo en realista.
 */
export function ColorGlow({ cx, cy, r, color, opacity = 1 }: { cx: number; cy: number; r: number; color: string; opacity?: number }) {
  if (!useRealistic() || opacity <= 0) return null
  const known = GLOW_COLORS.some(c => c.toLowerCase() === color.toLowerCase())
  return <circle cx={cx} cy={cy} r={r} fill={`url(#${known ? glowId(color) : 'rl-glowWarm'})`} opacity={opacity} />
}

/** Sombra de contacto: el suelo se oscurece bajo lo que apoya en él. Sólo en realista. */
export function ContactShadow({ cx, cy, rx, ry, opacity = 1 }: { cx: number; cy: number; rx: number; ry: number; opacity?: number }) {
  if (!useRealistic()) return null
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="url(#rl-contact)" opacity={opacity} />
}

/** Degradado de luz para un haz que baja de una ventana y se apaga en el suelo. */
export function beamFill(tone: 'warm' | 'white' | 'cool'): string {
  return tone === 'warm' ? 'url(#rl-beamWarm)' : tone === 'white' ? 'url(#rl-beamWhite)' : 'url(#rl-beamCool)'
}

/** Oscurece los bordes del encuadre. Va lo último. Sólo en realista. */
export function Vignette() {
  if (!useRealistic()) return null
  return <rect width={STAGE.width} height={STAGE.height} fill="url(#rl-vignette)" />
}
