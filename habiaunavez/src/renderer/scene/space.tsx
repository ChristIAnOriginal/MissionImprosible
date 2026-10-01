/**
 * Lo que se ve al otro lado del parabrisas: estrellas y planetas.
 * Mismo lenguaje plano que la cabina — relleno liso y sombras por tono, no por
 * degradado. En estilo realista los astros llevan volumen esférico y un halo,
 * y las estrellas brillantes un pequeño resplandor.
 */
import React, { useMemo } from 'react'
import { SPACE, shade } from '../../shared/palette'
import { SoftGlow, shadeFill, useRealistic } from './realism'

/**
 * Ruido determinista. Las estrellas tienen que caer en el mismo sitio en la
 * vista previa y en la proyección, así que nada de Math.random().
 */
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

export interface StarfieldProps {
  /** Reloj de la animación, en segundos. */
  time: number
  count: number
  /** Multiplicador de fuga. 0 deja las estrellas quietas. */
  speed: number
  /** Punto de fuga, en el lienzo de diseño. */
  originX: number
  originY: number
  /** Radio al que la estrella sale de cuadro. */
  reach: number
}

/**
 * Estrellas en fuga desde un punto. Cada una recorre su radio en bucle; la
 * posición sale de `time`, nunca de un estado acumulado, para que pausa,
 * velocidad y reinicio funcionen solos.
 */
export function Starfield({ time, count, speed, originX, originY, reach }: StarfieldProps) {
  // Ángulo y fase son fijos por estrella: sólo el avance depende del reloj.
  const seeds = useMemo(
    () =>
      Array.from({ length: Math.round(count) }, (_, i) => ({
        angle: hash(i) * Math.PI * 2,
        phase: hash(i + 1000),
        size: 1 + hash(i + 2000) * 2.2,
      })),
    [count]
  )

  return (
    <g>
      {seeds.map((s, i) => {
        const t = (s.phase + time * speed * 0.14) % 1
        // Cuadrático: lento al fondo y acelerando al pasar de largo.
        const dist = t * t * reach
        const x = originX + Math.cos(s.angle) * dist
        const y = originY + Math.sin(s.angle) * dist
        const scale = 0.25 + t * 1.6
        // Las estrellas nacen tenues para que no aparezcan de golpe en el centro.
        const fade = Math.min(1, t * 6)
        const streak = speed > 0.9 ? dist * 0.055 * (speed - 0.6) : 0

        if (streak > 3) {
          const back = 1 - streak / Math.max(dist, 1)
          return (
            <line
              key={i}
              x1={originX + Math.cos(s.angle) * dist * back}
              y1={originY + Math.sin(s.angle) * dist * back}
              x2={x}
              y2={y}
              stroke={SPACE.star}
              strokeOpacity={fade * 0.9}
              strokeWidth={s.size * scale}
              strokeLinecap="round"
            />
          )
        }
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={s.size * scale * 0.6}
            fill={t > 0.55 ? SPACE.star : SPACE.starDim}
            fillOpacity={fade}
          />
        )
      })}
    </g>
  )
}

export interface PlanetProps {
  cx: number
  cy: number
  /** Radio en el lienzo de diseño. */
  r: number
  color: string
  ring?: boolean
  /** Giro lento de las bandas, en segundos. */
  time?: number
}

/** Planeta plano: disco, bandas, terminador duro y anillo opcional. */
export function Planet({ cx, cy, r, color, ring = false, time = 0 }: PlanetProps) {
  const id = `planet-${Math.round(cx)}-${Math.round(cy)}`
  const band = shade(color, -0.22)
  const dark = shade(color, -0.42)
  // Las bandas suben y bajan muy despacio: sugiere rotación sin deformar nada.
  const drift = Math.sin(time * 0.25) * r * 0.08
  const real = useRealistic()

  return (
    <g>
      <defs>
        <clipPath id={`${id}-clip`}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>

      {ring && (
        <ellipse
          cx={cx}
          cy={cy}
          rx={r * 1.85}
          ry={r * 0.44}
          fill="none"
          stroke={shade(color, 0.25)}
          strokeWidth={r * 0.11}
          transform={`rotate(-18 ${cx} ${cy})`}
        />
      )}

      <SoftGlow cx={cx} cy={cy} r={r * 1.45} tone="cool" opacity={0.7} />
      <circle cx={cx} cy={cy} r={r} fill={color} />

      <g clipPath={`url(#${id}-clip)`}>
        <rect x={cx - r} y={cy - r * 0.46 + drift} width={r * 2} height={r * 0.2} fill={band} />
        <rect x={cx - r} y={cy + r * 0.12 + drift} width={r * 2} height={r * 0.32} fill={band} />
        {/* Terminador: un disco oscuro desplazado, recortado al planeta. */}
        <circle cx={cx + r * 0.62} cy={cy + r * 0.22} r={r} fill={dark} fillOpacity={0.55} />
        {real && <circle cx={cx} cy={cy} r={r} fill={shadeFill('sphere')} />}
      </g>

      {ring && (
        // Mitad delantera del anillo, por encima del disco.
        <path
          d={`M ${cx - r * 1.85} ${cy} A ${r * 1.85} ${r * 0.44} 0 0 0 ${cx + r * 1.85} ${cy}`}
          fill="none"
          stroke={shade(color, 0.25)}
          strokeWidth={r * 0.11}
          transform={`rotate(-18 ${cx} ${cy})`}
        />
      )}

    </g>
  )
}

/** Manchón de nebulosa: formas planas superpuestas, sin degradados. */
export function Nebula({ color, time = 0 }: { color: string; time?: number }) {
  const drift = Math.sin(time * 0.08) * 40
  return (
    <g fillOpacity={0.5}>
      <ellipse cx={480 + drift} cy={300} rx={520} ry={190} fill={color} />
      <ellipse cx={1380 - drift} cy={470} rx={430} ry={150} fill={shade(color, 0.12)} fillOpacity={0.7} />
      <ellipse cx={900} cy={180 + drift * 0.4} rx={360} ry={120} fill={shade(color, -0.15)} />
    </g>
  )
}

/** Fondo del vacío. Azul muy oscuro: negro puro rompe la línea gráfica. */
export function Void() {
  return <rect x={0} y={0} width={1920} height={1080} fill={SPACE.deep} />
}

export interface MoonProps {
  cx: number
  cy: number
  r: number
  /** 0 = llena, 0.5 = media, 1 = nueva. */
  phase?: number
  color?: string
  craters?: boolean
}

/**
 * Luna plana: disco pálido, cráteres y un terminador de borde duro.
 * El terminador es un disco oscuro desplazado y recortado al disco de la luna;
 * desplazarlo es lo que da la fase, sin degradados de por medio.
 */
export function Moon({ cx, cy, r, phase = 0.28, color = '#dfe5ea', craters = true }: MoonProps) {
  const id = `moon-${Math.round(cx)}-${Math.round(cy)}`
  const crater = shade(color, -0.16)
  // La cara no iluminada sale del color del cielo, no del de la luna: si se
  // oscureciera el gris de la luna quedaría más clara que el fondo.
  const shadow = shade(SPACE.deep, 0.1)

  // Cráteres fijos, en fracciones del radio: la luna siempre es la misma luna.
  const spots: [number, number, number][] = [
    [-0.34, -0.3, 0.2],
    [0.16, -0.46, 0.12],
    [-0.1, 0.22, 0.26],
    [0.42, 0.3, 0.14],
    [-0.52, 0.34, 0.11],
    [0.08, -0.06, 0.08],
  ]

  return (
    <g>
      <defs>
        <clipPath id={`${id}-clip`}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      <SoftGlow cx={cx} cy={cy} r={r * 1.9} tone="cool" opacity={1} />
      <circle cx={cx} cy={cy} r={r} fill={color} />
      <g clipPath={`url(#${id}-clip)`}>
        {craters &&
          spots.map(([dx, dy, dr], i) => (
            <circle key={i} cx={cx + dx * r} cy={cy + dy * r} r={dr * r} fill={crater} />
          ))}
        <circle cx={cx + (1 - phase) * 2 * r} cy={cy} r={r * 1.02} fill={shadow} />
        {useRealistic() && <circle cx={cx} cy={cy} r={r} fill={shadeFill('sphere')} opacity={0.7} />}
      </g>
    </g>
  )
}

/**
 * Estrellas quietas, repartidas por todo el lienzo. No dependen del reloj: es
 * un cielo parado, para escenas en las que nada se mueve.
 */
export function StillStars({ count, seed = 0 }: { count: number; seed?: number }) {
  const stars = useMemo(
    () =>
      Array.from({ length: Math.round(count) }, (_, i) => {
        const n = i + seed * 7919
        return {
          x: hash(n) * 1920,
          y: hash(n + 500) * 1080,
          size: 1.2 + hash(n + 1500) * 2.4,
          dim: hash(n + 2500) > 0.55,
        }
      }),
    [count, seed]
  )

  const real = useRealistic()
  return (
    <g>
      {real &&
        stars
          .filter(s => !s.dim && s.size > 2.6)
          .map((s, i) => <circle key={`g${i}`} cx={s.x} cy={s.y} r={s.size * 5} fill="url(#rl-glowCool)" opacity={0.5} />)}
      {stars.map((s, i) => (
        <circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={s.size}
          fill={s.dim ? SPACE.starDim : SPACE.star}
          fillOpacity={s.dim ? 0.55 : 0.9}
        />
      ))}
    </g>
  )
}
