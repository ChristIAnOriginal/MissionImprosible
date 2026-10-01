/**
 * "Biblioteca del cartógrafo" en estilo diorama: el taller sale al exterior.
 *
 * Sobre la curva de un planeta pequeño, como un decorado de teatro: cielo
 * pintado con nubes, estrellas de papel colgadas de hilos, torres de libros
 * gigantes, un mapa enorme colgado entre dos postes, un libro abierto que hace
 * de tarima para la mesa de dibujo, un globo, un telescopio que apunta al
 * astro y un farolillo.
 *
 * Profundidad: seis capas con parallax y bruma entre ellas; las pilas del
 * primer plano son casi siluetas. Luz: el astro (sol o luna según la hora)
 * entra por la derecha con rayos y sombras largas hacia la izquierda; el
 * farolillo da la luz cálida de cerca.
 *
 * Usa la misma ficha que el plano: hora, haz de luz, farol, estilo de los
 * mapas, ruta trazándose, globo y su giro, llama.
 */
import React from 'react'
import { ACCENT, PANEL, SPACE, STAGE, mix, shade } from '../../shared/palette'
import type { SceneProps } from '../../renderer/scene/contract'
import { Flame } from '../../renderer/scene/fire'
import { hash } from '../../renderer/scene/room'
import { HangingStar, Halo, Haze, Layer, LightPool, Rays } from '../../renderer/scene/diorama'

type Light = 'dia' | 'atardecer' | 'noche'
type MapStyle = 'pergamino' | 'nautico' | 'plano'

interface Mood {
  sky: [string, string, string]
  cloud: string
  haze: string
  /** Color de la luz del astro. */
  key: string
  /** Cuánto se apagan los objetos (0 = pleno día). */
  dim: number
  body: 'sun' | 'moon'
  source: { x: number; y: number; r: number }
  lamp: number
}

const MOOD: Record<Light, Mood> = {
  dia: {
    sky: [shade(ACCENT.blue, 0.2), shade(ACCENT.blue, 0.4), shade(ACCENT.blue, 0.62)],
    cloud: shade(ACCENT.blue, 0.78),
    haze: shade(ACCENT.blue, 0.72),
    key: shade(ACCENT.amber, 0.78),
    dim: 0,
    body: 'sun',
    source: { x: 1560, y: 190, r: 92 },
    lamp: 0.25,
  },
  atardecer: {
    sky: [shade(ACCENT.blueDark, -0.25), mix(ACCENT.blue, ACCENT.orange, 0.55), shade(ACCENT.orange, 0.35)],
    cloud: shade(ACCENT.orange, 0.55),
    haze: shade(ACCENT.orange, 0.45),
    key: ACCENT.amber,
    dim: 0.18,
    body: 'sun',
    source: { x: 1650, y: 470, r: 130 },
    lamp: 0.7,
  },
  noche: {
    sky: [shade(SPACE.deep, -0.25), SPACE.deep, SPACE.nebula],
    cloud: shade(SPACE.nebula, 0.14),
    haze: SPACE.nebula,
    key: shade(ACCENT.blue, 0.72),
    dim: 0.45,
    body: 'moon',
    source: { x: 1560, y: 200, r: 84 },
    lamp: 1,
  },
}

const PAPER: Record<MapStyle, { paper: string; land: string; ink: string }> = {
  pergamino: { paper: shade(ACCENT.amber, 0.7), land: shade(ACCENT.orange, 0.4), ink: shade(ACCENT.orange, -0.6) },
  nautico: { paper: shade(ACCENT.blue, 0.72), land: shade(ACCENT.green, 0.4), ink: shade(ACCENT.blue, -0.45) },
  plano: { paper: ACCENT.blueDark, land: shade(ACCENT.blueDark, 0.2), ink: ACCENT.white },
}

const BOOKS = [
  ACCENT.redDark,
  shade(ACCENT.red, -0.3),
  ACCENT.blueDark,
  shade(ACCENT.teal, -0.35),
  ACCENT.greenDark,
  shade(ACCENT.green, -0.45),
  ACCENT.amberDark,
  ACCENT.orangeDark,
  shade(ACCENT.orange, -0.5),
]
const PAGES = shade(ACCENT.amber, 0.72)
const WOOD = shade(ACCENT.orange, -0.5)
const BRASS = ACCENT.amber
const GROUND = shade(ACCENT.orange, 0.08)

/** Suelo: la curva de un planeta pequeño. */
const PLANET = { x: STAGE.width / 2, y: 2100, r: 1300 }

function groundY(x: number): number {
  const dx = x - PLANET.x
  return PLANET.y - Math.sqrt(Math.max(0, PLANET.r * PLANET.r - dx * dx))
}

/** Un color bajo la luz de la hora: se apaga hacia el azul de la noche. */
function toned(color: string, dim: number): string {
  return mix(color, SPACE.deep, dim)
}

// ----- Libros -------------------------------------------------------------------

interface BookSpec {
  x: number
  y: number
  w: number
  h: number
  color: string
}

/** Torre de libros apilados, generada sin azar: siempre la misma para la misma semilla. */
function tower(x: number, baseY: number, count: number, width: number, seed: number): BookSpec[] {
  const books: BookSpec[] = []
  let y = baseY
  for (let i = 0; i < count; i++) {
    const n = seed * 31 + i * 7
    const w = width * (0.72 + hash(n) * 0.34)
    const h = width * (0.13 + hash(n + 0.4) * 0.09)
    const dx = (hash(n + 0.8) - 0.5) * width * 0.16
    y -= h
    books.push({ x: x - w / 2 + dx, y, w, h, color: BOOKS[Math.floor(hash(n + 1.3) * BOOKS.length)] })
  }
  return books
}

/**
 * Pila de libros vistos de canto: lomo de color con dos bandas, cantos de
 * papel a la izquierda y el borde derecho iluminado (la luz llega por ahí).
 * Primero todas las sombras duras, luego los libros.
 */
function Stack({ books, dim, light, shadow = true }: { books: BookSpec[]; dim: number; light: string; shadow?: boolean }) {
  return (
    <g>
      {shadow &&
        books.map((b, i) => (
          <rect key={`s${i}`} x={b.x - 16} y={b.y + 12} width={b.w} height={b.h} rx={6} fill={SPACE.deep} opacity={0.25} />
        ))}
      {books.map((b, i) => {
        const c = toned(b.color, dim)
        const band = Math.max(4, b.h * 0.12)
        return (
          <g key={i}>
            <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={Math.min(8, b.h * 0.2)} fill={c} />
            <rect x={b.x + 4} y={b.y + b.h * 0.18} width={b.w * 0.07} height={b.h * 0.64} rx={2} fill={toned(PAGES, dim)} />
            <rect x={b.x + b.w * 0.18} y={b.y + b.h * 0.22} width={b.w * 0.66} height={band} rx={band / 2} fill={shade(c, 0.28)} />
            <rect x={b.x + b.w * 0.18} y={b.y + b.h * 0.66} width={b.w * 0.66} height={band} rx={band / 2} fill={shade(c, 0.28)} />
            <rect x={b.x + b.w - 7} y={b.y + 3} width={5} height={b.h - 6} rx={2.5} fill={mix(c, light, 0.5)} />
          </g>
        )
      })}
    </g>
  )
}

// ----- Capas lejanas ------------------------------------------------------------

/* Estática: no depende del reloj, se memoriza para no repintarla cada fotograma. */
const Sky = React.memo(function Sky({ mood }: { mood: Mood }) {
  const [top, mid, low] = mood.sky
  // Nubes pintadas: óvalos planos agrupados, como el telón de la referencia.
  const clouds: [number, number, number][] = [
    [260, 360, 1.2],
    [700, 250, 0.9],
    [1180, 380, 1.1],
    [1500, 560, 1],
    [420, 620, 0.8],
    [980, 610, 1.3],
  ]
  return (
    <g>
      <rect x={-60} y={-60} width={STAGE.width + 120} height={STAGE.height + 120} fill={top} />
      <rect x={-60} y={300} width={STAGE.width + 120} height={900} fill={mid} />
      <rect x={-60} y={600} width={STAGE.width + 120} height={600} fill={low} />
      {clouds.map(([x, y, k], i) => (
        <g key={i} fill={mood.cloud} opacity={0.45}>
          <ellipse cx={x} cy={y} rx={170 * k} ry={34 * k} />
          <ellipse cx={x - 70 * k} cy={y - 22 * k} rx={90 * k} ry={30 * k} />
          <ellipse cx={x + 60 * k} cy={y - 18 * k} rx={110 * k} ry={34 * k} />
        </g>
      ))}
    </g>
  )
})

function Body({ mood, time }: { mood: Mood; time: number }) {
  const { x, y, r } = mood.source
  if (mood.body === 'moon') {
    return (
      <g>
        <Halo cx={x} cy={y} r={r * 3.2} color={mood.key} alpha={1} />
        <circle cx={x} cy={y} r={r} fill={shade(ACCENT.amber, 0.72)} />
        <circle cx={x - r * 0.3} cy={y - r * 0.2} r={r * 0.18} fill={shade(ACCENT.amber, 0.5)} />
        <circle cx={x + r * 0.25} cy={y + r * 0.3} r={r * 0.12} fill={shade(ACCENT.amber, 0.5)} />
        <circle cx={x + r * 0.35} cy={y - r * 0.35} r={r * 0.09} fill={shade(ACCENT.amber, 0.5)} />
      </g>
    )
  }
  const spin = time * 0.2
  return (
    <g>
      <Halo cx={x} cy={y} r={r * 3} color={mood.key} alpha={1.2} />
      <g fill={ACCENT.amber}>
        {Array.from({ length: 10 }, (_, i) => {
          const a = spin + (i / 10) * Math.PI * 2
          const p = (d: number, o: number) => `${x + Math.cos(a + o) * d},${y + Math.sin(a + o) * d}`
          return <polygon key={i} points={`${p(r * 1.12, -0.12)} ${p(r * 1.5, 0)} ${p(r * 1.12, 0.12)}`} />
        })}
      </g>
      <circle cx={x} cy={y} r={r} fill={ACCENT.amber} />
      <circle cx={x - r * 0.12} cy={y - r * 0.12} r={r * 0.68} fill={shade(ACCENT.amber, 0.45)} />
    </g>
  )
}

/** Planetas lejanos flotando tras el horizonte. */
function FarWorlds({ mood }: { mood: Mood }) {
  return (
    <g>
      <circle cx={300} cy={200} r={46} fill={toned(ACCENT.teal, 0.25 + mood.dim)} />
      <ellipse cx={300} cy={200} rx={84} ry={16} fill="none" stroke={toned(shade(ACCENT.teal, 0.4), mood.dim)} strokeWidth={6} transform="rotate(-16 300 200)" />
      <circle cx={880} cy={130} r={22} fill={toned(ACCENT.red, 0.3 + mood.dim)} />
    </g>
  )
}

// ----- Mapa colgado -------------------------------------------------------------

const CONTINENTS: [number, number][][] = [
  [[0.08, 0.25], [0.2, 0.12], [0.34, 0.18], [0.38, 0.35], [0.3, 0.5], [0.33, 0.68], [0.22, 0.8], [0.15, 0.62], [0.06, 0.45]],
  [[0.5, 0.2], [0.66, 0.1], [0.85, 0.18], [0.9, 0.35], [0.78, 0.45], [0.7, 0.62], [0.58, 0.55], [0.55, 0.38]],
  [[0.62, 0.72], [0.74, 0.68], [0.8, 0.8], [0.7, 0.88], [0.6, 0.82]],
]
const ROUTE: [number, number][] = [
  [0.24, 0.32],
  [0.36, 0.44],
  [0.47, 0.4],
  [0.58, 0.5],
  [0.72, 0.5],
  [0.7, 0.76],
]

function smoothClosed(p: { x: number; y: number }[]): string {
  const mid = (a: { x: number; y: number }, b: { x: number; y: number }) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
  const s = mid(p[p.length - 1], p[0])
  let d = `M ${s.x.toFixed(1)} ${s.y.toFixed(1)}`
  p.forEach((a, i) => {
    const m = mid(a, p[(i + 1) % p.length])
    d += ` Q ${a.x.toFixed(1)} ${a.y.toFixed(1)} ${m.x.toFixed(1)} ${m.y.toFixed(1)}`
  })
  return `${d} Z`
}

const BANNER = { x0: 560, x1: 1180, top: 250, bottom: 700 }

function MapBanner({ mood, style, time, drawing, sway }: { mood: Mood; style: MapStyle; time: number; drawing: boolean; sway: number }) {
  const { x0, x1, top, bottom } = BANNER
  const paper = PAPER[style]
  const w = x1 - x0 - 60
  const left = x0 + 30
  // El bajo del mapa ondea un poco.
  const wave = (u: number) => Math.sin(time * 0.9 + u * 6) * 8 * sway
  const at = (u: number, v: number) => ({ x: left + u * w, y: top + 20 + v * (bottom - top - 40) + v * wave(u) })
  const bottomEdge = Array.from({ length: 9 }, (_, i) => {
    const u = 1 - i / 8
    const p = at(u, 1)
    return `${p.x.toFixed(1)},${(p.y + 14).toFixed(1)}`
  }).join(' ')
  const cloth = `${left},${top + 10} ${left + w},${top + 10} ${bottomEdge}`
  const cycle = (time * 0.06) % 1.35
  const f = drawing ? Math.min(1, cycle) : 1
  const route = ROUTE.map(([u, v]) => at(u, v))
  const lengths = route.slice(1).map((p, i) => Math.hypot(p.x - route[i].x, p.y - route[i].y))
  const total = lengths.reduce((a, b) => a + b, 0)
  const dim = mood.dim
  return (
    <g>
      {/* Postes y travesaño. */}
      {[x0, x1].map(x => (
        <g key={x}>
          <rect x={x - 12 - 14} y={top - 30 + 14} width={24} height={groundY(x) - top + 30} rx={10} fill={SPACE.deep} opacity={0.22} />
          <rect x={x - 12} y={top - 30} width={24} height={groundY(x) - top + 30} rx={10} fill={toned(WOOD, dim)} />
          <rect x={x + 5} y={top - 26} width={5} height={groundY(x) - top + 22} rx={2.5} fill={mix(toned(WOOD, dim), mood.key, 0.45)} />
        </g>
      ))}
      <rect x={x0 - 40} y={top - 6} width={x1 - x0 + 80} height={20} rx={10} fill={toned(WOOD, dim)} />
      {/* Tela, con su sombra dura. */}
      <polygon points={cloth} fill={SPACE.deep} opacity={0.22} transform="translate(-16 14)" />
      <polygon points={cloth} fill={toned(paper.paper, dim)} />
      <g stroke={toned(paper.ink, dim)} strokeOpacity={0.22} strokeWidth={2}>
        {[0.2, 0.4, 0.6, 0.8].map(t => (
          <g key={t}>
            <line x1={at(t, 0).x} y1={at(t, 0).y} x2={at(t, 1).x} y2={at(t, 1).y} />
            <line x1={at(0, t).x} y1={at(0, t).y} x2={at(1, t).x} y2={at(1, t).y} />
          </g>
        ))}
      </g>
      {CONTINENTS.map((c, i) => (
        <path key={i} d={smoothClosed(c.map(([u, v]) => at(0.05 + 0.9 * u, 0.05 + 0.9 * v)))} fill={toned(paper.land, dim)} />
      ))}
      <polyline
        points={route.map(p => `${p.x},${p.y}`).join(' ')}
        fill="none"
        stroke={toned(paper.ink, dim)}
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${f * total} ${total}`}
      />
      {f >= 1 && (
        <g stroke={style === 'plano' ? ACCENT.white : ACCENT.red} strokeWidth={6} strokeLinecap="round">
          <line x1={route[5].x - 12} y1={route[5].y - 12} x2={route[5].x + 12} y2={route[5].y + 12} />
          <line x1={route[5].x - 12} y1={route[5].y + 12} x2={route[5].x + 12} y2={route[5].y - 12} />
        </g>
      )}
      {/* Luz del astro en el borde derecho de la tela. */}
      <polygon points={`${left + w - 14},${top + 10} ${left + w},${top + 10} ${left + w},${at(1, 1).y + 14} ${left + w - 14},${at(1, 1).y + 10}`} fill={mood.key} opacity={0.35} />
    </g>
  )
}

// ----- Capa media: tarima, mesa, globo, telescopio, farolillo --------------------

function Workshop({ mood, style, time, globe, spin, lamp, flicker }: { mood: Mood; style: MapStyle; time: number; globe: boolean; spin: number; lamp: boolean; flicker: number }) {
  const dim = mood.dim
  const wood = toned(WOOD, dim)
  const pages = toned(PAGES, dim)
  const paper = PAPER[style]

  // Libro abierto gigante: tarima de la mesa.
  const bx0 = 800
  const bx1 = 1400
  const by = groundY(1100) - 6
  const mid = (bx0 + bx1) / 2

  // Globo sobre una pila de libros.
  const globeStack = tower(560, groundY(560), 4, 250, 5)
  const gTop = globeStack[globeStack.length - 1].y
  const gx = 560
  const gy = gTop - 110
  const gr = 80
  const period = gr * 2.6
  const offset = (((time * spin * 40) % period) + period) % period

  // Farolillo sobre otra pila.
  const lampStack = tower(720, groundY(720), 3, 170, 9)
  const lTop = lampStack[lampStack.length - 1].y
  const lampAlpha = lamp ? mood.lamp : 0

  // El telescopio apunta al astro.
  const tx = 1560
  const ty = groundY(1560) - 220
  const aim = Math.atan2(mood.source.y - ty, mood.source.x - tx)

  return (
    <g>
      {/* Alfombra bajo la tarima. */}
      <ellipse cx={1080} cy={by + 30} rx={420} ry={40} fill={toned(shade(ACCENT.red, -0.3), dim)} />
      <ellipse cx={1080} cy={by + 30} rx={360} ry={30} fill="none" stroke={toned(ACCENT.amber, dim)} strokeWidth={5} strokeDasharray="14 10" />

      {/* Sombras largas hacia la izquierda, lejos del astro. */}
      <g fill={SPACE.deep} opacity={0.2}>
        <polygon points={`${bx0},${by + 20} ${bx1},${by + 20} ${bx1 - 260},${by + 60} ${bx0 - 260},${by + 60}`} />
        <polygon points={`${gx - 130},${groundY(gx) - 4} ${gx + 130},${groundY(gx) - 4} ${gx - 60},${groundY(gx) + 34} ${gx - 330},${groundY(gx) + 34}`} />
      </g>

      {/* Tarima: el libro abierto. */}
      <rect x={bx0 - 16} y={by - 14} width={bx1 - bx0 + 32} height={40} rx={12} fill={toned(ACCENT.redDark, dim)} />
      <path d={`M ${bx0} ${by} Q ${(bx0 + mid) / 2} ${by - 44} ${mid} ${by - 18} L ${mid} ${by + 6} L ${bx0} ${by + 6} Z`} fill={pages} />
      <path d={`M ${bx1} ${by} Q ${(bx1 + mid) / 2} ${by - 44} ${mid} ${by - 18} L ${mid} ${by + 6} L ${bx1} ${by + 6} Z`} fill={shade(pages, -0.06)} />
      <rect x={mid - 3} y={by - 20} width={6} height={28} fill={shade(pages, -0.25)} />

      {/* Mesa de dibujo sobre las páginas. */}
      {[950, 1000, 1160, 1210].map((x, i) => (
        <rect key={x} x={x - 7} y={by - 170} width={14} height={150} rx={6} fill={i % 2 ? shade(wood, -0.2) : wood} />
      ))}
      <rect x={920} y={by - 190} width={320} height={26} rx={9} fill={wood} />
      <rect x={920} y={by - 190} width={320} height={7} rx={3.5} fill={mix(wood, mood.key, 0.4)} />
      {/* El mapa de la mesa, que cae por delante. */}
      <path
        d={`M 960 ${by - 190} L 1150 ${by - 194} Q 1170 ${by - 150} 1150 ${by - 110} Q 1130 ${by - 70} 1150 ${by - 36} L 1070 ${by - 30} Q 1050 ${by - 80} 1066 ${by - 120} Q 1080 ${by - 160} 960 ${by - 164} Z`}
        fill={toned(paper.paper, dim)}
      />
      <path d={`M 1080 ${by - 150} Q 1110 ${by - 120} 1100 ${by - 70}`} fill="none" stroke={toned(paper.ink, dim)} strokeOpacity={0.4} strokeWidth={3} />
      {/* Tintero y plumas. */}
      <rect x={990} y={by - 222} width={30} height={32} rx={8} fill={toned(PANEL.bezel, dim * 0.5)} />
      <path d={`M 1004 ${by - 220} Q 990 ${by - 280} 1030 ${by - 318} Q 1016 ${by - 270} 1010 ${by - 220} Z`} fill={toned(ACCENT.white, dim)} />

      {/* Pila con el globo. */}
      <Stack books={globeStack} dim={dim} light={mood.key} />
      {globe && (
        <g>
          <rect x={gx - 6} y={gy + gr} width={12} height={gTop - gy - gr} fill={toned(BRASS, dim)} />
          <ellipse cx={gx} cy={gTop - 4} rx={46} ry={10} fill={toned(BRASS, dim)} />
          <circle cx={gx} cy={gy} r={gr + 16} fill="none" stroke={toned(BRASS, dim)} strokeWidth={9} />
          <circle cx={gx} cy={gy} r={gr} fill={toned(shade(ACCENT.blue, 0.2), dim)} />
          <clipPath id="dio-globe">
            <circle cx={gx} cy={gy} r={gr} />
          </clipPath>
          <g clipPath="url(#dio-globe)">
            {[-1, 0, 1].flatMap(k =>
              [
                [-0.5, -0.3, 0.42, 0.32],
                [0.35, 0.25, 0.36, 0.42],
                [-0.1, 0.6, 0.24, 0.16],
              ].map(([x, y, rx, ry], i) => (
                <ellipse key={`${k}-${i}`} cx={gx + x * gr + offset + k * period - period / 2} cy={gy + y * gr} rx={rx * gr} ry={ry * gr} fill={toned(ACCENT.green, dim)} />
              ))
            )}
            {/* Lado en sombra, lejos del astro, y borde iluminado del otro. */}
            <circle cx={gx - gr * 0.55} cy={gy + gr * 0.2} r={gr} fill={SPACE.deep} opacity={0.35} />
          </g>
          <path d={`M ${gx + gr * 0.2} ${gy - gr * 0.98} A ${gr} ${gr} 0 0 1 ${gx + gr * 0.98} ${gy + gr * 0.2}`} fill="none" stroke={mood.key} strokeWidth={6} opacity={0.6} strokeLinecap="round" />
        </g>
      )}

      {/* Telescopio sobre su trípode, apuntando al astro. */}
      <g stroke={toned(WOOD, dim)} strokeWidth={12} strokeLinecap="round">
        <line x1={tx} y1={ty + 20} x2={tx - 80} y2={groundY(tx - 80)} />
        <line x1={tx} y1={ty + 20} x2={tx + 80} y2={groundY(tx + 80)} />
        <line x1={tx} y1={ty + 20} x2={tx + 6} y2={groundY(tx) + 10} stroke={shade(toned(WOOD, dim), -0.25)} />
      </g>
      <g transform={`rotate(${(aim * 180) / Math.PI} ${tx} ${ty})`}>
        {/* Tubo de latón que se ensancha hacia el objetivo, con el lado de la luz más claro. */}
        <polygon points={`${tx - 80},${ty - 20} ${tx + 120},${ty - 30} ${tx + 120},${ty + 30} ${tx - 80},${ty + 20}`} fill={toned(BRASS, dim)} />
        <polygon points={`${tx - 80},${ty - 20} ${tx + 120},${ty - 30} ${tx + 120},${ty - 16} ${tx - 80},${ty - 9}`} fill={mix(toned(BRASS, dim), mood.key, 0.5)} />
        {[-30, 40].map(dx => (
          <rect key={dx} x={tx + dx} y={ty - 28} width={12} height={56} rx={5} fill={toned(shade(BRASS, -0.28), dim)} />
        ))}
        <rect x={tx + 112} y={ty - 38} width={30} height={76} rx={10} fill={toned(shade(BRASS, -0.35), dim)} />
        <rect x={tx - 104} y={ty - 14} width={28} height={28} rx={7} fill={toned(PANEL.bezel, dim * 0.5)} />
      </g>
      <circle cx={tx} cy={ty} r={14} fill={toned(shade(BRASS, -0.3), dim)} />

      {/* Pila con el farolillo. */}
      <Stack books={lampStack} dim={dim} light={mood.key} />
      <g>
        <rect x={696} y={lTop - 70} width={48} height={64} rx={10} fill={lampAlpha > 0 ? mix(toned(shade(ACCENT.amber, 0.4), dim), ACCENT.amber, lampAlpha) : toned(PANEL.plate, dim)} />
        <rect x={690} y={lTop - 12} width={60} height={12} rx={5} fill={toned(PANEL.bezel, dim * 0.5)} />
        <rect x={694} y={lTop - 84} width={52} height={16} rx={6} fill={toned(PANEL.bezel, dim * 0.5)} />
        <rect x={713} y={lTop - 100} width={14} height={18} rx={7} fill="none" stroke={toned(PANEL.bezel, dim * 0.5)} strokeWidth={5} />
        {lampAlpha > 0 && <Flame x={720} y={lTop - 18} size={32} time={time} flicker={flicker} seed={4} />}
      </g>
    </g>
  )
}

// ----- Escena ---------------------------------------------------------------------

export default function CartografoDiorama({ values, time }: SceneProps) {
  const light = values.light as Light
  const shafts = values.shafts as boolean
  const lamp = values.lamp as boolean
  const style = values.mapStyle as MapStyle
  const drawing = values.drawing as boolean
  const globe = values.globe as boolean
  const globeSpin = values.globeSpin as number
  const flicker = values.flicker as number

  const mood = MOOD[light]
  const dim = mood.dim
  const lampAlpha = lamp ? mood.lamp : 0
  const lampPos = { x: 720, y: tower(720, groundY(720), 3, 170, 9).slice(-1)[0].y - 40 }

  // Estrellas de papel colgadas: posición, largo del hilo y tamaño.
  const stars: [number, number, number][] = [
    [140, 150, 26],
    [330, 90, 22],
    [470, 300, 30],
    [860, 120, 24],
    [1040, 240, 28],
    [1250, 380, 22],
    [1330, 150, 26],
    [1800, 110, 24],
    [1720, 330, 30],
  ]

  return (
    <g>
      {/* 0 · cielo pintado y astro */}
      <Layer depth={0.04} time={time}>
        <Sky mood={mood} />
        <Body mood={mood} time={time} />
      </Layer>
      <Layer depth={0.12} time={time}>
        <FarWorlds mood={mood} />
      </Layer>

      {/* 1 · estrellas de papel colgadas */}
      <Layer depth={0.22} time={time}>
        {stars.map(([x, len, size], i) => (
          <HangingStar
            key={i}
            x={x}
            length={len}
            size={size}
            time={time}
            seed={i * 3.1}
            color={toned(ACCENT.amber, dim * 0.6)}
            lit={mood.key}
            string={toned(PANEL.screw, dim)}
          />
        ))}
      </Layer>

      {/* 2 · horizonte trasero con torres de libros gigantes, veladas por la bruma */}
      <Layer depth={0.34} time={time}>
        <circle cx={PLANET.x} cy={PLANET.y - 40} r={PLANET.r} fill={toned(shade(GROUND, -0.12), dim)} />
        <Stack books={tower(300, groundY(300) - 40, 9, 300, 1)} dim={dim} light={mood.key} />
        <Stack books={tower(1460, groundY(1460) - 40, 7, 260, 2)} dim={dim} light={mood.key} />
        <Stack books={tower(1760, groundY(1760) - 40, 10, 320, 3)} dim={dim} light={mood.key} />
      </Layer>
      <Haze color={mood.haze} opacity={0.3} />

      {/* 3 · el mapa colgado */}
      <Layer depth={0.46} time={time}>
        <MapBanner mood={mood} style={style} time={time} drawing={drawing} sway={1} />
      </Layer>

      {/* Rayos del astro entre las capas. */}
      {shafts && (
        <Rays
          x={mood.source.x}
          y={mood.source.y}
          from={Math.PI * 0.58}
          to={Math.PI * 0.95}
          count={7}
          length={2400}
          color={mood.key}
          opacity={light === 'noche' ? 0.08 : 0.1}
          time={time}
        />
      )}

      {/* 4 · suelo del planeta y el taller */}
      <Layer depth={0.62} time={time}>
        <circle cx={PLANET.x} cy={PLANET.y - 8} r={PLANET.r} fill={mix(toned(GROUND, dim), mood.key, 0.25)} />
        <circle cx={PLANET.x} cy={PLANET.y} r={PLANET.r} fill={toned(GROUND, dim)} />
        {/* Cráteres aplastados. */}
        {[
          [420, 940, 110, 20],
          [1500, 900, 90, 16],
          [1250, 1010, 140, 24],
        ].map(([x, y, rx, ry]) => (
          <g key={x}>
            <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={toned(shade(GROUND, 0.25), dim)} />
            <ellipse cx={x + rx * 0.08} cy={y + ry * 0.2} rx={rx * 0.82} ry={ry * 0.7} fill={toned(shade(GROUND, -0.15), dim)} />
          </g>
        ))}
        <LightPool cx={lampPos.x + 40} cy={groundY(lampPos.x) + 20} rx={380} ry={60} color={ACCENT.amber} alpha={lampAlpha} />
        <Workshop mood={mood} style={style} time={time} globe={globe} spin={globeSpin} lamp={lamp} flicker={flicker} />
        <Halo cx={lampPos.x} cy={lampPos.y} r={170} color={ACCENT.amber} alpha={lampAlpha} />
      </Layer>

      {/* 5 · primer plano: pilas enormes casi en silueta, con el borde iluminado */}
      <Layer depth={0.95} time={time}>
        <Stack books={tower(120, 1130, 8, 420, 11)} dim={Math.min(0.85, dim + 0.35)} light={mood.key} shadow={false} />
        <Stack books={tower(1905, 1150, 5, 400, 12)} dim={Math.min(0.85, dim + 0.35)} light={mood.key} shadow={false} />
        {/* Rollos de mapa tirados delante. */}
        {[
          [1480, 1052, 190],
          [520, 1066, 150],
        ].map(([x, y, w]) => (
          <g key={x}>
            <rect x={x} y={y - 18} width={w} height={36} rx={18} fill={toned(PAGES, Math.min(0.8, dim + 0.25))} />
            <circle cx={x + w - 18} cy={y} r={18} fill={toned(shade(PAGES, -0.2), Math.min(0.8, dim + 0.25))} />
          </g>
        ))}
      </Layer>
    </g>
  )
}
