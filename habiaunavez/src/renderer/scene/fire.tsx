/**
 * Fuego plano: llamas y resplandores para antorchas, velas y faroles.
 * Todo sale de `time`, y `seed` desacompasa llamas vecinas.
 */
import React from 'react'
import { ACCENT } from '../../shared/palette'
import { useRealistic } from './realism'

export function Flame({ x, y, size, time, flicker, seed }: { x: number; y: number; size: number; time: number; flicker: number; seed: number }) {
  const h = size * (1 + flicker * (0.14 * Math.sin(time * 11 + seed) + 0.08 * Math.sin(time * 23 + seed * 2.3)))
  const tip = flicker * size * 0.12 * Math.sin(time * 7 + seed * 1.7)
  const drop = (scale: number) => {
    const hh = h * scale
    const ww = size * 0.42 * scale
    return `M ${x + tip * scale} ${y - hh} C ${x + ww} ${y - hh * 0.45}, ${x + ww} ${y}, ${x} ${y} C ${x - ww} ${y}, ${x - ww} ${y - hh * 0.45}, ${x + tip * scale} ${y - hh} Z`
  }
  return (
    <g>
      <path d={drop(1)} fill={ACCENT.orange} />
      <path d={drop(0.66)} fill={ACCENT.amber} />
      <path d={drop(0.3)} fill={ACCENT.white} />
    </g>
  )
}

/**
 * Resplandor que respira con la llama. Plano: dos discos translúcidos. En
 * estilo realista, un degradado que se desvanece sin borde.
 */
export function Glow({ x, y, r, time, alpha, seed }: { x: number; y: number; r: number; time: number; alpha: number; seed: number }) {
  const rr = r * (1 + 0.05 * Math.sin(time * 9 + seed))
  if (useRealistic()) {
    return <circle cx={x} cy={y} r={rr * 1.6} fill="url(#rl-glowWarm)" opacity={Math.min(1, alpha * 3)} />
  }
  return (
    <g fill={ACCENT.amber}>
      <circle cx={x} cy={y} r={rr} opacity={alpha * 0.6} />
      <circle cx={x} cy={y} r={rr * 0.55} opacity={alpha} />
    </g>
  )
}
