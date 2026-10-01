/**
 * Planetas de destino: los que se ven grandes, al acercarse a ellos.
 *
 * A diferencia de `Planet` (un fondo lejano en `space.tsx`), cada tipo tiene
 * su propia superficie. Mismo lenguaje plano: formas lisas recortadas al
 * disco y terminador por tono, sin contorno.
 *
 * La lista de opciones para el panel vive en la ficha de quien los use (las
 * fichas no pueden importar JSX); `WORLD_KINDS` la mantiene alineada.
 */
import React, { useId } from 'react'
import { ACCENT, PANEL, SPACE, shade } from '../../shared/palette'
import { SoftGlow, shadeFill, useRealistic } from './realism'

export const WORLD_KINDS = ['desertico', 'gaseoso', 'anillado', 'enano', 'oceanico', 'volcanico'] as const

export type WorldKind = (typeof WORLD_KINDS)[number]

/**
 * Tamaño relativo de cada tipo. Quien acerque un planeta multiplica su radio
 * por esto: así el enano llega más pequeño que los demás y se lee como enano.
 */
export const WORLD_SCALE: Record<WorldKind, number> = {
  desertico: 1,
  gaseoso: 1,
  anillado: 1,
  enano: 0.5,
  oceanico: 1,
  volcanico: 1,
}

export interface WorldPlanetProps {
  kind: WorldKind
  cx: number
  cy: number
  r: number
  /** Giro lento de la superficie, en segundos. */
  time?: number
}

export function WorldPlanet({ kind, cx, cy, r, time = 0 }: WorldPlanetProps) {
  // Id único por instancia: el mismo tipo puede estar a la vez en el preview
  // y en las miniaturas del panel, y compartir recorte los descuadraría.
  const id = `world-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const look = WORLDS[kind] ?? WORLDS.desertico
  const real = useRealistic()
  // La superficie se desliza muy despacio en horizontal: sugiere rotación.
  const spin = Math.sin(time * 0.05) * r * 0.06
  // Coordenadas de superficie en fracciones del radio.
  const at: At = (x, y) => ({ x: cx + x * r + spin, y: cy + y * r })

  return (
    <g>
      <defs>
        <clipPath id={`${id}-clip`}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
      </defs>
      {/* Realista: atmósfera, un halo claro alrededor del disco. */}
      <SoftGlow cx={cx} cy={cy} r={r * 1.3} tone="cool" opacity={0.8} />
      {look.ring && <WorldRing cx={cx} cy={cy} r={r} colors={look.ring} half="back" />}
      <circle cx={cx} cy={cy} r={r} fill={look.base} />
      <g clipPath={`url(#${id}-clip)`}>
        {look.surface(at, r)}
        {/* Terminador: la noche del planeta, un disco desplazado. */}
        <circle cx={cx + r * 0.66} cy={cy + r * 0.28} r={r * 1.02} fill={SPACE.deep} fillOpacity={0.45} />
        {real && <circle cx={cx} cy={cy} r={r} fill={shadeFill('sphere')} />}
      </g>
      {look.ring && <WorldRing cx={cx} cy={cy} r={r} colors={look.ring} half="front" />}
    </g>
  )
}

type At = (x: number, y: number) => { x: number; y: number }

interface WorldLook {
  base: string
  /** Colores del anillo (exterior, interior), si lo tiene. */
  ring?: [string, string]
  surface: (at: At, r: number) => React.ReactNode
}

/** Elipse de superficie, en fracciones del radio. */
function blot(at: At, r: number, x: number, y: number, rx: number, ry: number, fill: string, key: string) {
  const c = at(x, y)
  return <ellipse key={key} cx={c.x} cy={c.y} rx={rx * r} ry={ry * r} fill={fill} />
}

/** Mancha orgánica: polígono cerrado con curvas, en fracciones del radio. */
function landmass(at: At, points: [number, number][], fill: string, key: string) {
  const p = points.map(([x, y]) => at(x, y))
  let d = `M ${(p[0].x + p[p.length - 1].x) / 2} ${(p[0].y + p[p.length - 1].y) / 2}`
  for (let i = 0; i < p.length; i++) {
    const a = p[i]
    const b = p[(i + 1) % p.length]
    d += ` Q ${a.x} ${a.y} ${(a.x + b.x) / 2} ${(a.y + b.y) / 2}`
  }
  return <path key={key} d={`${d} Z`} fill={fill} />
}

/** Franja horizontal que cruza el disco entero. */
function band(at: At, r: number, y: number, h: number, fill: string, key: string) {
  const c = at(-1.2, y)
  return <rect key={key} x={c.x} y={c.y} width={r * 2.6} height={h * r} fill={fill} />
}

/** Trazo de superficie (grietas, ríos de lava). */
function trace(at: At, r: number, points: [number, number][], stroke: string, width: number, key: string) {
  return (
    <polyline
      key={key}
      points={points
        .map(([x, y]) => at(x, y))
        .map(p => `${p.x},${p.y}`)
        .join(' ')}
      fill="none"
      stroke={stroke}
      strokeWidth={r * width}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  )
}

const WORLDS: Record<WorldKind, WorldLook> = {
  // Rojo y seco: mares oscuros, cráteres con borde y un casquete polar.
  desertico: {
    base: ACCENT.orange,
    surface: (at, r) => [
      blot(at, r, -0.35, -0.15, 0.42, 0.16, shade(ACCENT.orange, -0.22), 'a'),
      blot(at, r, 0.3, 0.32, 0.46, 0.14, shade(ACCENT.orange, -0.22), 'b'),
      blot(at, r, -0.1, 0.62, 0.34, 0.1, shade(ACCENT.orange, -0.3), 'c'),
      blot(at, r, 0, -0.93, 0.5, 0.14, ACCENT.white, 'polo'),
      ...[
        [-0.5, 0.25, 0.09],
        [0.15, -0.4, 0.12],
        [0.5, -0.05, 0.07],
        [-0.2, 0.3, 0.06],
      ].flatMap(([x, y, s], i) => [
        blot(at, r, x, y, s, s, shade(ACCENT.orange, 0.2), `rim${i}`),
        blot(at, r, x + s * 0.18, y + s * 0.15, s * 0.8, s * 0.8, shade(ACCENT.orange, -0.3), `hole${i}`),
      ]),
    ],
  },
  // Gigante gaseoso: bandas de tonos cálidos y una gran tormenta.
  gaseoso: {
    base: ACCENT.amber,
    surface: (at, r) => [
      band(at, r, -0.8, 0.16, shade(ACCENT.orange, 0.1), 'b1'),
      band(at, r, -0.5, 0.12, shade(ACCENT.amber, 0.35), 'b2'),
      band(at, r, -0.28, 0.2, shade(ACCENT.orange, -0.05), 'b3'),
      band(at, r, 0.05, 0.1, shade(ACCENT.amber, 0.4), 'b4'),
      band(at, r, 0.22, 0.24, shade(ACCENT.orange, 0.15), 'b5'),
      band(at, r, 0.58, 0.14, shade(ACCENT.orange, -0.15), 'b6'),
      blot(at, r, 0.28, 0.34, 0.24, 0.12, shade(ACCENT.red, -0.1), 'tormenta'),
      blot(at, r, 0.28, 0.34, 0.14, 0.06, shade(ACCENT.red, 0.2), 'ojo'),
    ],
  },
  // Anillado: franjas suaves y un anillo doble que pasa por delante.
  anillado: {
    base: shade(ACCENT.teal, 0.25),
    ring: [shade(ACCENT.amber, 0.35), shade(ACCENT.teal, -0.1)],
    surface: (at, r) => [
      band(at, r, -0.62, 0.14, shade(ACCENT.teal, 0.05), 'b1'),
      band(at, r, -0.2, 0.22, shade(ACCENT.teal, 0.45), 'b2'),
      band(at, r, 0.3, 0.16, shade(ACCENT.teal, 0.05), 'b3'),
      band(at, r, 0.62, 0.12, shade(ACCENT.teal, 0.4), 'b4'),
    ],
  },
  // Planeta enano, a lo Plutón: hielo tostado, una gran llanura clara en forma
  // de corazón, un cinturón oscuro rojizo y cráteres pequeños.
  enano: {
    base: shade(ACCENT.orange, 0.5),
    surface: (at, r) => [
      landmass(at, [[-1, 0.12], [-0.62, -0.02], [-0.28, 0.08], [-0.22, 0.34], [-0.55, 0.48], [-1, 0.42]], shade(ACCENT.red, -0.38), 'cinturon'),
      landmass(at, [[0.95, 0.2], [0.7, 0.1], [0.55, 0.3], [0.75, 0.5], [0.95, 0.45]], shade(ACCENT.red, -0.38), 'cinturon-2'),
      landmass(at, [[0.08, -0.02], [0.26, -0.22], [0.46, -0.14], [0.52, 0.12], [0.32, 0.44], [0.1, 0.62], [-0.02, 0.36], [-0.16, 0.1], [-0.1, -0.14]], shade(ACCENT.blue, 0.86), 'corazon'),
      blot(at, r, 0.1, -0.62, 0.34, 0.14, shade(ACCENT.orange, 0.3), 'llanura'),
      ...[
        [-0.45, -0.4, 0.07],
        [0.55, -0.45, 0.05],
        [-0.3, 0.72, 0.06],
        [0.62, 0.62, 0.045],
      ].flatMap(([x, y, c], i) => [
        blot(at, r, x, y, c, c, shade(ACCENT.orange, 0.65), `rim${i}`),
        blot(at, r, x + c * 0.18, y + c * 0.15, c * 0.78, c * 0.78, shade(ACCENT.orange, 0.2), `hole${i}`),
      ]),
    ],
  },
  // Oceánico: mar, continentes verdes, casquete y nubes.
  oceanico: {
    base: ACCENT.blue,
    surface: (at, r) => [
      landmass(at, [[-0.7, -0.3], [-0.3, -0.5], [-0.05, -0.2], [-0.25, 0.1], [-0.55, 0.05]], ACCENT.green, 'l1'),
      landmass(at, [[0.15, 0.05], [0.55, -0.1], [0.75, 0.25], [0.45, 0.6], [0.2, 0.4]], ACCENT.green, 'l2'),
      landmass(at, [[-0.4, 0.45], [-0.15, 0.4], [-0.1, 0.65], [-0.35, 0.72]], shade(ACCENT.green, -0.2), 'l3'),
      blot(at, r, 0.45, 0.2, 0.12, 0.08, shade(ACCENT.green, -0.25), 'monte'),
      blot(at, r, 0, -0.95, 0.55, 0.14, ACCENT.white, 'polo'),
      ...[
        [-0.2, -0.62, 0.34],
        [0.4, -0.35, 0.26],
        [-0.55, 0.3, 0.22],
        [0.1, 0.78, 0.3],
      ].map(([x, y, w], i) => {
        const c = at(x - w / 2, y)
        return (
          <rect
            key={`nube${i}`}
            x={c.x}
            y={c.y}
            width={w * r}
            height={r * 0.07}
            rx={r * 0.035}
            fill={ACCENT.white}
            opacity={0.85}
          />
        )
      }),
    ],
  },
  // Volcánico: roca oscura con ríos y lagos de lava.
  volcanico: {
    base: shade(PANEL.bezel, 0.08),
    surface: (at, r) => [
      blot(at, r, 0.3, -0.35, 0.36, 0.18, shade(PANEL.bezel, 0.2), 'a'),
      blot(at, r, -0.4, 0.4, 0.4, 0.16, shade(PANEL.bezel, 0.2), 'b'),
      trace(at, r, [[-0.9, -0.1], [-0.5, 0], [-0.3, -0.3], [0.1, -0.2], [0.3, 0.1], [0.8, 0]], ACCENT.orange, 0.035, 'r1'),
      trace(at, r, [[-0.3, -0.3], [-0.2, -0.7]], ACCENT.orange, 0.035, 'r2'),
      trace(at, r, [[0.3, 0.1], [0.2, 0.5], [-0.1, 0.7]], ACCENT.orange, 0.035, 'r3'),
      blot(at, r, -0.5, 0, 0.1, 0.07, ACCENT.red, 'p1'),
      blot(at, r, 0.3, 0.1, 0.12, 0.08, ACCENT.red, 'p2'),
      blot(at, r, 0.3, 0.1, 0.06, 0.04, ACCENT.amber, 'p2c'),
      blot(at, r, -0.2, -0.7, 0.08, 0.06, ACCENT.amber, 'p3'),
    ],
  },
}

/** Anillo en dos mitades: la trasera va detrás del disco y la delantera encima. */
function WorldRing({
  cx,
  cy,
  r,
  colors,
  half,
}: {
  cx: number
  cy: number
  r: number
  colors: [string, string]
  half: 'back' | 'front'
}) {
  const arc = (rx: number, ry: number) =>
    `M ${cx - rx} ${cy} A ${rx} ${ry} 0 0 ${half === 'front' ? 0 : 1} ${cx + rx} ${cy}`
  return (
    <g transform={`rotate(-14 ${cx} ${cy})`} fill="none">
      <path d={arc(r * 1.9, r * 0.42)} stroke={colors[0]} strokeWidth={r * 0.14} />
      <path d={arc(r * 1.58, r * 0.35)} stroke={colors[1]} strokeWidth={r * 0.08} />
    </g>
  )
}
