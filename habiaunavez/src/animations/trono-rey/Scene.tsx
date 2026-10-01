/**
 * "Trono del rey": fondo del salón del trono.
 *
 * No es la cabina, pero sigue su lenguaje: planos lisos, volumen por tono,
 * sin contornos, y la misma perspectiva de un punto (`scene/room.ts`).
 *
 * En estilo realista (`scene/realism.tsx`) la composición es la misma y se le
 * suman capas: luz que cae hacia el fondo, suelo pulido, volúmenes
 * cilíndricos en pilastras, tela y oro, sombra de contacto, haces que se
 * desvanecen, resplandor de las llamas y viñeteado.
 *
 * Lo que se mueve — llamas, estandartes, polvo, el candelabro — sale de `time`.
 */
import React from 'react'
import { ACCENT, PANEL, SPACE, STAGE, shade } from '../../shared/palette'
import type { SceneProps } from '../../renderer/scene/contract'
import { createRoom, hash, pts, type Pt } from '../../renderer/scene/room'
import { Flame, Glow } from '../../renderer/scene/fire'
import { ContactShadow, Shaded, SoftGlow, Vignette, beamFill, useRealistic } from '../../renderer/scene/realism'

// ----- Perspectiva del salón -------------------------------------------------

/** Fuga algo más baja que la de la cabina: el trono queda a la altura de la mirada. */
const { P, onPlane } = createRoom({ x: STAGE.width / 2, y: 430 }, 0.5)

// ----- Colores ---------------------------------------------------------------

const STONE = {
  back: PANEL.plateLight,
  wall: PANEL.plate,
  dark: PANEL.plateEdge,
  joint: shade(PANEL.plateEdge, -0.1),
  ceiling: shade(PANEL.plateEdge, -0.28),
  floorA: PANEL.plate,
  floorB: PANEL.plateEdge,
}

const WOOD = shade(ACCENT.orange, -0.55)

type Light = 'dia' | 'atardecer' | 'noche'

const LIGHT: Record<Light, { sky: string; dim: number; shaft: string; shaftAlpha: number; glow: number }> = {
  dia: { sky: shade(ACCENT.blue, 0.5), dim: 0, shaft: '#ffffff', shaftAlpha: 0.2, glow: 0.1 },
  atardecer: { sky: shade(ACCENT.orange, 0.15), dim: 0.12, shaft: ACCENT.amber, shaftAlpha: 0.16, glow: 0.16 },
  noche: { sky: SPACE.deep, dim: 0.5, shaft: SPACE.starDim, shaftAlpha: 0.09, glow: 0.26 },
}

// ----- Caja del salón --------------------------------------------------------

/* Estática: no depende del reloj, se memoriza para no repintarla cada fotograma. */
const Room = React.memo(function Room() {
  return (
    <g>
      <Shaded kind="fadeDown">
        <polygon points={pts([P(0, 0, 0), P(1920, 0, 0), P(1920, 0, 1), P(0, 0, 1)])} fill={STONE.ceiling} />
      </Shaded>
      {/* Las paredes se oscurecen hacia el espectador, lejos de la luz del fondo. */}
      <Shaded kind="cylXRev">
        <polygon points={pts([P(0, 0, 0), P(0, 0, 1), P(0, 1080, 1), P(0, 1080, 0)])} fill={STONE.wall} />
      </Shaded>
      <Shaded kind="cylX">
        <polygon points={pts([P(1920, 0, 0), P(1920, 0, 1), P(1920, 1080, 1), P(1920, 1080, 0)])} fill={STONE.wall} />
      </Shaded>
      <Floor />
      {/* Zócalo corrido por las dos paredes. */}
      {[0, 1920].map(x => (
        <polygon
          key={x}
          points={pts([P(x, 1020, 0), P(x, 1020, 1), P(x, 1080, 1), P(x, 1080, 0)])}
          fill={STONE.dark}
        />
      ))}
    </g>
  )
})

/** Suelo ajedrezado: se pinta el tono claro entero y encima las baldosas oscuras. */
function Floor() {
  const cols = 10
  const rows = 10
  const tiles: React.ReactElement[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r + c) % 2 === 0) continue
      const x0 = (c / cols) * 1920
      const x1 = ((c + 1) / cols) * 1920
      const w0 = r / rows
      const w1 = (r + 1) / rows
      tiles.push(
        <polygon
          key={`${r}-${c}`}
          points={pts([P(x0, 1080, w0), P(x1, 1080, w0), P(x1, 1080, w1), P(x0, 1080, w1)])}
          fill={STONE.floorB}
        />
      )
    }
  }
  const floor = pts([P(0, 1080, 0), P(1920, 1080, 0), P(1920, 1080, 1), P(0, 1080, 1)])
  return (
    <g>
      <polygon points={floor} fill={STONE.floorA} />
      {tiles}
      {/* Mármol pulido: el fondo en penumbra y un brillo que cruza en diagonal. */}
      <FloorFinish points={floor} />
    </g>
  )
}

function FloorFinish({ points }: { points: string }) {
  if (!useRealistic()) return null
  return (
    <>
      <polygon points={points} fill="url(#rl-fadeUp)" />
      <polygon points={points} fill="url(#rl-sheen)" opacity={0.7} />
    </>
  )
}

// ----- Muro del fondo --------------------------------------------------------

/** Contorno de un arco de medio punto en el plano del muro. */
function archPath(cx: number, half: number, bottom: number, spring: number): string {
  return `M ${cx - half} ${bottom} L ${cx - half} ${spring} A ${half} ${half} 0 0 1 ${cx + half} ${spring} L ${cx + half} ${bottom} Z`
}

function BackWall({ bannerColor, time, sway, metal }: { bannerColor: string; time: number; sway: number; metal: string }) {
  const joints: React.ReactElement[] = []
  for (let y = 90, row = 0; y < 1080; y += 90, row++) {
    joints.push(<line key={`h${y}`} x1={0} y1={y} x2={1920} y2={y} />)
    for (let x = (row % 2) * 120 + 120; x < 1920; x += 240) {
      joints.push(<line key={`v${y}-${x}`} x1={x} y1={y - 90} x2={x} y2={y} />)
    }
  }

  return (
    <g transform={onPlane(1)}>
      <Shaded kind="fadeDown">
        <rect width={1920} height={1080} fill={STONE.back} />
      </Shaded>
      <g stroke={STONE.dark} strokeWidth={4}>{joints}</g>

      {/* Hornacina del trono con su dosel de tela. */}
      <path d={archPath(960, 310, 1080, 470)} fill={shade(STONE.back, -0.1)} stroke={STONE.joint} strokeWidth={10} />
      <Shaded kind="fadeUp">
        <path d={archPath(960, 250, 1080, 500)} fill={shade(bannerColor, -0.25)} />
      </Shaded>
      <g stroke={shade(bannerColor, -0.45)} strokeWidth={6}>
        {[-170, -85, 0, 85, 170].map(dx => (
          <line key={dx} x1={960 + dx} y1={330 + Math.abs(dx) * 0.5} x2={960 + dx} y2={1080} />
        ))}
      </g>
      <path d={archPath(960, 250, 1080, 500)} fill="none" stroke={metal} strokeWidth={12} />

      {[-1, 1].map(side => (
        <Banner key={side} x={960 + side * 560} color={bannerColor} metal={metal} time={time} sway={sway} seed={side} />
      ))}
    </g>
  )
}

function Banner({ x, color, metal, time, sway, seed }: { x: number; color: string; metal: string; time: number; sway: number; seed: number }) {
  // Sólo se mueve el bajo: el estandarte cuelga fijo de su barra.
  const dx = Math.sin(time * 0.8 + seed * 1.9) * 22 * sway + Math.sin(time * 1.7 + seed) * 6 * sway
  const body = [
    [x - 110, 160],
    [x + 110, 160],
    [x + 110 + dx, 780],
    [x + dx, 700],
    [x - 110 + dx, 780],
  ]
  const inner = [
    [x - 84, 186],
    [x + 84, 186],
    [x + 84 + dx * 0.95, 730],
    [x + dx * 0.95, 664],
    [x - 84 + dx * 0.95, 730],
  ]
  const toPts = (list: number[][]) => list.map(p => p.join(',')).join(' ')
  return (
    <g>
      <Shaded kind="cylX">
        <polygon points={toPts(body)} fill={color} />
      </Shaded>
      <polygon points={toPts(inner)} fill="none" stroke={metal} strokeWidth={8} strokeLinejoin="round" />
      {/* Media caída en sombra: el volumen de la tela, por tono. */}
      <polygon
        points={toPts([
          [x + 20, 164],
          [x + 106, 164],
          [x + 106 + dx, 772],
          [x + dx, 704],
          [x + 20 + dx * 0.4, 520],
        ])}
        fill={shade(color, -0.18)}
        opacity={0.55}
      />
      <Crown cx={x + dx * 0.45} cy={420} size={110} fill={metal} />
      <rect x={x - 150} y={136} width={300} height={24} rx={12} fill={PANEL.bezel} />
      <circle cx={x - 150} cy={148} r={18} fill={metal} />
      <circle cx={x + 150} cy={148} r={18} fill={metal} />
    </g>
  )
}

/** Corona plana: aro, tres puntas con perla y gemas. */
function Crown({ cx, cy, size, fill }: { cx: number; cy: number; size: number; fill: string }) {
  const w = size
  const h = size * 0.72
  const peaks = [
    [cx - w / 2, cy + h / 2],
    [cx - w / 2, cy - h * 0.2],
    [cx - w / 4, cy + h * 0.08],
    [cx, cy - h / 2],
    [cx + w / 4, cy + h * 0.08],
    [cx + w / 2, cy - h * 0.2],
    [cx + w / 2, cy + h / 2],
  ]
  const sw = size * 0.06
  return (
    <g>
      <Shaded kind="sheen">
        <polygon points={peaks.map(p => p.join(',')).join(' ')} fill={fill} />
      </Shaded>
      <rect x={cx - w / 2} y={cy + h * 0.22} width={w} height={h * 0.28} fill={shade(fill, -0.2)} />
      {[
        [cx - w / 2, cy - h * 0.2],
        [cx, cy - h / 2],
        [cx + w / 2, cy - h * 0.2],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={size * 0.08} fill={ACCENT.white} />
      ))}
      <circle cx={cx} cy={cy + h * 0.36} r={size * 0.07} fill={ACCENT.red} />
      <circle cx={cx - w * 0.28} cy={cy + h * 0.36} r={size * 0.05} fill={ACCENT.blue} />
      <circle cx={cx + w * 0.28} cy={cy + h * 0.36} r={size * 0.05} fill={ACCENT.green} />
    </g>
  )
}

// ----- Paredes laterales -----------------------------------------------------

const WINDOWS = [0.24, 0.53, 0.8]
const PILLARS = [0.95, 0.67, 0.385, 0.1]
const WINDOW = { half: 0.075, bottom: 780, spring: 400, top: 250 }

/** Contorno del ventanal en coordenadas de pared (profundidad, altura). */
function windowOutline(wc: number): [number, number][] {
  const w0 = wc - WINDOW.half
  const w1 = wc + WINDOW.half
  const out: [number, number][] = [[w0, WINDOW.bottom]]
  const steps = 10
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI
    out.push([wc - Math.cos(t) * WINDOW.half, WINDOW.spring - Math.sin(t) * (WINDOW.spring - WINDOW.top)])
  }
  out.push([w1, WINDOW.bottom])
  return out
}

/* Estática: no depende del reloj, se memoriza para no repintarla cada fotograma. */
const Windows = React.memo(function Windows({ light }: { light: Light }) {
  const sky = LIGHT[light].sky
  return (
    <g>
      {[0, 1920].map(x =>
        WINDOWS.map((wc, i) => {
          const outline = windowOutline(wc).map(([w, y]) => P(x, y, w))
          const mid = (WINDOW.bottom + WINDOW.spring) / 2
          return (
            <g key={`${x}-${wc}`}>
              <polygon points={pts(outline)} fill={sky} stroke={STONE.joint} strokeWidth={14} strokeLinejoin="round" />
              {light === 'noche' &&
                [0, 1, 2].map(k => {
                  const p = P(x, WINDOW.top + 60 + hash(i * 7 + k + x) * 380, wc + (hash(i * 13 + k + x) - 0.5) * WINDOW.half * 1.4)
                  return <circle key={k} cx={p.x} cy={p.y} r={2.4} fill={SPACE.star} />
                })}
              {/* Parteluz y travesaño. */}
              <g stroke={STONE.joint} strokeWidth={8}>
                <line {...xy(P(x, WINDOW.top, wc), P(x, WINDOW.bottom, wc))} />
                <line {...xy(P(x, mid, wc - WINDOW.half), P(x, mid, wc + WINDOW.half))} />
              </g>
              <polygon
                points={pts([
                  P(x, WINDOW.bottom, wc - WINDOW.half - 0.01),
                  P(x, WINDOW.bottom, wc + WINDOW.half + 0.01),
                  P(x, WINDOW.bottom + 26, wc + WINDOW.half + 0.01),
                  P(x, WINDOW.bottom + 26, wc - WINDOW.half - 0.01),
                ])}
                fill={STONE.dark}
              />
            </g>
          )
        })
      )}
    </g>
  )
})

function xy(a: Pt, b: Pt) {
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y }
}

/** Pilastras contra las paredes, de la más lejana a la más cercana. */
/* Estática: no depende del reloj, se memoriza para no repintarla cada fotograma. */
const Pillars = React.memo(function Pillars() {
  const depth = 46
  const half = 0.022
  return (
    <g>
      {PILLARS.map(wc =>
        [0, 1920].map(x => {
          const inner = x === 0 ? depth : 1920 - depth
          const wA = wc - half
          const wB = wc + half
          const front = (y0: number, y1: number) => pts([P(x, y0, wA), P(inner, y0, wA), P(inner, y1, wA), P(x, y1, wA)])
          const side = (y0: number, y1: number) => pts([P(inner, y0, wA), P(inner, y0, wB), P(inner, y1, wB), P(inner, y1, wA)])
          return (
            <g key={`${x}-${wc}`}>
              <polygon points={side(0, 1080)} fill={STONE.dark} />
              <Shaded kind="cylX">
                <polygon points={front(0, 1080)} fill={STONE.wall} />
              </Shaded>
              {/* Capitel y basa, un tono más oscuros. */}
              {[
                [40, 110],
                [960, 1080],
              ].map(([y0, y1]) => (
                <g key={y0}>
                  <polygon points={side(y0, y1)} fill={shade(STONE.dark, -0.15)} />
                  <polygon points={front(y0, y1)} fill={STONE.dark} />
                </g>
              ))}
            </g>
          )
        })
      )}
    </g>
  )
})

/** Vigas del techo, de la más lejana a la más cercana. */
/* Estática: no depende del reloj, se memoriza para no repintarla cada fotograma. */
const Beams = React.memo(function Beams() {
  return (
    <g>
      {[0.78, 0.48, 0.18].map(w => (
        <g key={w}>
          <polygon points={pts([P(0, 60, w), P(1920, 60, w), P(1920, 60, w + 0.04), P(0, 60, w + 0.04)])} fill={shade(WOOD, -0.3)} />
          <Shaded kind="cylY">
            <polygon points={pts([P(0, 0, w), P(1920, 0, w), P(1920, 60, w), P(0, 60, w)])} fill={WOOD} />
          </Shaded>
        </g>
      ))}
    </g>
  )
})

// ----- Alfombra, estrado y luz -------------------------------------------------

/** Peldaños del estrado: ancho, alto y profundidad de su frente. */
const STEPS = [
  { half: 560, top: 1040, front: 0.84 },
  { half: 470, top: 1000, front: 0.89 },
  { half: 390, top: 960, front: 0.94 },
]
const CARPET_HALF = 190

/* Estática: no depende del reloj, se memoriza para no repintarla cada fotograma. */
const Carpet = React.memo(function Carpet({ color }: { color: string }) {
  const edge = shade(color, -0.25)
  return (
    <g>
      <Shaded kind="fadeUp">
        <polygon
          points={pts([P(960 - CARPET_HALF, 1080, 0), P(960 + CARPET_HALF, 1080, 0), P(960 + CARPET_HALF, 1080, STEPS[0].front), P(960 - CARPET_HALF, 1080, STEPS[0].front)])}
          fill={color}
        />
      </Shaded>
      {[-1, 1].map(side => (
        <polygon
          key={side}
          points={pts([
            P(960 + side * (CARPET_HALF - 18), 1080, 0),
            P(960 + side * (CARPET_HALF - 6), 1080, 0),
            P(960 + side * (CARPET_HALF - 6), 1080, STEPS[0].front),
            P(960 + side * (CARPET_HALF - 18), 1080, STEPS[0].front),
          ])}
          fill={edge}
        />
      ))}
    </g>
  )
})

/** Estrado en tres peldaños, con la alfombra subiendo por el centro. */
/* Estática: no depende del reloj, se memoriza para no repintarla cada fotograma. */
const Dais = React.memo(function Dais({ carpet }: { carpet: string }) {
  return (
    <g>
      {/* Del peldaño más alto (el más lejano) al más bajo: cada uno tapa el
          pie del anterior. */}
      {[...STEPS].reverse().map((step, i) => {
        const k = STEPS.length - 1 - i
        const back = k === STEPS.length - 1 ? 1 : STEPS[k + 1].front
        const x0 = 960 - step.half
        const x1 = 960 + step.half
        const face = (a: number, b: number) =>
          pts([P(a, step.top, step.front), P(b, step.top, step.front), P(b, 1080, step.front), P(a, 1080, step.front)])
        const top = (a: number, b: number) =>
          pts([P(a, step.top, step.front), P(b, step.top, step.front), P(b, step.top, back), P(a, step.top, back)])
        return (
          <g key={k}>
            <polygon points={top(x0, x1)} fill={STONE.back} />
            <Shaded kind="fadeDown">
              <polygon points={face(x0, x1)} fill={STONE.dark} />
            </Shaded>
            <polygon points={top(960 - CARPET_HALF, 960 + CARPET_HALF)} fill={carpet} />
            <polygon points={face(960 - CARPET_HALF, 960 + CARPET_HALF)} fill={shade(carpet, -0.2)} />
          </g>
        )
      })}
    </g>
  )
})

/** Haces de luz de los ventanales sobre el suelo, con polvo flotando dentro. */
function Shafts({ light, time }: { light: Light; time: number }) {
  const { shaft, shaftAlpha } = LIGHT[light]
  const real = useRealistic()
  const tone = light === 'dia' ? 'white' : light === 'atardecer' ? 'warm' : 'cool'
  // La luz baja hacia el centro: cuanto más alto el punto, más lejos cae.
  const reach = (y: number) => (1080 - y) * 0.72
  return (
    <g>
      {[0, 1920].map(x => {
        const dir = x === 0 ? 1 : -1
        return WINDOWS.map((wc, i) => {
          const w0 = wc - WINDOW.half
          const w1 = wc + WINDOW.half
          const land = (y: number, w: number) => P(x + dir * reach(y), 1080, w)
          const beam = [P(x, WINDOW.top, w0), P(x, WINDOW.top, w1), land(WINDOW.top, w1), land(WINDOW.top, w0)]
          const patch = [land(WINDOW.bottom, w0), land(WINDOW.bottom, w1), land(WINDOW.top, w1), land(WINDOW.top, w0)]
          return (
            <g key={`${x}-${wc}`}>
              <polygon points={pts(beam)} fill={real ? beamFill(tone) : shaft} opacity={real ? shaftAlpha * 2.2 : shaftAlpha * 0.6} />
              <polygon points={pts(patch)} fill={shaft} opacity={shaftAlpha * 1.4} />
              {light !== 'noche' &&
                [0, 1, 2, 3, 4].map(k => {
                  const seed = i * 17 + k * 5 + x
                  // El polvo sube despacio y vuelve a entrar por abajo.
                  const along = (hash(seed) + time * 0.018 * (0.6 + hash(seed + 1))) % 1
                  const y = WINDOW.bottom - along * (WINDOW.bottom - WINDOW.top) + 200 * (1 - along)
                  const w = w0 + hash(seed + 2) * (w1 - w0)
                  const p = P(x + dir * (reach(y) * (0.3 + hash(seed + 3) * 0.5)), y, w)
                  return <circle key={k} cx={p.x} cy={p.y} r={3} fill={ACCENT.white} opacity={0.55 * Math.sin(along * Math.PI)} />
                })}
            </g>
          )
        })
      })}
    </g>
  )
}

// ----- Trono -----------------------------------------------------------------

/* Estática: no depende del reloj, se memoriza para no repintarla cada fotograma. */
const Throne = React.memo(function Throne({ metal, cushion }: { metal: string; cushion: string }) {
  const metalDark = shade(metal, -0.22)
  const cushionDark = shade(cushion, -0.3)
  const sw = 8
  const back = [
    [800, 800], [800, 360], [852, 300], [900, 330], [960, 210], [1020, 330], [1068, 300], [1120, 360], [1120, 800],
  ]
  const panel = [
    [832, 780], [832, 385], [866, 345], [910, 372], [960, 285], [1010, 372], [1054, 345], [1088, 385], [1088, 780],
  ]
  const poly = (list: number[][]) => list.map(p => p.join(',')).join(' ')

  const tufts: React.ReactElement[] = []
  for (let row = 0, y = 470; y <= 730; y += 55, row++) {
    for (let x = 870 + (row % 2) * 45; x <= 1050; x += 90) {
      tufts.push(<circle key={`${x}-${y}`} cx={x} cy={y} r={7} fill={cushionDark} />)
    }
  }

  return (
    <g transform={onPlane(0.97)}>
      <ContactShadow cx={960} cy={966} rx={380} ry={46} />
      <ellipse cx={960} cy={962} rx={250} ry={16} fill={shade(STONE.dark, -0.25)} />

      {/* Respaldo. */}
      {/* Un trazo del mismo color redondea las esquinas sin dibujar borde. */}
      <Shaded kind="cylX">
        <polygon points={poly(back)} fill={metal} stroke={metal} strokeWidth={12} strokeLinejoin="round" />
      </Shaded>
      <polygon points={poly([[800, 800], [800, 360], [816, 342], [816, 800]])} fill={shade(metal, 0.32)} />
      <polygon points={poly([[1090, 800], [1090, 370], [1120, 360], [1120, 800]])} fill={metalDark} />
      <Shaded kind="sphere">
        <polygon points={poly(panel)} fill={cushion} />
      </Shaded>
      <polygon points={poly([[1040, 780], [1040, 368], [1054, 345], [1088, 385], [1088, 780]])} fill={cushionDark} opacity={0.5} />
      {tufts}
      <Crown cx={960} cy={400} size={92} fill={metal} />
      {[
        [852, 290, 16],
        [960, 196, 20],
        [1068, 290, 16],
      ].map(([x, y, r]) => (
        <g key={x}>
          <Shaded kind="sphere">
            <circle cx={x} cy={y} r={r} fill={metal} />
          </Shaded>
          <ellipse cx={x - r * 0.3} cy={y - r * 0.32} rx={r * 0.36} ry={r * 0.26} fill={shade(metal, 0.45)} />
        </g>
      ))}

      {/* Patas y faldón. */}
      {[775, 1105].map(x => (
        <g key={x}>
          <Shaded kind="cylX">
            <rect x={x} y={790} width={40} height={150} fill={metal} />
          </Shaded>
          <rect x={x + 26} y={790} width={14} height={150} fill={metalDark} />
          <ellipse cx={x + 20} cy={950} rx={32} ry={18} fill={metalDark} />
          <ellipse cx={x + 20} cy={942} rx={32} ry={17} fill={metal} />
        </g>
      ))}
      <polygon
        points={poly([[815, 800], [1105, 800], [1105, 842], [1060, 862], [1010, 842], [960, 866], [910, 842], [860, 862], [815, 842]])}
        fill={metalDark}
      />

      {/* Asiento. */}
      <Shaded kind="cylY">
        <rect x={790} y={752} width={340} height={52} rx={10} fill={metal} />
      </Shaded>
      <rect x={790} y={790} width={340} height={14} rx={7} fill={metalDark} />
      <circle cx={960} cy={778} r={13} fill={ACCENT.red} />
      <circle cx={880} cy={778} r={9} fill={ACCENT.blue} />
      <circle cx={1040} cy={778} r={9} fill={ACCENT.blue} />
      {/* Cojín: canto oscuro debajo, brillo arriba y el lado en sombra. */}
      <rect x={806} y={710} width={308} height={58} rx={22} fill={cushionDark} />
      <Shaded kind="cylY">
        <rect x={806} y={700} width={308} height={58} rx={22} fill={cushion} />
      </Shaded>
      <rect x={1052} y={706} width={56} height={46} rx={18} fill={cushionDark} opacity={0.5} />
      <rect x={836} y={708} width={190} height={10} rx={5} fill={shade(cushion, 0.3)} />

      {/* Brazos: salen del canto del respaldo y bajan hasta el asiento, con el
          poste delante y el pomo rematándolo. Se dibuja el izquierdo y se refleja. */}
      {[1, -1].map(side => (
        <g key={side} transform={side < 0 ? 'translate(1920 0) scale(-1 1)' : undefined}>
          <rect x={722} y={630} width={80} height={126} fill={metalDark} />
          <Shaded kind="cylX">
            <rect x={710} y={612} width={42} height={192} rx={6} fill={metal} />
          </Shaded>
          <rect x={704} y={602} width={100} height={36} rx={16} fill={cushionDark} />
          <Shaded kind="cylY">
            <rect x={704} y={594} width={100} height={34} rx={16} fill={cushion} />
          </Shaded>
          <circle cx={731} cy={610} r={24} fill={metalDark} />
          <Shaded kind="sphere">
            <circle cx={731} cy={604} r={24} fill={metal} />
          </Shaded>
          <ellipse cx={724} cy={597} rx={9} ry={6} fill={shade(metal, 0.45)} />
        </g>
      ))}
    </g>
  )
})

// ----- Luces con llama ---------------------------------------------------------

const TORCHES = [-820, 820].map(dx => ({ x: 960 + dx, y: 540 }))

function TorchMounts({ metal }: { metal: string }) {
  return (
    <g transform={onPlane(1)}>
      {TORCHES.map(({ x, y }) => (
        <g key={x}>
          <polygon points={`${x - 12},${y + 40} ${x + 12},${y + 40} ${x + 26},${y + 150} ${x - 26},${y + 150}`} fill={PANEL.bezel} />
          <polygon points={`${x - 48},${y} ${x + 48},${y} ${x + 28},${y + 48} ${x - 28},${y + 48}`} fill={metal} />
        </g>
      ))}
    </g>
  )
}

function TorchFlames({ time, flicker, glow }: { time: number; flicker: number; glow: number }) {
  return (
    <g transform={onPlane(1)}>
      {TORCHES.map(({ x, y }, i) => (
        <g key={x}>
          <SoftGlow cx={x} cy={y - 40} r={520} opacity={Math.min(1, glow * 4)} />
          <Glow x={x} y={y - 50} r={190} time={time} alpha={glow} seed={i * 3} />
          <Flame x={x} y={y + 4} size={120} time={time} flicker={flicker} seed={i * 3} />
        </g>
      ))}
    </g>
  )
}

/** El candelabro cuelga a media sala y se mece apenas. */
const CHANDELIER = { w: 0.34, ringY: 190, rx: 170, ry: 26 }
const CANDLE_ANGLES = [0, 0.25, 0.5, 0.75, 1].map(k => k * Math.PI)

function chandelierTransform(time: number) {
  return `${onPlane(CHANDELIER.w)} rotate(${Math.sin(time * 0.6) * 1.2} 960 0)`
}

function candlePos(a: number) {
  return { x: 960 + Math.cos(a) * CHANDELIER.rx, y: CHANDELIER.ringY + Math.sin(a) * CHANDELIER.ry }
}

function ChandelierBody({ metal, time }: { metal: string; time: number }) {
  const { ringY, rx, ry } = CHANDELIER
  return (
    <g transform={chandelierTransform(time)}>
      <line x1={960} y1={0} x2={960} y2={ringY - 60} stroke={PANEL.bezel} strokeWidth={8} />
      {[-1, 1].map(s => (
        <line key={s} x1={960} y1={ringY - 60} x2={960 + s * rx * 0.8} y2={ringY + 4} stroke={PANEL.bezel} strokeWidth={5} />
      ))}
      <ellipse cx={960} cy={ringY} rx={rx} ry={ry} fill="none" stroke={metal} strokeWidth={12} />
      {CANDLE_ANGLES.map(a => {
        const p = candlePos(a)
        return <rect key={a} x={p.x - 9} y={p.y - 50} width={18} height={50} rx={4} fill={PANEL.plateLight} />
      })}
      <circle cx={960} cy={ringY - 60} r={14} fill={metal} />
    </g>
  )
}

function ChandelierFlames({ time, flicker, glow }: { time: number; flicker: number; glow: number }) {
  return (
    <g transform={chandelierTransform(time)}>
      {CANDLE_ANGLES.map((a, i) => {
        const p = candlePos(a)
        return (
          <g key={a}>
            <SoftGlow cx={p.x} cy={p.y - 60} r={170} opacity={Math.min(1, glow * 3)} />
            <Glow x={p.x} y={p.y - 66} r={60} time={time} alpha={glow * 0.8} seed={i + 10} />
            <Flame x={p.x} y={p.y - 50} size={36} time={time} flicker={flicker} seed={i + 10} />
          </g>
        )
      })}
    </g>
  )
}

// ----- Escena ------------------------------------------------------------------

export default function TronoRey({ values, time }: SceneProps) {
  const light = values.light as Light
  const shafts = values.shafts as boolean
  const torches = values.torches as boolean
  const chandelier = values.chandelier as boolean
  const metal = values.metalColor as string
  const cushion = values.cushionColor as string
  const carpet = values.carpetColor as string
  const banner = values.bannerColor as string
  const flicker = values.flicker as number
  const sway = values.sway as number

  const { dim, glow } = LIGHT[light]

  return (
    <g>
      <Room />
      <BackWall bannerColor={banner} time={time} sway={sway} metal={metal} />
      {torches && <TorchMounts metal={metal} />}
      <Windows light={light} />
      <Pillars />
      <Carpet color={carpet} />
      {shafts && <Shafts light={light} time={time} />}
      <Dais carpet={carpet} />
      <Throne metal={metal} cushion={cushion} />
      <Beams />
      {chandelier && <ChandelierBody metal={metal} time={time} />}

      {/* La hora oscurece el salón entero; las llamas van encima, sin apagar. */}
      {dim > 0 && <rect width={STAGE.width} height={STAGE.height} fill={SPACE.deep} opacity={dim} />}
      {torches && <TorchFlames time={time} flicker={flicker} glow={glow} />}
      {chandelier && <ChandelierFlames time={time} flicker={flicker} glow={glow} />}
      <Vignette />
    </g>
  )
}
