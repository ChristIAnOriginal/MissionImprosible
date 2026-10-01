/**
 * "Biblioteca del cartógrafo": fondo.
 *
 * Una sala en perspectiva de un punto (`scene/room.ts`): estanterías y un gran
 * mapa en el fondo, mapas clavados en las paredes, una ventana a la derecha,
 * una mesa de lectura con un atlas abierto, un globo terráqueo y, delante, la
 * mesa de dibujo con un mapa a medio trazar.
 *
 * Todos los mapas comparten los mismos continentes y se dibujan sobre
 * cuadriláteros ya puestos en perspectiva, así un mapa en la pared y la hoja
 * inclinada del tablero se leen como el mismo mundo.
 *
 * Lo que se mueve — la ruta que se traza, la pluma que la sigue, el globo, el
 * farol y el polvo — sale de `time`.
 *
 * En estilo realista (`scene/realism.tsx`) se suman luz y materiales: yeso y
 * madera con luz que cae, suelo barnizado, lomos cilíndricos, papel envejecido,
 * globo esférico, sombras de contacto, el haz que se apaga en el suelo, el
 * farol bañando la sala y viñeteado.
 */
import React from 'react'
import { ACCENT, PANEL, SPACE, STAGE, shade } from '../../shared/palette'
import type { SceneProps } from '../../renderer/scene/contract'
import { createRoom, hash, pts, quadPoint, type Pt } from '../../renderer/scene/room'
import { Flame, Glow } from '../../renderer/scene/fire'
import { ContactShadow, Shaded, SoftGlow, Vignette, beamFill, useRealistic } from '../../renderer/scene/realism'

const { P, onPlane, depthScale } = createRoom({ x: STAGE.width / 2, y: 440 }, 0.55)

// ----- Colores ---------------------------------------------------------------

const PLASTER = shade(ACCENT.amber, 0.82)
const PLASTER_SIDE = shade(PLASTER, -0.07)
const WOOD = shade(ACCENT.orange, -0.55)
const WOOD_LIGHT = shade(ACCENT.orange, -0.32)
const WOOD_DARK = shade(ACCENT.orange, -0.7)
const FLOOR = shade(ACCENT.orange, -0.42)
const BRASS = ACCENT.amber

const BOOKS = [
  ACCENT.red,
  ACCENT.redDark,
  ACCENT.blue,
  ACCENT.blueDark,
  ACCENT.green,
  ACCENT.greenDark,
  ACCENT.teal,
  ACCENT.amberDark,
  ACCENT.orangeDark,
  shade(ACCENT.orange, -0.2),
]

type MapStyle = 'pergamino' | 'nautico' | 'plano'

const MAP: Record<MapStyle, { paper: string; land: string; coast: string; ink: string }> = {
  pergamino: {
    paper: shade(ACCENT.amber, 0.72),
    land: shade(ACCENT.orange, 0.42),
    coast: shade(ACCENT.orange, -0.5),
    ink: shade(ACCENT.orange, -0.6),
  },
  nautico: {
    paper: shade(ACCENT.blue, 0.72),
    land: shade(ACCENT.green, 0.4),
    coast: shade(ACCENT.green, -0.35),
    ink: shade(ACCENT.blue, -0.45),
  },
  plano: {
    paper: ACCENT.blueDark,
    land: shade(ACCENT.blueDark, 0.18),
    coast: ACCENT.white,
    ink: ACCENT.white,
  },
}

type Light = 'dia' | 'atardecer' | 'noche'

const LIGHT: Record<Light, { sky: string; dim: number; shaft: string; shaftAlpha: number; glow: number }> = {
  dia: { sky: shade(ACCENT.blue, 0.5), dim: 0, shaft: '#ffffff', shaftAlpha: 0.22, glow: 0.1 },
  atardecer: { sky: shade(ACCENT.orange, 0.15), dim: 0.14, shaft: ACCENT.amber, shaftAlpha: 0.17, glow: 0.18 },
  noche: { sky: SPACE.deep, dim: 0.5, shaft: SPACE.starDim, shaftAlpha: 0.08, glow: 0.3 },
}

// ----- Mapas -------------------------------------------------------------------

type Quad = [Pt, Pt, Pt, Pt]

/** Los continentes del mundo del cartógrafo, en coordenadas del papel (0–1). */
const CONTINENTS: [number, number][][] = [
  [[0.08, 0.25], [0.2, 0.12], [0.34, 0.18], [0.38, 0.35], [0.3, 0.5], [0.33, 0.68], [0.22, 0.8], [0.15, 0.62], [0.06, 0.45]],
  [[0.5, 0.2], [0.66, 0.1], [0.85, 0.18], [0.9, 0.35], [0.78, 0.45], [0.7, 0.62], [0.58, 0.55], [0.55, 0.38]],
  [[0.62, 0.72], [0.74, 0.68], [0.8, 0.8], [0.7, 0.88], [0.6, 0.82]],
]

/** La ruta del cartógrafo: de un continente al otro, acabando en la isla. */
const ROUTE: [number, number][] = [
  [0.24, 0.32],
  [0.36, 0.44],
  [0.47, 0.4],
  [0.58, 0.5],
  [0.72, 0.5],
  [0.7, 0.76],
]

/** Contorno cerrado y redondeado: curvas por los puntos medios. */
function smoothPath(p: Pt[]): string {
  const mid = (a: Pt, b: Pt) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
  const start = mid(p[p.length - 1], p[0])
  let d = `M ${start.x.toFixed(1)} ${start.y.toFixed(1)}`
  for (let i = 0; i < p.length; i++) {
    const m = mid(p[i], p[(i + 1) % p.length])
    d += ` Q ${p[i].x.toFixed(1)} ${p[i].y.toFixed(1)} ${m.x.toFixed(1)} ${m.y.toFixed(1)}`
  }
  return `${d} Z`
}

/** Tramo inicial de una polilínea: la fracción `f` de su longitud total. */
function partial(points: Pt[], f: number): Pt[] {
  const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y))
  let left = lengths.reduce((a, b) => a + b, 0) * Math.min(1, Math.max(0, f))
  const out = [points[0]]
  for (let i = 0; i < lengths.length; i++) {
    const a = points[i]
    const b = points[i + 1]
    if (left >= lengths[i]) {
      out.push(b)
      left -= lengths[i]
    } else {
      const t = lengths[i] > 0 ? left / lengths[i] : 0
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
      break
    }
  }
  return out
}

/**
 * Un mapa sobre un cuadrilátero cualquiera: papel, retícula, continentes y,
 * si se pide, la ruta (hasta la fracción `route`) y una rosa de los vientos.
 */
function MapSheet({
  q,
  style,
  sw,
  route,
  rose = false,
  grid = true,
}: {
  q: Quad
  style: MapStyle
  sw: number
  route?: number
  rose?: boolean
  grid?: boolean
}) {
  const c = MAP[style]
  const real = useRealistic()
  const at = (u: number, v: number) => quadPoint(q, 0.05 + 0.9 * u, 0.05 + 0.9 * v)
  const width = Math.hypot(q[1].x - q[0].x, q[1].y - q[0].y)
  const routePts = route !== undefined ? partial(ROUTE.map(([u, v]) => at(u, v)), route) : []
  const end = routePts[routePts.length - 1]
  const roseAt = at(0.9, 0.85)
  const roseR = width * 0.06

  return (
    <g>
      <polygon points={pts(q)} fill={c.paper} />
      {grid && (
        <g stroke={c.ink} strokeOpacity={0.25} strokeWidth={sw * 0.5}>
          {[0.2, 0.4, 0.6, 0.8].map(t => (
            <g key={t}>
              <line {...seg(quadPoint(q, t, 0.03), quadPoint(q, t, 0.97))} />
              <line {...seg(quadPoint(q, 0.03, t), quadPoint(q, 0.97, t))} />
            </g>
          ))}
        </g>
      )}
      {CONTINENTS.map((shape, i) => (
        <path
          key={i}
          d={smoothPath(shape.map(([u, v]) => at(u, v)))}
          fill={c.land}
          stroke={c.coast}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      ))}
      {routePts.length > 1 && (
        <polyline
          points={pts(routePts)}
          fill="none"
          stroke={c.ink}
          strokeWidth={sw * 1.2}
          strokeDasharray={`${sw * 3} ${sw * 2.4}`}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {route !== undefined && route >= 1 && end && (
        <g stroke={style === 'plano' ? ACCENT.white : ACCENT.red} strokeWidth={sw * 1.6} strokeLinecap="round">
          <line x1={end.x - sw * 3} y1={end.y - sw * 3} x2={end.x + sw * 3} y2={end.y + sw * 3} />
          <line x1={end.x - sw * 3} y1={end.y + sw * 3} x2={end.x + sw * 3} y2={end.y - sw * 3} />
        </g>
      )}
      {rose && (
        <g>
          <polygon
            points={Array.from({ length: 8 }, (_, i) => {
              const a = (i / 8) * Math.PI * 2 - Math.PI / 2
              const r = i % 2 === 0 ? roseR : roseR * 0.32
              return `${roseAt.x + Math.cos(a) * r},${roseAt.y + Math.sin(a) * r}`
            }).join(' ')}
            fill={c.ink}
          />
          <circle cx={roseAt.x} cy={roseAt.y} r={roseR * 0.18} fill={c.paper} />
        </g>
      )}
      {real && style !== 'plano' && <polygon points={pts(q)} fill="url(#rl-aged)" />}
      <polygon points={pts(q)} fill="none" stroke={c.coast} strokeWidth={sw} strokeOpacity={0.6} />
    </g>
  )
}

function seg(a: Pt, b: Pt) {
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y }
}

function rectQuad(x0: number, y0: number, x1: number, y1: number): Quad {
  return [
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  ]
}

/** Cuadrilátero sobre una pared lateral: `u` a lo largo de la profundidad. */
function wallQuad(x: number, w0: number, w1: number, y0: number, y1: number): Quad {
  return [P(x, y0, w0), P(x, y0, w1), P(x, y1, w1), P(x, y1, w0)]
}

// ----- Caja de la sala ---------------------------------------------------------

/* Estática: no depende del reloj, se memoriza para no repintarla cada fotograma. */
const Room = React.memo(function Room() {
  const joints: React.ReactElement[] = []
  for (let i = 0; i < 12; i++) {
    for (let k = 0; k < 2; k++) {
      const w = 0.1 + hash(i * 3 + k) * 0.8
      joints.push(<line key={`${i}-${k}`} {...seg(P(i * 160, 1080, w), P((i + 1) * 160, 1080, w))} />)
    }
  }
  return (
    <g>
      <Shaded kind="fadeDown">
        <polygon points={pts([P(0, 0, 0), P(1920, 0, 0), P(1920, 0, 1), P(0, 0, 1)])} fill={WOOD_DARK} />
      </Shaded>
      {[0, 1920].map(x => (
        <g key={x}>
          {/* Las paredes se oscurecen hacia el espectador, lejos de la luz del fondo. */}
          <Shaded kind={x === 0 ? 'cylXRev' : 'cylX'}>
            <polygon points={pts(wallQuad(x, 0, 1, 0, 1080))} fill={PLASTER_SIDE} />
          </Shaded>
          <polygon points={pts(wallQuad(x, 0, 1, 780, 1080))} fill={WOOD} />
          <polygon points={pts(wallQuad(x, 0, 1, 768, 790))} fill={WOOD_DARK} />
        </g>
      ))}
      <Shaded kind="fadeUp">
        <polygon points={pts([P(0, 1080, 0), P(1920, 1080, 0), P(1920, 1080, 1), P(0, 1080, 1)])} fill={FLOOR} />
      </Shaded>
      {/* Barniz: un brillo que cruza los tablones. */}
      <Shaded kind="sheen" opacity={0.6}>
        <polygon points={pts([P(0, 1080, 0), P(1920, 1080, 0), P(1920, 1080, 1), P(0, 1080, 1)])} fill="none" />
      </Shaded>
      <g stroke={shade(FLOOR, -0.28)} strokeWidth={3}>
        {Array.from({ length: 11 }, (_, i) => (
          <line key={i} {...seg(P((i + 1) * 160, 1080, 0), P((i + 1) * 160, 1080, 1))} />
        ))}
        {joints}
      </g>
      {/* Alfombra bajo las mesas. */}
      <Shaded kind="fadeUp">
        <polygon points={pts([P(500, 1080, 0.14), P(1520, 1080, 0.14), P(1520, 1080, 0.72), P(500, 1080, 0.72)])} fill={shade(ACCENT.red, -0.35)} />
      </Shaded>
      <polygon
        points={pts([P(560, 1080, 0.18), P(1460, 1080, 0.18), P(1460, 1080, 0.67), P(560, 1080, 0.67)])}
        fill={shade(ACCENT.red, -0.15)}
        stroke={BRASS}
        strokeWidth={5}
      />
    </g>
  )
})

/** Vigas del techo, de la más lejana a la más cercana. */
/* Estática: no depende del reloj, se memoriza para no repintarla cada fotograma. */
const Beams = React.memo(function Beams() {
  return (
    <g>
      {[0.8, 0.5, 0.2].map(w => (
        <g key={w}>
          <polygon points={pts([P(0, 50, w), P(1920, 50, w), P(1920, 50, w + 0.04), P(0, 50, w + 0.04)])} fill={shade(WOOD, -0.3)} />
          <Shaded kind="cylY">
            <polygon points={pts([P(0, 0, w), P(1920, 0, w), P(1920, 50, w), P(0, 50, w)])} fill={WOOD} />
          </Shaded>
        </g>
      ))}
    </g>
  )
})

// ----- Pared del fondo ---------------------------------------------------------

/* Estática: no depende del reloj, se memoriza para no repintarla cada fotograma. */
const BackWall = React.memo(function BackWall({ style }: { style: MapStyle }) {
  return (
    <g transform={onPlane(1)}>
      <Shaded kind="fadeDown">
        <rect width={1920} height={1080} fill={PLASTER} />
      </Shaded>
      <rect y={780} width={1920} height={300} fill={WOOD} />
      <rect y={768} width={1920} height={22} fill={WOOD_DARK} />
      <g stroke={WOOD_DARK} strokeWidth={4}>
        {Array.from({ length: 11 }, (_, i) => (
          <line key={i} x1={(i + 1) * 160} y1={800} x2={(i + 1) * 160} y2={1080} />
        ))}
      </g>

      <Shelf x0={40} x1={600} seed={1} scrollRow={2} />
      <Shelf x0={1320} x1={1880} seed={7} scrollRow={3} />

      {/* El gran mapa del mundo. */}
      <Shaded kind="cylY">
        <rect x={690} y={130} width={540} height={500} rx={10} fill={WOOD} />
      </Shaded>
      <MapSheet q={rectQuad(716, 156, 1204, 604)} style={style} sw={5} route={1} rose />

      {/* Mueble de cajones planos para guardar mapas, con dos rollos encima. */}
      <rect x={705} y={690} width={510} height={24} rx={6} fill={WOOD_DARK} />
      <Shaded kind="fadeDown">
        <rect x={720} y={712} width={480} height={368} fill={WOOD_LIGHT} />
      </Shaded>
      {[0, 1, 2, 3, 4, 5].map(i => (
        <g key={i}>
          <rect x={740} y={728 + i * 58} width={440} height={46} rx={4} fill={shade(WOOD_LIGHT, 0.1)} stroke={WOOD_DARK} strokeWidth={4} />
          <rect x={930} y={746 + i * 58} width={60} height={10} rx={5} fill={BRASS} />
        </g>
      ))}
      <Scroll x0={760} x1={990} y={664} r={16} />
      <Scroll x0={1010} x1={1170} y={670} r={12} />
    </g>
  )
})

/** Rollo de papel tumbado: cuerpo y extremo circular. */
function Scroll({ x0, x1, y, r }: { x0: number; x1: number; y: number; r: number }) {
  const paper = MAP.pergamino.paper
  return (
    <g>
      <rect x={x0} y={y - r} width={x1 - x0} height={r * 2} rx={r} fill={paper} />
      <circle cx={x1 - r} cy={y} r={r} fill={shade(paper, -0.12)} />
    </g>
  )
}

/** Estantería del fondo: libros de alturas y colores sueltos, y una balda de rollos. */
function Shelf({ x0, x1, seed, scrollRow }: { x0: number; x1: number; seed: number; scrollRow: number }) {
  const rows = [132, 322, 512, 702, 892]
  const inner0 = x0 + 22
  const inner1 = x1 - 22
  return (
    <g>
      <Shaded kind="cylX">
        <rect x={x0} y={110} width={x1 - x0} height={970} fill={WOOD} />
      </Shaded>
      <Shaded kind="fadeUp">
        <rect x={inner0} y={132} width={inner1 - inner0} height={948} fill={WOOD_DARK} />
      </Shaded>
      {rows.map((top, r) => {
        const floor = top + 170
        const items: React.ReactElement[] = []
        if (r === scrollRow) {
          for (let k = 0; k < 3; k++) {
            items.push(<Scroll key={`s${k}`} x0={inner0 + 20} x1={inner1 - 30 - k * 40} y={floor - 22 - k * 36} r={17} />)
          }
        } else {
          let x = inner0 + 10
          let n = seed * 101 + r * 37
          while (x < inner1 - 30) {
            n++
            if (hash(n) < 0.08) {
              x += 20
              continue
            }
            const w = Math.min(24 + hash(n + 0.3) * 26, inner1 - 6 - x)
            const h = 112 + hash(n + 0.6) * 46
            const color = BOOKS[Math.floor(hash(n + 0.9) * BOOKS.length)]
            items.push(
              <g key={n}>
                <Shaded kind="cylX">
                  <rect x={x} y={floor - h} width={w - 3} height={h} fill={color} />
                </Shaded>
              </g>
            )
            x += w
          }
        }
        return (
          <g key={top}>
            {items}
            <rect x={inner0} y={floor} width={inner1 - inner0} height={20} fill={WOOD} />
          </g>
        )
      })}
    </g>
  )
}

// ----- Paredes laterales ---------------------------------------------------------

const WINDOW = { w0: 0.3, w1: 0.6, top: 210, bottom: 700 }

/* Estática: no depende del reloj, se memoriza para no repintarla cada fotograma. */
const LeftWall = React.memo(function LeftWall({ style }: { style: MapStyle }) {
  const maps: [number, number, number, number][] = [
    [0.2, 0.38, 250, 560],
    [0.5, 0.66, 300, 540],
  ]
  // Botellero de rollos: los extremos de los mapas enrollados asoman en rejilla.
  const rack = wallQuad(0, 0.72, 0.9, 590, 770)
  return (
    <g>
      {maps.map(([w0, w1, y0, y1], i) => (
        <g key={i}>
          <polygon points={pts(wallQuad(0, w0 - 0.012, w1 + 0.012, y0 - 16, y1 + 16))} fill={WOOD} />
          <MapSheet q={wallQuad(0, w0, w1, y0, y1)} style={style} sw={2.4} />
        </g>
      ))}
      <polygon points={pts(rack)} fill={WOOD_DARK} />
      {[0, 1, 2].flatMap(row =>
        [0, 1, 2, 3].map(col => {
          const w = 0.74 + col * 0.045
          const c = P(0, 625 + row * 55, w)
          const r = 20 * depthScale(w)
          return (
            <g key={`${row}-${col}`}>
              <ellipse cx={c.x} cy={c.y} rx={r * 0.55} ry={r} fill={MAP.pergamino.paper} />
            </g>
          )
        })
      )}
    </g>
  )
})

/* Estática: no depende del reloj, se memoriza para no repintarla cada fotograma. */
const RightWall = React.memo(function RightWall({ style, light }: { style: MapStyle; light: Light }) {
  const { w0, w1, top, bottom } = WINDOW
  const midW = (w0 + w1) / 2
  const midY = (top + bottom) / 2
  return (
    <g>
      <polygon points={pts(wallQuad(1920, w0 - 0.02, w1 + 0.02, top - 24, bottom + 24))} fill={WOOD} />
      <Shaded kind="fadeDown" opacity={0.5}>
        <polygon points={pts(wallQuad(1920, w0, w1, top, bottom))} fill={LIGHT[light].sky} />
      </Shaded>
      {light === 'noche' &&
        [0, 1, 2, 3].map(k => {
          const p = P(1920, top + 40 + hash(k + 40) * (bottom - top - 80), w0 + 0.02 + hash(k + 50) * (w1 - w0 - 0.04))
          return <circle key={k} cx={p.x} cy={p.y} r={2.4} fill={SPACE.star} />
        })}
      <g stroke={WOOD} strokeWidth={10}>
        <line {...seg(P(1920, top, midW), P(1920, bottom, midW))} />
        <line {...seg(P(1920, midY, w0), P(1920, midY, w1))} />
      </g>
      <polygon points={pts(wallQuad(1920, w0 - 0.025, w1 + 0.025, bottom + 20, bottom + 44))} fill={WOOD_DARK} />
      <polygon points={pts(wallQuad(1920, 0.72, 0.88, 290, 520))} fill={WOOD} />
      <MapSheet q={wallQuad(1920, 0.73, 0.87, 305, 505)} style={style} sw={2} grid={false} />
    </g>
  )
})

/** Haz de la ventana sobre el suelo, con polvo flotando dentro. */
function Shaft({ light, time }: { light: Light; time: number }) {
  const { shaft, shaftAlpha } = LIGHT[light]
  const real = useRealistic()
  const tone = light === 'dia' ? 'white' : light === 'atardecer' ? 'warm' : 'cool'
  const { w0, w1, top, bottom } = WINDOW
  const reach = (y: number) => (1080 - y) * 0.7
  const land = (y: number, w: number) => P(1920 - reach(y), 1080, w)
  return (
    <g>
      <polygon points={pts([P(1920, top, w0), P(1920, top, w1), land(top, w1), land(top, w0)])} fill={real ? beamFill(tone) : shaft} opacity={real ? shaftAlpha * 2.2 : shaftAlpha * 0.6} />
      <polygon points={pts([land(bottom, w0), land(bottom, w1), land(top, w1), land(top, w0)])} fill={shaft} opacity={shaftAlpha * 1.4} />
      {light !== 'noche' &&
        Array.from({ length: 8 }, (_, k) => {
          const along = (hash(k + 70) + time * 0.018 * (0.6 + hash(k + 80))) % 1
          const y = bottom - along * (bottom - top) + 220 * (1 - along)
          const w = w0 + hash(k + 90) * (w1 - w0)
          const p = P(1920 - reach(y) * (0.3 + hash(k + 100) * 0.5), y, w)
          return <circle key={k} cx={p.x} cy={p.y} r={3} fill={ACCENT.white} opacity={0.55 * Math.sin(along * Math.PI)} />
        })}
    </g>
  )
}

// ----- Mesa de lectura y globo -----------------------------------------------------

/** Caja apoyada con su frente, su tapa y su costado interior (si se ve). */
function box(x0: number, x1: number, yTop: number, yBottom: number, w0: number, w1: number) {
  const front = pts([P(x0, yTop, w0), P(x1, yTop, w0), P(x1, yBottom, w0), P(x0, yBottom, w0)])
  const top = pts([P(x0, yTop, w0), P(x1, yTop, w0), P(x1, yTop, w1), P(x0, yTop, w1)])
  // A la izquierda del punto de fuga se ve el costado derecho, y al revés.
  const sx = x1 < 960 ? x1 : x0
  const side = pts([P(sx, yTop, w0), P(sx, yTop, w1), P(sx, yBottom, w1), P(sx, yBottom, w0)])
  return { front, top, side }
}

/* Estática: no depende del reloj, se memoriza para no repintarla cada fotograma. */
const ReadingTable = React.memo(function ReadingTable({ style }: { style: MapStyle }) {
  const w0 = 0.48
  const w1 = 0.62
  const y = 790
  const top = box(300, 820, y, 830, w0, w1)
  const legs = (w: number, fill: string) =>
    [312, 786].map(x => (
      <polygon key={`${w}-${x}`} points={pts([P(x, 830, w), P(x + 24, 830, w), P(x + 24, 1080, w), P(x, 1080, w)])} fill={fill} />
    ))
  // Arriba del papel = el borde lejano de la página.
  const page = (x0: number, x1: number): Quad => [P(x0, y - 4, 0.59), P(x1, y - 4, 0.59), P(x1, y - 4, 0.51), P(x0, y - 4, 0.51)]
  const books = [
    { y0: 790, y1: 770, color: ACCENT.blue },
    { y0: 770, y1: 752, color: ACCENT.red },
    { y0: 752, y1: 736, color: ACCENT.green },
  ]
  return (
    <g>
      {legs(w1, WOOD_DARK)}
      <polygon points={top.side} fill={WOOD_DARK} />
      <Shaded kind="sheen">
        <polygon points={top.top} fill={WOOD_LIGHT} />
      </Shaded>
      <Shaded kind="cylY">
        <polygon points={top.front} fill={WOOD} />
      </Shaded>
      {legs(w0, WOOD)}

      {/* Atlas abierto: página de texto a la izquierda, mapa a la derecha. */}
      <polygon points={pts(page(420, 575))} fill={MAP.pergamino.paper} />
      <g stroke={MAP.pergamino.ink} strokeOpacity={0.5} strokeWidth={2}>
        {[0.25, 0.4, 0.55, 0.7].map(v => (
          <line key={v} {...seg(quadPoint(page(420, 575), 0.12, v), quadPoint(page(420, 575), 0.88, v))} />
        ))}
      </g>
      <MapSheet q={page(575, 730)} style={style} sw={1.4} grid={false} />
      <line {...seg(P(575, y - 4, 0.51), P(575, y - 4, 0.59))} stroke={shade(MAP.pergamino.paper, -0.3)} strokeWidth={2} />

      {/* Pila de libros. */}
      {books.map(({ y0, y1, color }, i) => {
        const b = box(330 + i * 4, 404 - i * 3, y1, y0, 0.5, 0.57)
        return (
          <g key={i}>
            <polygon points={b.side} fill={shade(color, -0.3)} />
            <polygon points={b.top} fill={MAP.pergamino.paper} />
            <Shaded kind="cylY">
              <polygon points={b.front} fill={color} />
            </Shaded>
          </g>
        )
      })}

      {/* Tintero con su pluma. */}
      <g transform={onPlane(0.54)}>
        <rect x={752} y={740} width={44} height={50} rx={8} fill={PANEL.bezel} />
        <rect x={764} y={730} width={20} height={14} rx={3} fill={shade(PANEL.bezel, 0.3)} />
        <path d="M 784 740 Q 808 674 756 616 Q 774 680 784 740 Z" fill={SPACE.deep} opacity={0.18} />
        <path d="M 776 736 Q 800 670 748 612 Q 766 676 776 736 Z" fill={ACCENT.white} />
        <path d="M 776 736 Q 782 680 750 614" fill="none" stroke={PANEL.plateEdge} strokeWidth={3} strokeLinecap="round" />
      </g>
    </g>
  )
})

function Globe({ time, spin }: { time: number; spin: number }) {
  const real = useRealistic()
  const gx = 1700
  const gy = 690
  const R = 105
  const sea = shade(ACCENT.blue, 0.25)
  const land = ACCENT.green
  // Las masas de tierra corren de lado a lado y vuelven a entrar: el globo gira.
  const period = R * 2.6
  const offset = ((time * spin * 40) % period + period) % period
  const blobs: [number, number, number, number][] = [
    [-0.5, -0.3, 0.42, 0.32],
    [0.35, 0.25, 0.36, 0.42],
    [-0.1, 0.6, 0.24, 0.16],
  ]
  return (
    <g transform={onPlane(0.56)}>
      <defs>
        <clipPath id="globe-clip">
          <circle cx={gx} cy={gy} r={R} />
        </clipPath>
      </defs>
      {/* Trípode: la pata de la sombra un tono más oscura. */}
      <g strokeWidth={18} strokeLinecap="round">
        <line x1={gx} y1={880} x2={gx + 90} y2={1076} stroke={WOOD_DARK} />
        <line x1={gx} y1={880} x2={gx - 90} y2={1076} stroke={WOOD} />
      </g>
      <Shaded kind="cylX">
        <rect x={gx - 12} y={800} width={24} height={90} rx={6} fill={WOOD} />
      </Shaded>
      <circle cx={gx} cy={gy} r={R + 20} fill="none" stroke={BRASS} strokeWidth={10} />
      <circle cx={gx} cy={gy} r={R} fill={sea} />
      <g clipPath="url(#globe-clip)">
        {[-1, 0, 1].flatMap(k =>
          blobs.map(([x, y, rx, ry], i) => (
            <ellipse key={`${k}-${i}`} cx={gx + x * R + offset + k * period - period / 2} cy={gy + y * R} rx={rx * R} ry={ry * R} fill={land} />
          ))
        )}
        <g fill="none" stroke={shade(sea, -0.25)} strokeWidth={3} strokeOpacity={0.6}>
          <ellipse cx={gx} cy={gy} rx={R * 0.45} ry={R} />
          <line x1={gx - R} y1={gy} x2={gx + R} y2={gy} />
        </g>
        <circle cx={gx + R * 0.6} cy={gy + R * 0.25} r={R} fill={SPACE.deep} fillOpacity={0.3} />
        {real && <circle cx={gx} cy={gy} r={R} fill="url(#rl-sphere)" />}
      </g>
      <circle cx={gx} cy={gy - R - 20} r={9} fill={BRASS} />
      <circle cx={gx} cy={gy + R + 20} r={9} fill={BRASS} />
    </g>
  )
}

// ----- Mesa de dibujo ---------------------------------------------------------------

/** Tablero inclinado: el borde de delante más bajo y cercano que el de detrás. */
const BOARD: Quad = [P(900, 600, 0.38), P(1440, 600, 0.38), P(1440, 770, 0.26), P(900, 770, 0.26)]

function DraftingTable({ style, time, drawing }: { style: MapStyle; time: number; drawing: boolean }) {
  const at = (u: number, v: number) => quadPoint(BOARD, u, v)
  const sheet: Quad = [at(0.07, 0.1), at(0.93, 0.1), at(0.93, 0.88), at(0.07, 0.88)]
  // La ruta se traza, se queda un momento terminada y vuelve a empezar.
  const cycle = (time * 0.06) % 1.35
  const route = drawing ? Math.min(1, cycle) : 1
  // La pluma sigue la punta de la ruta.
  const sheetAt = (u: number, v: number) => quadPoint(sheet, 0.05 + 0.9 * u, 0.05 + 0.9 * v)
  const routePts = partial(ROUTE.map(([u, v]) => sheetAt(u, v)), route)
  const tip = routePts[routePts.length - 1]

  // Caballete en aspa: la pata del fondo, en sombra, un tono más oscura.
  const trestle = (x: number) => (
    <g key={x} strokeLinecap="round" strokeWidth={18}>
      <line {...seg(P(x, 1080, 0.24), P(x, 612, 0.37))} stroke={WOOD_DARK} />
      <line {...seg(P(x, 1080, 0.4), P(x, 780, 0.27))} stroke={WOOD} />
    </g>
  )

  return (
    <g>
      {trestle(940)}
      {trestle(1400)}
      <line {...seg(P(940, 960, 0.32), P(1400, 960, 0.32))} stroke={WOOD_DARK} strokeWidth={14} strokeLinecap="round" />

      {/* Tablero con su canto. */}
      <polygon points={pts([BOARD[3], BOARD[2], P(1440, 794, 0.26), P(900, 794, 0.26)])} fill={WOOD_DARK} />
      <Shaded kind="sheen">
        <polygon points={pts(BOARD)} fill={WOOD_LIGHT} />
      </Shaded>
      <MapSheet q={sheet} style={style} sw={2.6} route={route} />
      {sheet.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={5} fill={ACCENT.red} />
      ))}

      {/* Regla. */}
      <polygon points={pts([at(0.12, 0.78), at(0.62, 0.78), at(0.62, 0.84), at(0.12, 0.84)])} fill={shade(ACCENT.amber, 0.3)} />
      <g stroke={shade(ACCENT.amber, -0.45)} strokeWidth={2}>
        {Array.from({ length: 12 }, (_, i) => {
          const u = 0.14 + i * 0.04
          return <line key={i} {...seg(at(u, 0.78), at(u, i % 3 === 0 ? 0.815 : 0.8))} />
        })}
      </g>

      {/* Compás de puntas. */}
      <g strokeLinecap="round" strokeWidth={7}>
        <line {...seg(at(0.82, 0.24), at(0.76, 0.6))} stroke={PANEL.screw} />
        <line {...seg(at(0.82, 0.24), at(0.89, 0.58))} stroke={shade(PANEL.screw, -0.25)} />
        <circle cx={at(0.82, 0.24).x} cy={at(0.82, 0.24).y} r={8} fill={BRASS} />
      </g>

      {/* Pluma: la punta sobre el final de la ruta, el penacho hacia arriba. */}
      {tip && <Quill x={tip.x} y={tip.y} />}
    </g>
  )
}

/**
 * Pluma de escribir: la punta en (x, y) y el penacho hacia arriba. Una sombra
 * dura y corta la separa del papel, sin contorno.
 */
function Quill({ x, y }: { x: number; y: number }) {
  const feather = (dx: number, dy: number) =>
    `M ${x + dx} ${y + dy} Q ${x + 70 + dx} ${y - 40 + dy} ${x + 96 + dx} ${y - 150 + dy} Q ${x + 40 + dx} ${y - 70 + dy} ${x + dx} ${y + dy} Z`
  return (
    <g>
      <path d={feather(8, 6)} fill={SPACE.deep} opacity={0.18} />
      <path d={feather(0, 0)} fill={ACCENT.white} />
      <path d={`M ${x} ${y} Q ${x + 52} ${y - 60} ${x + 94} ${y - 146}`} fill="none" stroke={PANEL.plateEdge} strokeWidth={3} strokeLinecap="round" />
    </g>
  )
}

// ----- Farol -----------------------------------------------------------------------

const LAMP = { w: 0.3, x: 1170 }

function lampTransform(time: number) {
  return `${onPlane(LAMP.w)} rotate(${Math.sin(time * 0.5) * 1.5} ${LAMP.x} 0)`
}

function LampBody({ time }: { time: number }) {
  const x = LAMP.x
  return (
    <g transform={lampTransform(time)}>
      <line x1={x} y1={0} x2={x} y2={250} stroke={PANEL.bezel} strokeWidth={8} />
      <polygon points={`${x - 44},${250} ${x + 44},${250} ${x + 22},${282} ${x - 22},${282}`} fill={BRASS} />
      <rect x={x - 32} y={280} width={64} height={82} rx={12} fill={shade(ACCENT.amber, 0.6)} />
      <rect x={x - 38} y={358} width={76} height={18} rx={6} fill={BRASS} />
    </g>
  )
}

function LampFlame({ time, flicker, glow }: { time: number; flicker: number; glow: number }) {
  return (
    <g transform={lampTransform(time)}>
      <SoftGlow cx={LAMP.x} cy={330} r={900} opacity={Math.min(1, glow * 2.2)} />
      <Glow x={LAMP.x} y={320} r={220} time={time} alpha={glow} seed={3} />
      <Flame x={LAMP.x} y={350} size={46} time={time} flicker={flicker} seed={3} />
    </g>
  )
}

/** Donde los muebles tocan el suelo, el suelo se oscurece. Sólo en realista. */
function FloorShadows({ globe }: { globe: boolean }) {
  const at = (x: number, w: number, rx: number, ry: number) => {
    const p = P(x, 1080, w)
    const k = depthScale(w)
    return { cx: p.x, cy: p.y, rx: rx * k, ry: ry * k }
  }
  return (
    <>
      <ContactShadow {...at(560, 0.55, 360, 60)} />
      <ContactShadow {...at(1170, 0.33, 380, 70)} />
      {globe && <ContactShadow {...at(1700, 0.56, 150, 34)} />}
    </>
  )
}

// ----- Escena -------------------------------------------------------------------------

export default function BibliotecaCartografo({ values, time }: SceneProps) {
  const light = values.light as Light
  const shafts = values.shafts as boolean
  const lamp = values.lamp as boolean
  const style = values.mapStyle as MapStyle
  const drawing = values.drawing as boolean
  const globe = values.globe as boolean
  const globeSpin = values.globeSpin as number
  const flicker = values.flicker as number

  const { dim, glow } = LIGHT[light]

  return (
    <g>
      <Room />
      <BackWall style={style} />
      <LeftWall style={style} />
      <RightWall style={style} light={light} />
      <Beams />
      {shafts && <Shaft light={light} time={time} />}
      <FloorShadows globe={globe} />
      <ReadingTable style={style} />
      {globe && <Globe time={time} spin={globeSpin} />}
      <DraftingTable style={style} time={time} drawing={drawing} />
      {lamp && <LampBody time={time} />}

      {/* La hora oscurece la sala entera; la llama va encima, sin apagar. */}
      {dim > 0 && <rect width={STAGE.width} height={STAGE.height} fill={SPACE.deep} opacity={dim} />}
      {lamp && <LampFlame time={time} flicker={flicker} glow={glow} />}
      <Vignette />
    </g>
  )
}
