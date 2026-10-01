/**
 * Estilo diorama: el escenario como decorado de capas recortadas.
 *
 * Sigue la línea gráfica — rellenos planos, sin contornos, volumen por tono —
 * y busca profundidad y luz con recursos también planos:
 *  - capas a distintas profundidades que se desplazan con una deriva lenta de
 *    cámara (parallax): las cercanas se mueven más;
 *  - bruma entre capas: lo lejano se funde con el color del aire;
 *  - piezas recortadas con una sombra dura desplazada (`Cut`);
 *  - rayos de luz de bordes duros, charcos de luz en el suelo y bordes
 *    iluminados del lado de la fuente.
 *
 * Todo sale de `time`; nada de degradados ni filtros.
 */
import React from 'react'
import { STAGE } from '../../shared/palette'

/** Deriva de la cámara: un vaivén lento en los dos ejes. */
export function cameraDrift(time: number) {
  return { x: Math.sin(time * 0.11) * 30, y: Math.sin(time * 0.07 + 1) * 9 }
}

/**
 * Capa a una profundidad: 0 = el fondo (no se mueve), 1 = pegada a la cámara.
 * Se desplaza con la deriva en proporción a lo cerca que está.
 */
export function Layer({ depth, time, children }: { depth: number; time: number; children: React.ReactNode }) {
  const d = cameraDrift(time)
  return <g transform={`translate(${(d.x * depth).toFixed(2)} ${(d.y * depth).toFixed(2)})`}>{children}</g>
}

/** Bruma: un velo del color del aire entre capas. Más opaca = más lejos queda lo de detrás. */
export function Haze({ color, opacity }: { color: string; opacity: number }) {
  if (opacity <= 0) return null
  return <rect x={-60} y={-60} width={STAGE.width + 120} height={STAGE.height + 120} fill={color} opacity={opacity} />
}

/**
 * Pieza recortada: la forma y, debajo, su sombra dura desplazada, como un
 * recorte de cartón separado del fondo.
 */
export function Cut({
  d,
  fill,
  shadow,
  dx = 12,
  dy = 14,
  shadowOpacity = 0.28,
}: {
  d: string
  fill: string
  shadow: string
  dx?: number
  dy?: number
  shadowOpacity?: number
}) {
  return (
    <>
      <path d={d} fill={shadow} opacity={shadowOpacity} transform={`translate(${dx} ${dy})`} />
      <path d={d} fill={fill} />
    </>
  )
}

/**
 * Abanico de rayos de luz de bordes duros desde un punto. Los rayos respiran
 * un poco en anchura y opacidad, como la luz entre el polvo.
 */
export function Rays({
  x,
  y,
  from,
  to,
  count,
  length,
  color,
  opacity,
  time,
  seed = 0,
}: {
  x: number
  y: number
  /** Ángulos en radianes (0 = derecha, π/2 = abajo). */
  from: number
  to: number
  count: number
  length: number
  color: string
  opacity: number
  time: number
  seed?: number
}) {
  if (opacity <= 0) return null
  const step = (to - from) / count
  return (
    <g fill={color}>
      {Array.from({ length: count }, (_, i) => {
        const a = from + step * (i + 0.5) + Math.sin(time * 0.3 + i * 1.7 + seed) * step * 0.12
        const half = step * (0.18 + 0.1 * Math.sin(time * 0.5 + i * 2.3 + seed))
        const p1 = { x: x + Math.cos(a - half) * length, y: y + Math.sin(a - half) * length }
        const p2 = { x: x + Math.cos(a + half) * length, y: y + Math.sin(a + half) * length }
        const breathe = 0.7 + 0.3 * Math.sin(time * 0.4 + i * 1.3 + seed)
        return (
          <polygon
            key={i}
            points={`${x},${y} ${p1.x.toFixed(1)},${p1.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`}
            opacity={opacity * breathe}
          />
        )
      })}
    </g>
  )
}

/** Charco de luz en el suelo: elipses concéntricas translúcidas, sin degradado. */
export function LightPool({ cx, cy, rx, ry, color, alpha }: { cx: number; cy: number; rx: number; ry: number; color: string; alpha: number }) {
  if (alpha <= 0) return null
  return (
    <g fill={color}>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} opacity={alpha * 0.14} />
      <ellipse cx={cx} cy={cy} rx={rx * 0.66} ry={ry * 0.66} opacity={alpha * 0.16} />
      <ellipse cx={cx} cy={cy} rx={rx * 0.36} ry={ry * 0.36} opacity={alpha * 0.2} />
    </g>
  )
}

/** Halo plano alrededor de una fuente: anillos concéntricos translúcidos. */
export function Halo({ cx, cy, r, color, alpha }: { cx: number; cy: number; r: number; color: string; alpha: number }) {
  if (alpha <= 0) return null
  return (
    <g fill={color}>
      {[1, 0.72, 0.48].map(k => (
        <circle key={k} cx={cx} cy={cy} r={r * k} opacity={alpha * 0.12} />
      ))}
    </g>
  )
}

/** Estrella de cinco puntas como trazado. */
export function starPath(cx: number, cy: number, r: number, inner = 0.45): string {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 === 0 ? r : r * inner
    pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`)
  }
  return `M ${pts.join(' L ')} Z`
}

/**
 * Estrella de papel colgada de un hilo, como en un decorado de teatro. Se mece
 * desde el punto de cuelgue; `lit` es el lado que recibe la luz.
 */
export function HangingStar({
  x,
  length,
  size,
  time,
  seed,
  color,
  lit,
  string,
}: {
  x: number
  length: number
  size: number
  time: number
  seed: number
  color: string
  lit: string
  string: string
}) {
  const swing = Math.sin(time * (0.6 + (seed % 5) * 0.08) + seed) * 3.5
  const cy = length
  return (
    <g transform={`rotate(${swing.toFixed(2)} ${x} -20)`}>
      <line x1={x} y1={-20} x2={x} y2={cy - size} stroke={string} strokeWidth={2} />
      <path d={starPath(x + 6, cy + 7, size)} fill={string} opacity={0.35} />
      <path d={starPath(x, cy, size)} fill={color} />
      {/* Brillo: una estrella menor y más clara, desplazada hacia la luz. */}
      <path d={starPath(x + size * 0.12, cy - size * 0.1, size * 0.5)} fill={lit} opacity={0.55} />
    </g>
  )
}
