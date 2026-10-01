/**
 * "Trono del rey" en estilo diorama: un salón de arcos a contraluz.
 *
 * Cuatro arcos recortados se alejan en capas hacia un gran rosetón, que es la
 * fuente de luz. El trono queda casi en silueta con los bordes encendidos; los
 * rayos del rosetón cruzan el salón hasta el suelo y los pilares de cada arco
 * proyectan franjas de sombra hacia el espectador. Estandartes entre capas,
 * antorchas en los pilares, un candelabro colgando cerca de la cámara y
 * cortinas en primer plano.
 *
 * Usa la misma ficha que el plano: hora (el color del rosetón), rayos,
 * antorchas, candelabro, colores del metal, tapizado, alfombra y estandartes,
 * llamas y vaivén.
 */
import React from 'react'
import { ACCENT, PANEL, SPACE, STAGE, mix, shade } from '../../shared/palette'
import type { SceneProps } from '../../renderer/scene/contract'
import { Flame } from '../../renderer/scene/fire'
import { hash } from '../../renderer/scene/room'
import { Halo, Haze, Layer, LightPool, Rays } from '../../renderer/scene/diorama'

type Light = 'dia' | 'atardecer' | 'noche'

interface Mood {
  wall: string
  glass: string
  key: string
  haze: string
  dim: number
  torch: number
}

const MOOD: Record<Light, Mood> = {
  dia: { wall: PANEL.plateEdge, glass: shade(ACCENT.blue, 0.72), key: shade(ACCENT.amber, 0.82), haze: shade(ACCENT.blue, 0.8), dim: 0.05, torch: 0.3 },
  atardecer: { wall: shade(PANEL.plateEdge, -0.1), glass: shade(ACCENT.orange, 0.3), key: ACCENT.amber, haze: shade(ACCENT.orange, 0.5), dim: 0.25, torch: 0.7 },
  noche: { wall: shade(PANEL.bezel, 0.25), glass: shade(ACCENT.blue, 0.2), key: shade(ACCENT.blue, 0.7), haze: SPACE.nebula, dim: 0.5, torch: 1 },
}

const CX = STAGE.width / 2
const ROSE = { x: CX, y: 330, r: 230 }
/** El suelo se abre del horizonte (lejos) al borde del cuadro (cerca). */
const FLOOR = { horizon: 660, near: 1080 }

function toned(color: string, dim: number): string {
  return mix(color, SPACE.deep, dim)
}

/** Altura del suelo para un arco a cierta cercanía (0 = fondo, 1 = cámara). */
function floorAt(k: number): number {
  return FLOOR.horizon + (FLOOR.near + 180 - FLOOR.horizon) * k
}

// ----- Fondo: muro y rosetón -----------------------------------------------------

/* Estática: no depende del reloj, se memoriza para no repintarla cada fotograma. */
const RoseWall = React.memo(function RoseWall({ mood }: { mood: Mood }) {
  const { x, y, r } = ROSE
  const stone = toned(mood.wall, mood.dim * 0.6)
  const tracery = toned(shade(mood.wall, -0.25), mood.dim)
  return (
    <g>
      <rect x={-60} y={-60} width={STAGE.width + 120} height={FLOOR.horizon + 120} fill={stone} />
      {/* Hiladas de piedra, apenas marcadas. */}
      <g fill={shade(stone, -0.06)}>
        {Array.from({ length: 7 }, (_, i) => (
          <rect key={i} x={-60} y={40 + i * 90} width={STAGE.width + 120} height={5} />
        ))}
      </g>
      <circle cx={x} cy={y} r={r + 34} fill={shade(stone, -0.12)} />
      <circle cx={x} cy={y} r={r} fill={mood.glass} />
      {/* Vidrieras: pétalos más claros alrededor del centro. */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2
        return <circle key={i} cx={x + Math.cos(a) * r * 0.58} cy={y + Math.sin(a) * r * 0.58} r={r * 0.3} fill={mix(mood.glass, ACCENT.white, 0.35)} />
      })}
      <circle cx={x} cy={y} r={r * 0.26} fill={mix(mood.glass, ACCENT.white, 0.55)} />
      {/* Tracería de piedra por encima del vidrio. */}
      <g fill="none" stroke={tracery} strokeWidth={16}>
        <circle cx={x} cy={y} r={r * 0.26} />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2
          return <circle key={i} cx={x + Math.cos(a) * r * 0.58} cy={y + Math.sin(a) * r * 0.58} r={r * 0.3} />
        })}
      </g>
    </g>
  )
})

// ----- Arcos ------------------------------------------------------------------------

interface ArchSpec {
  k: number
  half: number
  spring: number
}

/** Cuatro arcos, del fondo a la cámara: cada vez más anchos y más altos. */
const ARCHES: ArchSpec[] = [
  { k: 0.08, half: 330, spring: 360 },
  { k: 0.32, half: 440, spring: 330 },
  { k: 0.6, half: 580, spring: 300 },
  { k: 0.9, half: 760, spring: 250 },
]

function archHole({ k, half, spring }: ArchSpec): string {
  const bottom = floorAt(k)
  return `M ${CX - half} ${bottom} L ${CX - half} ${spring} A ${half} ${half * 0.9} 0 0 1 ${CX + half} ${spring} L ${CX + half} ${bottom} Z`
}

/** Un arco: muro con el hueco recortado, su canto iluminado y la sombra de sus pilares. */
function Arch({ spec, mood, index }: { spec: ArchSpec; mood: Mood; index: number }) {
  // Los arcos cercanos quedan más oscuros: están de espaldas a la luz.
  const dim = Math.min(0.88, mood.dim + spec.k * 0.55)
  const stone = toned(mood.wall, dim)
  const bottom = floorAt(spec.k)
  // El muro llega sólo hasta su base: por debajo se ve el suelo que tiene delante.
  const frame = `M -300 -300 H ${STAGE.width + 300} V ${bottom} H -300 Z ${archHole(spec)}`
  const pillar = spec.half * 0.16
  return (
    <g>
      {/* Sombra de los pilares hacia el espectador: la luz viene del rosetón. */}
      <g fill={SPACE.deep} opacity={0.18}>
        {[-1, 1].map(side => {
          const x = CX + side * spec.half
          return (
            <polygon
              key={side}
              points={`${x},${bottom} ${x + side * pillar},${bottom} ${x + side * (pillar + spec.half * 0.9)},${bottom + 700} ${x + side * spec.half * 0.5},${bottom + 700}`}
            />
          )
        })}
      </g>
      <path d={frame} fillRule="evenodd" fill={stone} />
      {/* Canto interior encendido por la luz que pasa por el hueco. */}
      <path d={archHole(spec)} fill="none" stroke={mood.key} strokeWidth={10 + index * 3} opacity={0.3 + index * 0.08} />
      {/* Dovelas: marcas de piedra alrededor del arco. */}
      <g fill={shade(stone, -0.18)}>
        {Array.from({ length: 9 }, (_, i) => {
          const a = Math.PI + (i / 8) * Math.PI
          const rx = spec.half + 40
          const ry = spec.half * 0.9 + 40
          return (
            <rect
              key={i}
              x={CX + Math.cos(a) * rx - 8}
              y={spec.spring + Math.sin(a) * ry - 18}
              width={16}
              height={36}
              rx={6}
              transform={`rotate(${(a * 180) / Math.PI + 90} ${CX + Math.cos(a) * rx} ${spec.spring + Math.sin(a) * ry})`}
            />
          )
        })}
      </g>
    </g>
  )
}

// ----- Suelo, alfombra y trono -------------------------------------------------------

function Floor({ mood, carpet }: { mood: Mood; carpet: string }) {
  const stone = toned(shade(mood.wall, -0.08), mood.dim)
  return (
    <g>
      <rect x={-60} y={FLOOR.horizon} width={STAGE.width + 120} height={STAGE.height} fill={stone} />
      {/* Baldosas: franjas que convergen al centro. */}
      <g fill={shade(stone, -0.08)}>
        {Array.from({ length: 12 }, (_, i) => {
          const x = -400 + i * 250
          return <polygon key={i} points={`${CX + (x - CX) * 0.18},${FLOOR.horizon} ${CX + (x + 120 - CX) * 0.18},${FLOOR.horizon} ${x + 120},${FLOOR.near} ${x},${FLOOR.near}`} />
        })}
      </g>
      <polygon points={`${CX - 70},${FLOOR.horizon + 40} ${CX + 70},${FLOOR.horizon + 40} ${CX + 230},${FLOOR.near} ${CX - 230},${FLOOR.near}`} fill={toned(carpet, mood.dim)} />
      <polygon points={`${CX - 58},${FLOOR.horizon + 40} ${CX - 48},${FLOOR.horizon + 40} ${CX - 200},${FLOOR.near} ${CX - 214},${FLOOR.near}`} fill={toned(ACCENT.amber, mood.dim)} />
      <polygon points={`${CX + 58},${FLOOR.horizon + 40} ${CX + 48},${FLOOR.horizon + 40} ${CX + 200},${FLOOR.near} ${CX + 214},${FLOOR.near}`} fill={toned(ACCENT.amber, mood.dim)} />
    </g>
  )
}

/** Trono a contraluz: silueta oscura con el canto encendido por el rosetón. */
function Throne({ mood, metal, cushion }: { mood: Mood; metal: string; cushion: string }) {
  const dim = Math.min(0.8, mood.dim + 0.35)
  const body = toned(metal, dim)
  const pad = toned(cushion, dim)
  const y = FLOOR.horizon + 70
  const back = `M ${CX - 90} ${y} L ${CX - 90} ${y - 250} L ${CX - 60} ${y - 290} L ${CX - 30} ${y - 270} L ${CX} ${y - 340} L ${CX + 30} ${y - 270} L ${CX + 60} ${y - 290} L ${CX + 90} ${y - 250} L ${CX + 90} ${y} Z`
  // Grande y centrado delante del rosetón: así queda a contraluz.
  return (
    <g transform={`translate(${CX} ${y}) scale(1.35) translate(${-CX} ${-y})`}>
      {/* Estrado. */}
      {[0, 1, 2].map(i => (
        <rect key={i} x={CX - 200 + i * 40} y={y + 30 - i * 26} width={400 - i * 80} height={30} rx={8} fill={toned(mood.wall, Math.min(0.8, mood.dim + 0.2 + i * 0.05))} />
      ))}
      <rect x={CX - 200} y={y + 28} width={400} height={6} rx={3} fill={mood.key} opacity={0.35} />
      <path d={back} fill={body} stroke={body} strokeWidth={10} strokeLinejoin="round" />
      {/* Canto encendido: la luz lo recorta por arriba. */}
      <path d={back} fill="none" stroke={mood.key} strokeWidth={5} opacity={0.75} strokeDasharray="0 0" />
      <path d={`M ${CX - 64} ${y - 20} L ${CX - 64} ${y - 230} L ${CX} ${y - 290} L ${CX + 64} ${y - 230} L ${CX + 64} ${y - 20} Z`} fill={pad} />
      <rect x={CX - 120} y={y - 60} width={240} height={40} rx={14} fill={pad} />
      <rect x={CX - 130} y={y - 26} width={260} height={30} rx={10} fill={body} />
      {[-1, 1].map(side => (
        <g key={side}>
          <rect x={CX + side * 120 - 14} y={y - 120} width={28} height={100} rx={8} fill={body} />
          <circle cx={CX + side * 120} cy={y - 124} r={18} fill={body} />
          <circle cx={CX + side * 120} cy={y - 128} r={7} fill={mood.key} opacity={0.7} />
        </g>
      ))}
      <circle cx={CX} cy={y - 348} r={12} fill={toned(metal, mood.dim)} />
    </g>
  )
}

// ----- Estandartes, antorchas, candelabro y cortinas ------------------------------------

function Banner({ x, top, length, width, color, mood, time, sway, seed, dim }: { x: number; top: number; length: number; width: number; color: string; mood: Mood; time: number; sway: number; seed: number; dim: number }) {
  const dx = Math.sin(time * 0.8 + seed) * 16 * sway
  const c = toned(color, dim)
  const pts = `${x - width / 2},${top} ${x + width / 2},${top} ${x + width / 2 + dx},${top + length} ${x + dx},${top + length - width * 0.4} ${x - width / 2 + dx},${top + length}`
  return (
    <g>
      <polygon points={pts} fill={SPACE.deep} opacity={0.22} transform="translate(-14 12)" />
      <polygon points={pts} fill={c} />
      <polygon points={`${x + width * 0.1},${top} ${x + width / 2},${top} ${x + width / 2 + dx},${top + length} ${x + width * 0.1 + dx * 0.6},${top + length - width * 0.3}`} fill={shade(c, -0.2)} />
      <rect x={x - width / 2 - 14} y={top - 12} width={width + 28} height={16} rx={8} fill={toned(PANEL.bezel, dim * 0.5)} />
      <rect x={x - width / 2} y={top} width={6} height={length - 20} fill={mood.key} opacity={0.3} />
    </g>
  )
}

function Torch({ x, y, time, flicker, mood, seed }: { x: number; y: number; time: number; flicker: number; mood: Mood; seed: number }) {
  return (
    <g>
      <Halo cx={x} cy={y - 40} r={260} color={ACCENT.amber} alpha={mood.torch} />
      <polygon points={`${x - 10},${y + 20} ${x + 10},${y + 20} ${x + 20},${y + 110} ${x - 20},${y + 110}`} fill={toned(PANEL.bezel, 0.2)} />
      <polygon points={`${x - 34},${y - 6} ${x + 34},${y - 6} ${x + 20},${y + 26} ${x - 20},${y + 26}`} fill={toned(ACCENT.amber, mood.dim)} />
      <Flame x={x} y={y - 2} size={70} time={time} flicker={flicker} seed={seed} />
    </g>
  )
}

function Chandelier({ time, flicker, mood, metal }: { time: number; flicker: number; mood: Mood; metal: string }) {
  const swing = Math.sin(time * 0.5) * 2
  const c = toned(metal, Math.min(0.8, mood.dim + 0.3))
  const cy = 170
  return (
    <g transform={`rotate(${swing} ${CX} -40)`}>
      <rect x={CX - 4} y={-40} width={8} height={cy - 30} fill={toned(PANEL.bezel, 0.3)} />
      <Halo cx={CX} cy={cy - 40} r={300} color={ACCENT.amber} alpha={mood.torch * 0.8} />
      <ellipse cx={CX} cy={cy} rx={260} ry={34} fill="none" stroke={c} strokeWidth={18} />
      <ellipse cx={CX} cy={cy - 4} rx={260} ry={34} fill="none" stroke={mood.key} strokeWidth={4} opacity={0.4} />
      {[-1, -0.5, 0, 0.5, 1].map((u, i) => {
        const x = CX + u * 240
        const y = cy + Math.sqrt(Math.max(0, 1 - u * u)) * 30
        return (
          <g key={u}>
            <rect x={x - 10} y={y - 56} width={20} height={56} rx={5} fill={toned(PANEL.plateLight, mood.dim * 0.6)} />
            <Flame x={x} y={y - 56} size={40} time={time} flicker={flicker} seed={i + 20} />
          </g>
        )
      })}
    </g>
  )
}

function Curtains({ color, mood, time, sway }: { color: string; mood: Mood; time: number; sway: number }) {
  const c = toned(color, Math.min(0.85, mood.dim + 0.45))
  return (
    <g>
      {[-1, 1].map(side => {
        const edge = side < 0 ? 0 : STAGE.width
        const dx = Math.sin(time * 0.5 + side) * 8 * sway
        const inner = edge - side * 320
        const d = `M ${edge - side * 40} -40 L ${inner + dx} -40 Q ${inner - side * 60 + dx} 400 ${inner + side * 140} 620 Q ${inner + side * 60} 860 ${inner + side * 20 + dx} 1120 L ${edge - side * 40} 1120 Z`
        return (
          <g key={side}>
            <path d={d} fill={c} />
            {[0.3, 0.55, 0.8].map(t => (
              <path
                key={t}
                d={`M ${edge - side * 320 * t} -40 Q ${edge - side * 320 * t - side * 40} 500 ${edge - side * 320 * t + side * 60} 1120`}
                fill="none"
                stroke={shade(c, -0.25)}
                strokeWidth={14}
              />
            ))}
            <path d={`M ${inner + dx} -40 Q ${inner - side * 60 + dx} 400 ${inner + side * 140} 620`} fill="none" stroke={mood.key} strokeWidth={6} opacity={0.35} />
            {/* Alzapaño dorado. */}
            <ellipse cx={inner + side * 150} cy={622} rx={46} ry={20} fill={toned(ACCENT.amber, mood.dim)} />
          </g>
        )
      })}
    </g>
  )
}

/** Polvo en los rayos: motas que suben despacio. */
function Motes({ time, mood }: { time: number; mood: Mood }) {
  return (
    <g fill={mood.key}>
      {Array.from({ length: 22 }, (_, i) => {
        const along = (hash(i + 3) + time * 0.02 * (0.5 + hash(i + 7))) % 1
        const x = CX + (hash(i + 11) - 0.5) * 900 * (0.4 + along)
        const y = ROSE.y + 80 + (1 - along) * 620
        return <circle key={i} cx={x} cy={y} r={2.5 + hash(i) * 2} opacity={0.6 * Math.sin(along * Math.PI)} />
      })}
    </g>
  )
}

// ----- Escena --------------------------------------------------------------------------

export default function TronoDiorama({ values, time }: SceneProps) {
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
  const mood = MOOD[light]

  return (
    <g>
      {/* 0 · muro del fondo con el rosetón */}
      <Layer depth={0.03} time={time}>
        <RoseWall mood={mood} />
        <Halo cx={ROSE.x} cy={ROSE.y} r={ROSE.r * 2.2} color={mood.key} alpha={1.3} />
      </Layer>

      {/* 1 · suelo y alfombra, con la luz del rosetón derramada */}
      <Layer depth={0.2} time={time}>
        <Floor mood={mood} carpet={carpet} />
        <LightPool cx={CX} cy={FLOOR.horizon + 150} rx={520} ry={110} color={mood.key} alpha={1.4} />
      </Layer>

      {/* 2 · primer arco y trono */}
      <Layer depth={0.28} time={time}>
        <Arch spec={ARCHES[0]} mood={mood} index={0} />
        <Throne mood={mood} metal={metal} cushion={cushion} />
      </Layer>
      <Haze color={mood.haze} opacity={0.12} />

      {/* Rayos del rosetón hacia el suelo, con polvo. */}
      {shafts && (
        <>
          <Rays x={ROSE.x} y={ROSE.y} from={Math.PI * 0.2} to={Math.PI * 0.8} count={9} length={1400} color={mood.key} opacity={0.13} time={time} />
          <Motes time={time} mood={mood} />
        </>
      )}

      {/* 3 · segundo arco, con los estandartes colgados de su muro */}
      <Layer depth={0.42} time={time}>
        <Arch spec={ARCHES[1]} mood={mood} index={1} />
        {[-1, 1].map(side => (
          <Banner key={side} x={CX + side * 520} top={150} length={400} width={120} color={banner} mood={mood} time={time} sway={sway} seed={side} dim={Math.min(0.8, mood.dim + 0.2)} />
        ))}
      </Layer>
      <Haze color={mood.haze} opacity={0.06} />

      {/* 4 · tercer arco, con las antorchas en sus pilares */}
      <Layer depth={0.6} time={time}>
        <Arch spec={ARCHES[2]} mood={mood} index={2} />
        {torches && [-1, 1].map(side => <Torch key={side} x={CX + side * 660} y={560} time={time} flicker={flicker} mood={mood} seed={side * 3} />)}
      </Layer>

      {/* 5 · arco cercano, candelabro y cortinas */}
      <Layer depth={0.85} time={time}>
        <Arch spec={ARCHES[3]} mood={mood} index={3} />
      </Layer>
      {chandelier && (
        <Layer depth={0.9} time={time}>
          <Chandelier time={time} flicker={flicker} mood={mood} metal={metal} />
        </Layer>
      )}
      <Layer depth={1} time={time}>
        <Curtains color={banner} mood={mood} time={time} sway={sway} />
      </Layer>
    </g>
  )
}
