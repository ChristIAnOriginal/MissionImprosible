/**
 * La cabina: el marco común de casi todas las animaciones.
 *
 * Es una caja en perspectiva de un punto (ver `perspective.ts`): el encuadre es
 * la boca y un rectángulo menor, el mamparo del fondo, lleva el parabrisas y el
 * salpicadero. Techo, suelo y paredes son los trapecios que los unen y todos
 * convergen al mismo punto de fuga; las paredes tienen sus propias ventanillas,
 * así que el espacio se ve por tres huecos y no por uno.
 *
 * El punto de vista es el de alguien **detrás de los dos asientos**, que quedan
 * centrados flanqueando el pedestal.
 *
 * `children` es lo que se ve fuera: se recorta al parabrisas y a las ventanillas.
 *
 * En estilo realista (`realism.tsx`): las paredes, el techo y el suelo se
 * oscurecen hacia el espectador, el cristal lleva su reflejo, la luz de la
 * consola se derrama sobre el salpicadero y los respaldos, los asientos tienen
 * volumen y el encuadre se cierra con un viñeteado.
 */
import React from 'react'
import { ACCENT, FONT, INK, PANEL, RADIUS, SPACE, STROKE, shade } from '../../shared/palette'
import {
  ButtonGrid,
  Gauge,
  Lamp,
  Lever,
  LightStrip,
  PanelPlate,
  ScreenBox,
  SquareButton,
  ToggleSwitch,
} from './instruments'
import {
  BULKHEAD,
  boxPoint,
  ceilingPoint,
  depthAtY,
  floorPoint,
  poly,
  scaleAt,
  towardVP,
  wallPoint,
  type Pt,
} from './perspective'
import { ColorGlow, Shaded, SoftGlow, Vignette, shadeFill, useRealistic } from './realism'

/** Alturas dentro de la caja, en fracción de su alto a cada profundidad. */
const LAYOUT = {
  glassTop: 0.048,
  glassBottom: 0.497,
  /** Grosor de la visera, por debajo del cristal. */
  glareDepth: 0.072,
  panelBottom: 748,
  /** Alto de los respaldos: queda por debajo de las placas para no morderlas. */
  seatTop: 664,
  pedestalNear: { left: 760, right: 1160 },
} as const

/**
 * Perfil del parabrisas. El cristal **no** es plano sobre el mamparo: la luna
 * central está en el fondo (`u` = 1) y las de los lados se acercan al
 * espectador, que es lo que hace que envuelva como una cabina de avión en vez
 * de leerse como una ventana recortada.
 *
 * `topPad` baja un poco el borde superior hacia los extremos, como el morro.
 */
const GLASS_RIBS: { h: number; u: number; topPad: number }[] = [
  { h: 0.112, u: 0.78, topPad: 0.042 },
  { h: 0.245, u: 0.92, topPad: 0.018 },
  { h: 0.378, u: 0.985, topPad: 0.005 },
  { h: 0.5, u: 1, topPad: 0 },
  { h: 0.622, u: 0.985, topPad: 0.005 },
  { h: 0.755, u: 0.92, topPad: 0.018 },
  { h: 0.888, u: 0.78, topPad: 0.042 },
]

const ribTop = (r: (typeof GLASS_RIBS)[number]) => boxPoint(r.u, r.h, LAYOUT.glassTop + r.topPad)
const ribBottom = (r: (typeof GLASS_RIBS)[number]) => boxPoint(r.u, r.h, LAYOUT.glassBottom)
const ribGlare = (r: (typeof GLASS_RIBS)[number]) =>
  boxPoint(r.u, r.h, LAYOUT.glassBottom + LAYOUT.glareDepth)

/** Una luna por hueco entre costillas. */
function glassPanes(): Pt[][] {
  return GLASS_RIBS.slice(0, -1).map((r, i) => {
    const n = GLASS_RIBS[i + 1]
    return [ribTop(r), ribTop(n), ribBottom(n), ribBottom(r)]
  })
}

/** Silueta exterior del parabrisas entero, para el marco. */
function glassOutline(): Pt[] {
  return [...GLASS_RIBS.map(ribTop), ...[...GLASS_RIBS].reverse().map(ribBottom)]
}

function bounds(points: Pt[]) {
  const xs = points.map(p => p.x)
  const ys = points.map(p => p.y)
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }
}

/** Caja del parabrisas. Las escenas la usan para colocar lo que se ve fuera. */
export const WINDOW = bounds(glassOutline())

/** Donde arranca la chapa del salpicadero: bajo el punto más hondo de la visera. */
const PANEL_TOP = Math.max(...GLASS_RIBS.map(r => ribGlare(r).y))

/** Ventanillas de las paredes, en coordenadas de pared (profundidad, altura). */
const SIDE_WINDOW = { uNear: 0.32, uFar: 0.94, vTop: 0.13, vBottom: 0.46 } as const

function sideWindowPoints(side: 'left' | 'right'): Pt[] {
  const { uNear, uFar, vTop, vBottom } = SIDE_WINDOW
  return [
    wallPoint(side, uNear, vTop),
    wallPoint(side, uFar, vTop),
    wallPoint(side, uFar, vBottom),
    wallPoint(side, uNear, vBottom),
  ]
}

export type ConsoleMode = 'calma' | 'alerta' | 'apagada'

interface ModeSkin {
  lamps: string[]
  strip: string
  buttons: string[]
}

const MODE: Record<ConsoleMode, ModeSkin> = {
  calma: {
    lamps: [ACCENT.teal, ACCENT.green, ACCENT.blue],
    strip: ACCENT.teal,
    buttons: [ACCENT.teal, ACCENT.blue, ACCENT.green, ACCENT.amber],
  },
  alerta: {
    lamps: [ACCENT.red, ACCENT.amber],
    strip: ACCENT.red,
    buttons: [ACCENT.red, ACCENT.amber, ACCENT.red, ACCENT.orange],
  },
  apagada: { lamps: [], strip: PANEL.screw, buttons: [] },
}

/**
 * Cuánta luz tiene cada zona, de 0 a 1. Dentro de una zona los pilotos se van
 * encendiendo por orden según sube el valor, que es lo que da el efecto de
 * arranque escalonado en vez de un interruptor de todo o nada.
 */
export interface CabinPower {
  centre: number
  sides: number
  overhead: number
}

export const FULL_POWER: CabinPower = { centre: 1, sides: 1, overhead: 1 }

/** ¿Le toca estar encendido al elemento `index` de `total` con esta potencia? */
function litUpTo(index: number, total: number, power: number): boolean {
  return index < Math.round(power * total)
}

export interface CabinFrameProps {
  /** Reloj de la animación, en segundos. */
  time: number
  mode?: ConsoleMode
  /** Luz por zona. Por defecto, todo encendido. */
  power?: CabinPower
  /** 0 = cabina iluminada, 1 = a oscuras. Los huecos al exterior no se tocan. */
  dim?: number
  children?: React.ReactNode
}

export function CabinFrame({
  time,
  mode = 'calma',
  power = FULL_POWER,
  dim = 0,
  children,
}: CabinFrameProps) {
  const skin = MODE[mode]
  const lit = mode !== 'apagada'
  // En alerta todo late al doble de ritmo; en calma respira.
  const beat = mode === 'alerta' ? Math.sin(time * 6) > 0 : Math.sin(time * 1.4) > -0.4

  return (
    <g>
      <Shell />
      <Outside>{children}</Outside>
      <GlassFrames />
      <Walls skin={skin} lit={lit} beat={beat} power={power.sides} />
      <Overhead skin={skin} lit={lit} time={time} power={power.overhead} />
      <MainPanel skin={skin} lit={lit} beat={beat} time={time} power={power} />
      <Pedestal skin={skin} lit={lit} time={time} power={power.centre} />
      {/* Realista: la luz de la consola se derrama hacia los asientos. */}
      {lit && <ColorGlow cx={960} cy={PANEL_TOP + 140} r={760} color={skin.strip} opacity={0.22 * power.centre} />}
      <Seat side="left" />
      <Seat side="right" />
      {dim > 0 && <Dim amount={dim} />}
      <Vignette />
    </g>
  )
}

// ----- Caja de la cabina --------------------------------------------------

/** Techo, suelo, paredes y mamparo: los cinco planos de la caja. */
function Shell() {
  const wall = shade(PANEL.plate, -0.16)
  const roof = shade(PANEL.plate, -0.24)
  const floor = shade(PANEL.plate, -0.32)

  return (
    <g>
      <rect x={0} y={0} width={1920} height={1080} fill={PANEL.plate} />
      <Shaded kind="fadeUp" opacity={0.7}>
        <polygon
          points={poly([ceilingPoint(0, 0), ceilingPoint(0, 1), ceilingPoint(1, 1), ceilingPoint(1, 0)])}
          fill={roof}
        />
      </Shaded>
      <Shaded kind="fadeDown" opacity={0.8}>
        <polygon
          points={poly([floorPoint(0, 0), floorPoint(1, 0), floorPoint(1, 1), floorPoint(0, 1)])}
          fill={floor}
        />
      </Shaded>
      <Shaded kind="cylXRev" opacity={0.8}>
        <polygon
          points={poly([
            wallPoint('left', 0, 0),
            wallPoint('left', 1, 0),
            wallPoint('left', 1, 1),
            wallPoint('left', 0, 1),
          ])}
          fill={wall}
        />
      </Shaded>
      <Shaded kind="cylX" opacity={0.8}>
        <polygon
          points={poly([
            wallPoint('right', 0, 0),
            wallPoint('right', 1, 0),
            wallPoint('right', 1, 1),
            wallPoint('right', 0, 1),
          ])}
          fill={shade(wall, -0.05)}
        />
      </Shaded>
      <Shaded kind="fadeDown" opacity={0.35}>
        <rect
          x={BULKHEAD.left}
          y={BULKHEAD.top}
          width={BULKHEAD.width}
          height={BULKHEAD.height}
          fill={PANEL.plate}
        />
      </Shaded>
    </g>
  )
}

// ----- Huecos al exterior -------------------------------------------------

/**
 * Lo de fuera se pinta una vez y se recorta a todos los huecos a la vez — las
 * seis lunas y las dos ventanillas — para que el campo de estrellas sea
 * continuo entre ellos y no seis campos sueltos.
 */
function Outside({ children }: { children?: React.ReactNode }) {
  const panes = glassPanes()
  return (
    <g>
      <defs>
        <clipPath id="cabin-openings">
          {panes.map((pane, i) => (
            <polygon key={i} points={poly(pane)} />
          ))}
          <polygon points={poly(sideWindowPoints('left'))} />
          <polygon points={poly(sideWindowPoints('right'))} />
        </clipPath>
      </defs>
      {panes.map((pane, i) => (
        <polygon key={i} points={poly(pane)} fill="#141b26" />
      ))}
      <polygon points={poly(sideWindowPoints('left'))} fill="#141b26" />
      <polygon points={poly(sideWindowPoints('right'))} fill="#141b26" />
      <g clipPath="url(#cabin-openings)">{children}</g>
      {useRealistic() && (
        <g fill={shadeFill('glass')}>
          {panes.map((pane, i) => (
            <polygon key={i} points={poly(pane)} />
          ))}
          <polygon points={poly(sideWindowPoints('left'))} />
          <polygon points={poly(sideWindowPoints('right'))} />
        </g>
      )}
    </g>
  )
}

/**
 * Montantes entre lunas y marcos de las ventanillas.
 * Con `flat` se pinta todo de un solo color: así la misma silueta sirve dentro
 * de la máscara de oscurecimiento, para que la estructura se apague aunque
 * esté por delante del cristal.
 */
function GlassFrames({ flat }: { flat?: string }) {
  return (
    <g>
      {/* Los montantes de los lados están más cerca, así que se ven más gruesos. */}
      {GLASS_RIBS.slice(1, -1).map((r, i) => {
        const centre = Math.abs(r.h - 0.5) < 0.01
        const width = (centre ? 22 : 13) / scaleAt(r.u)
        const a = ribTop(r)
        const b = ribBottom(r)
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={flat ?? shade(PANEL.plate, -0.42)}
            strokeWidth={width}
          />
        )
      })}
      <polygon points={poly(glassOutline())} fill="none" stroke={flat ?? INK.line} strokeWidth={STROKE.heavy * 2.2} />
      <polygon
        points={poly(glassOutline())}
        fill="none"
        stroke={flat ?? shade(PANEL.plate, -0.3)}
        strokeWidth={STROKE.heavy}
      />
      {(['left', 'right'] as const).map(side => (
        <g key={side}>
          <polygon
            points={poly(sideWindowPoints(side))}
            fill="none"
            stroke={flat ?? INK.line}
            strokeWidth={STROKE.heavy * 1.8}
          />
          <polygon
            points={poly(sideWindowPoints(side))}
            fill="none"
            stroke={flat ?? shade(PANEL.plate, -0.3)}
            strokeWidth={STROKE.regular}
          />
        </g>
      ))}
    </g>
  )
}

/**
 * Velo de oscuridad sobre la cabina. La máscara deja fuera los huecos al
 * exterior — por una ventana se sigue viendo lo de fuera aunque dentro no haya
 * luz — pero vuelve a meter la silueta de montantes y marcos, que son
 * estructura y tienen que apagarse con el resto.
 */
function Dim({ amount }: { amount: number }) {
  const panes = glassPanes()
  return (
    <g>
      <defs>
        <mask id="cabin-dim">
          <rect x={0} y={0} width={1920} height={1080} fill="#fff" />
          {panes.map((pane, i) => (
            <polygon key={i} points={poly(pane)} fill="#000" />
          ))}
          <polygon points={poly(sideWindowPoints('left'))} fill="#000" />
          <polygon points={poly(sideWindowPoints('right'))} fill="#000" />
          <GlassFrames flat="#fff" />
        </mask>
      </defs>
      <rect
        x={0}
        y={0}
        width={1920}
        height={1080}
        fill={SPACE.deep}
        fillOpacity={Math.min(1, Math.max(0, amount))}
        mask="url(#cabin-dim)"
      />
    </g>
  )
}

// ----- Paredes ------------------------------------------------------------

/** Lo que va pegado a las paredes, por debajo de las ventanillas. */
function Walls({
  skin,
  lit,
  beat,
  power,
}: {
  skin: ModeSkin
  lit: boolean
  beat: boolean
  power: number
}) {
  return (
    <g>
      {(['left', 'right'] as const).map((side, s) => {
        const strip = [
          wallPoint(side, 0.3, 0.52),
          wallPoint(side, 0.95, 0.52),
          wallPoint(side, 0.95, 0.565),
          wallPoint(side, 0.3, 0.6),
        ]
        const lampA = wallPoint(side, 0.45, 0.72)
        const lampB = wallPoint(side, 0.72, 0.72)
        return (
          <g key={side}>
            <LightStrip
              points={strip.map(p => [p.x, p.y] as [number, number])}
              color={skin.strip}
              on={lit && power > 0.15}
            />
            <Lamp
              cx={lampA.x}
              cy={lampA.y}
              r={17 * scaleAt(0.45)}
              color={skin.lamps[0] ?? PANEL.screw}
              on={lit && power > 0.45 && (s === 0 ? beat : !beat)}
            />
            <Lamp
              cx={lampB.x}
              cy={lampB.y}
              r={17 * scaleAt(0.72)}
              color={skin.lamps[1] ?? PANEL.screw}
              on={lit && power > 0.75 && (s === 0 ? !beat : beat)}
            />
          </g>
        )
      })}
    </g>
  )
}

// ----- Techo --------------------------------------------------------------

/** Panel superior: los mandos encogen con la profundidad, como el techo. */
function Overhead({
  skin,
  lit,
  time,
  power,
}: {
  skin: ModeSkin
  lit: boolean
  time: number
  power: number
}) {
  const rows: { u: number; count: number; kind: 'switch' | 'button' }[] = [
    { u: 0.24, count: 11, kind: 'switch' },
    { u: 0.56, count: 13, kind: 'button' },
    { u: 0.86, count: 13, kind: 'button' },
  ]

  return (
    <g>
      {/* Canto donde el techo se encuentra con el mamparo. */}
      <polygon
        points={poly([
          ceilingPoint(1, 0),
          ceilingPoint(1, 1),
          { x: BULKHEAD.right, y: BULKHEAD.top + 14 },
          { x: BULKHEAD.left, y: BULKHEAD.top + 14 },
        ])}
        fill={shade(PANEL.plate, -0.4)}
      />
      {rows.map((row, r) => {
        const k = scaleAt(row.u)
        return (
          <g key={r}>
            {Array.from({ length: row.count }, (_, i) => {
              const p = ceilingPoint(row.u, 0.22 + (i / (row.count - 1)) * 0.56)
              // Se encienden de dentro hacia fuera según sube la potencia del techo.
              const fromCentre = Math.abs(i - (row.count - 1) / 2)
              const on =
                lit &&
                litUpTo(fromCentre, (row.count + 1) / 2, power) &&
                Math.sin(time * (1.2 + r * 0.4) + i * 0.7 + r) > -0.25
              if (row.kind === 'switch') {
                return <ToggleSwitch key={i} cx={p.x} cy={p.y} height={54 * k} up={on} />
              }
              const size = 34 * k
              return (
                <SquareButton
                  key={i}
                  x={p.x - size / 2}
                  y={p.y - size / 2}
                  size={size}
                  color={skin.buttons[(i + r) % Math.max(skin.buttons.length, 1)] ?? PANEL.screw}
                  on={on}
                />
              )
            })}
          </g>
        )
      })}
    </g>
  )
}

// ----- Salpicadero --------------------------------------------------------

function MainPanel({
  skin,
  lit,
  beat,
  time,
  power,
}: {
  skin: ModeSkin
  lit: boolean
  beat: boolean
  time: number
  power: CabinPower
}) {
  const pb = LAYOUT.panelBottom
  const l = BULKHEAD.left
  const r = BULKHEAD.right

  // La visera sigue la misma curva que el cristal y se prolonga hasta los
  // cantos del mamparo; si acabara donde el cristal, quedaría flotando.
  const firstRib = GLASS_RIBS[0]
  const lastRib = GLASS_RIBS[GLASS_RIBS.length - 1]
  const glare = [
    { x: l, y: ribBottom(firstRib).y },
    ...GLASS_RIBS.map(ribBottom),
    { x: r, y: ribBottom(lastRib).y },
    { x: r, y: ribGlare(lastRib).y },
    ...[...GLASS_RIBS].reverse().map(ribGlare),
    { x: l, y: ribGlare(firstRib).y },
  ]
  const band = PANEL_TOP + 16

  return (
    <g>
      {/* La chapa arranca bajo el punto más hondo de la visera; lo que queda
          entre medias es el propio mamparo, del mismo gris. */}
      <rect x={l} y={PANEL_TOP - 2} width={r - l} height={pb - PANEL_TOP + 2} fill={PANEL.plate} />
      <rect x={l} y={pb - 9} width={r - l} height={9} fill={PANEL.plateEdge} />
      <polygon points={poly(glare)} fill={PANEL.bezel} />

      {/* Banda alta: se ve entera por encima de los respaldos. */}
      <PanelPlate x={l + 36} y={band} width={300} height={72} light>
        <ScreenBox x={l + 54} y={band + 14} width={264} height={44} grid={18}>
          <Traza
            time={time}
            x={l + 54}
            y={band + 14}
            width={264}
            height={44}
            on={lit && power.sides > 0.3}
            gain={power.sides}
          />
        </ScreenBox>
      </PanelPlate>

      <PanelPlate x={714} y={band} width={492} height={72}>
        <rect x={740} y={band + 9} width={440} height={24} rx={6} fill={PANEL.bezel} />
        <ButtonGrid
          x={748}
          y={band + 41}
          columns={10}
          rows={1}
          size={24}
          gap={20}
          colors={skin.buttons.length ? skin.buttons : [PANEL.screw]}
          lit={i => lit && litUpTo(i, 10, power.centre) && (i % 2 === 0 ? beat : !beat)}
        />
      </PanelPlate>

      <PanelPlate x={r - 336} y={band} width={300} height={72} light>
        <Gauge cx={r - 266} cy={band + 36} r={28} value={lit ? (0.4 + Math.sin(time * 0.7) * 0.14) * power.sides : 0} />
        <Gauge
          cx={r - 186}
          cy={band + 36}
          r={28}
          value={lit ? (0.62 + Math.sin(time * 1.1 + 2) * 0.1) * power.sides : 0}
          color={ACCENT.blue}
        />
        <Gauge
          cx={r - 106}
          cy={band + 36}
          r={28}
          value={lit ? (0.5 + Math.sin(time * 0.45 + 1) * 0.2) * power.sides : 0}
          color={ACCENT.teal}
        />
      </PanelPlate>

      {/* Bloque central: lo único del salpicadero que se ve entre los asientos. */}
      <PanelPlate x={778} y={band + 86} width={364} height={78}>
        <ButtonGrid
          x={800}
          y={band + 100}
          columns={7}
          rows={1}
          size={30}
          gap={16}
          colors={skin.buttons.length ? skin.buttons : [PANEL.screw]}
          lit={i => lit && litUpTo(i, 7, power.centre) && Math.sin(time * 1.7 + i * 0.9) > -0.2}
        />
        <g>
          {[0, 1, 2, 3, 4].map(i => (
            <Lamp
              key={i}
              cx={812 + i * 78}
              cy={band + 148}
              r={12}
              color={skin.lamps[i % Math.max(skin.lamps.length, 1)] ?? PANEL.screw}
              on={lit && litUpTo(i, 5, power.centre) && Math.sin(time * 2 + i) > 0}
            />
          ))}
        </g>
      </PanelPlate>
    </g>
  )
}

// ----- Consola central ----------------------------------------------------

/**
 * Pedestal entre los asientos. Sus bordes convergen al punto de fuga, así que
 * se ensancha hacia el espectador igual que el suelo sobre el que apoya.
 */
function Pedestal({
  skin,
  lit,
  time,
  power,
}: {
  skin: ModeSkin
  lit: boolean
  time: number
  power: number
}) {
  const top = LAYOUT.panelBottom
  const { left: nl, right: nr } = LAYOUT.pedestalNear
  // A la altura del mamparo los bordes ya han convergido este tanto.
  const t = 1 - depthAtY(top)
  const fl = nl + (960 - nl) * t
  const fr = nr + (960 - nr) * t
  const face = shade(PANEL.plate, -0.04)

  // Las palancas suben con la potencia: el empuje entra con la corriente.
  const throttle = lit ? (0.45 + Math.sin(time * 0.5) * 0.3) * power : 0
  const throttle2 = lit ? (0.45 + Math.sin(time * 0.5 + 0.35) * 0.3) * power : 0

  return (
    <g>
      <Shaded kind="fadeDown" opacity={0.6}>
        <polygon points={`${fl},${top} ${fr},${top} ${nr},1080 ${nl},1080`} fill={face} />
      </Shaded>
      <polygon
        points={`${fl},${top} ${fr},${top} ${fr + 3},${top + 14} ${fl - 3},${top + 14}`}
        fill={PANEL.plateEdge}
      />

      {/* Fila alta: mandos menores. Las palancas viven debajo, sin solaparse. */}
      <ButtonGrid
        x={806}
        y={752}
        columns={3}
        rows={2}
        size={30}
        gap={10}
        colors={skin.buttons.length ? skin.buttons : [PANEL.screw]}
        lit={i => lit && litUpTo(i, 6, power) && Math.sin(time * 1.3 + i * 1.1) > 0}
      />
      <g>
        {[0, 1, 2].map(i => (
          <ToggleSwitch
            key={i}
            cx={1026 + i * 50}
            cy={774}
            height={42}
            up={lit && litUpTo(i, 3, power) && Math.sin(time * 0.8 + i * 1.4) > 0}
          />
        ))}
      </g>

      {/* Palancas de gases: el mando grande, en el centro y en primer término. */}
      <Lever cx={890} baseY={1024} travel={96} position={throttle} color={ACCENT.red} />
      <Lever cx={962} baseY={1024} travel={96} position={throttle2} color={ACCENT.red} />
      <Lever cx={1052} baseY={1024} travel={72} position={lit ? 0.7 * power : 0} color={ACCENT.blue} />
    </g>
  )
}

// ----- Asientos -----------------------------------------------------------

/**
 * Caja de una pieza del asiento en perspectiva: `x`/`y` en el plano cercano y
 * `t0`–`t1` su profundidad, como fracción del camino hacia el punto de fuga.
 */
interface SeatBox {
  x0: number
  x1: number
  y0: number
  y1: number
  t0: number
  t1: number
}

/**
 * Caras visibles de una caja del asiento izquierdo: la trasera (la que da al
 * espectador), el techo (queda por debajo del horizonte, así que se ve desde
 * arriba) y el costado interior, el que mira al pedestal. El derecho es su
 * reflejo sobre el punto de fuga, así que sirve igual.
 */
function seatFaces({ x0, x1, y0, y1, t0, t1 }: SeatBox) {
  const R = (x: number, y: number, t: number) => towardVP({ x, y }, t)
  return {
    back: poly([R(x0, y0, t0), R(x1, y0, t0), R(x1, y1, t0), R(x0, y1, t0)]),
    top: poly([R(x0, y0, t0), R(x1, y0, t0), R(x1, y0, t1), R(x0, y0, t1)]),
    side: poly([R(x1, y0, t0), R(x1, y0, t1), R(x1, y1, t1), R(x1, y1, t0)]),
  }
}

/**
 * Asiento vacío visto por detrás, flanqueando el pedestal. Van centrados y
 * recortados por abajo: es lo que coloca al espectador dentro de la cabina.
 *
 * Es un volumen, no un recorte: respaldo y reposacabezas tienen canto, el
 * asiento avanza hacia el panel y el reposabrazos corre en profundidad, todo
 * hacia el mismo punto de fuga que el resto de la cabina.
 */
function Seat({ side }: { side: 'left' | 'right' }) {
  const mirror = side === 'right'
  const shell = shade(PANEL.bezel, 0.1)
  const shellDark = PANEL.bezel
  const shellSide = shade(PANEL.bezel, -0.3)
  const shellTop = shade(PANEL.bezel, 0.22)
  const cushion = '#3d4753'
  const cushionTop = shade(cushion, 0.14)
  const top = LAYOUT.seatTop

  // Todo el asiento se aparta un poco del pedestal: en profundidad avanza
  // hacia el centro, y sin este margen el reposabrazos le taparía los mandos.
  const dx = -28
  const box = (b: SeatBox) => seatFaces({ ...b, x0: b.x0 + dx, x1: b.x1 + dx })
  const backrest = box({ x0: 396, x1: 754, y0: top + 82, y1: 1120, t0: 0, t1: 0.05 })
  const headrest = box({ x0: 484, x1: 670, y0: top, y1: top + 124, t0: 0.008, t1: 0.04 })
  // El asiento queda detrás del respaldo; asoma por el lado del pedestal.
  const pan = box({ x0: 430, x1: 780, y0: 930, y1: 1120, t0: 0.05, t1: 0.17 })
  const arm = box({ x0: 758, x1: 800, y0: 850, y1: 882, t0: 0.05, t1: 0.16 })
  const post = box({ x0: 768, x1: 790, y0: 882, y1: 930, t0: 0.13, t1: 0.15 })

  // Se dibuja el izquierdo y el derecho se refleja: así son simétricos seguro.
  const body = (
    <g>
      {/* De lo más lejano a lo más cercano. */}
      <polygon points={pan.side} fill={shellSide} />
      <polygon points={pan.top} fill={cushionTop} />

      <polygon points={backrest.side} fill={shellSide} />
      <polygon points={backrest.top} fill={shellTop} />
      <polygon points={headrest.side} fill={shellSide} />
      <polygon points={headrest.top} fill={shellTop} />

      {/* Carcasa de una pieza: reposacabezas y respaldo se solapan. */}
      <g transform={`translate(${dx} 0)`}>
        <Shaded kind="sheen">
          <rect x={396} y={top + 82} width={358} height={370} rx={14} fill={shellDark} />
        </Shaded>
        <Shaded kind="sheen">
          <rect x={484} y={top} width={186} height={124} rx={14} fill={shellDark} />
        </Shaded>

        {/* Acolchado. */}
        <Shaded kind="sphere" opacity={0.7}>
          <rect x={500} y={top + 15} width={154} height={96} rx={12} fill={cushion} />
        </Shaded>
        <Shaded kind="cylX" opacity={0.7}>
          <rect x={418} y={top + 108} width={314} height={344} rx={12} fill={shell} />
        </Shaded>
        <Shaded kind="cylX">
          <rect x={442} y={top + 130} width={266} height={322} rx={10} fill={cushion} />
        </Shaded>
        {[0, 1, 2, 3].map(i => (
          <rect
            key={i}
            x={442}
            y={top + 162 + i * 64}
            width={266}
            height={7}
            rx={3.5}
            fill={shellDark}
            fillOpacity={0.5}
          />
        ))}
      </g>

      {/* Reposabrazos: sale del costado del respaldo hacia el panel, con su
          soporte bajando al asiento. */}
      <polygon points={post.side} fill={shellSide} />
      <polygon points={post.back} fill={shellDark} />
      <polygon points={arm.side} fill={shellSide} />
      <polygon points={arm.top} fill={shellTop} />
      <polygon points={arm.back} fill={shell} />
    </g>
  )

  return <g transform={mirror ? 'translate(1920,0) scale(-1,1)' : undefined}>{body}</g>
}

// ----- Piezas auxiliares --------------------------------------------------

/** Onda del osciloscopio, calcada del primer instrumento de la referencia. */
function Traza({
  time,
  x,
  y,
  width,
  height,
  on,
  gain,
}: {
  time: number
  x: number
  y: number
  width: number
  height: number
  on: boolean
  gain?: number
}) {
  if (!on) return null
  const mid = y + height / 2
  const amp = Math.min(1, Math.max(0, gain ?? 1))
  const points = (freq: number, amp: number, offset: number) =>
    Array.from({ length: 41 }, (_, i) => {
      const px = x + (i / 40) * width
      const py = mid + Math.sin((i / 40) * Math.PI * freq + time * 1.6 + offset) * amp
      return `${px.toFixed(1)},${py.toFixed(1)}`
    }).join(' ')

  return (
    <g fill="none" strokeWidth={STROKE.regular} strokeLinecap="round" strokeLinejoin="round">
      <polyline points={points(4, height * 0.3 * amp, 0)} stroke={ACCENT.teal} />
      <polyline points={points(6, height * 0.2 * amp, 1.2)} stroke={ACCENT.amber} />
    </g>
  )
}

/** Tipografía por defecto para el texto suelto de una escena. */
export const SCENE_FONT = FONT

/** Radio de esquina estándar, por si una escena dibuja chapa propia. */
export const SCENE_RADIUS = RADIUS
