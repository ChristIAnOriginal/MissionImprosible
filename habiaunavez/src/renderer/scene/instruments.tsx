/**
 * Kit de instrumentos de cabina, calcado de `assets/referencia-linea-grafica.jpeg`.
 *
 * Todo se dibuja en el lienzo de diseño (1920×1080) y en SVG plano: relleno
 * liso, contorno oscuro, esquinas redondeadas y tornillos en las placas. Si una
 * animación necesita una pieza nueva de cabina, se añade aquí para que todas
 * compartan el mismo vocabulario.
 *
 * En estilo realista (`realism.tsx`) cada pieza lleva además su volumen —
 * chapa curvada, pomos y pilotos esféricos, cristal con reflejo — y las luces
 * encendidas irradian su color.
 */
import React from 'react'
import { ACCENT, FONT, INK, PANEL, RADIUS, STROKE, shade } from '../../shared/palette'
import { ColorGlow, Shaded, shadeFill, useRealistic } from './realism'

/** Tornillo de esquina: el detalle que identifica una placa del kit. */
export function Screw({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <Shaded kind="sphere">
        <circle cx={cx} cy={cy} r={5.5} fill={PANEL.screw} />
      </Shaded>
      <circle cx={cx} cy={cy} r={2} fill={shade(PANEL.screw, -0.35)} />
    </g>
  )
}

/** Placa de instrumentos: chapa gris con canto inferior y cuatro tornillos. */
export function PanelPlate({
  x,
  y,
  width,
  height,
  light = false,
  children,
}: {
  x: number
  y: number
  width: number
  height: number
  light?: boolean
  children?: React.ReactNode
}) {
  const inset = 13
  return (
    <g>
      {/* El canto es el mismo gris un paso más oscuro: así se sugiere el grosor. */}
      <rect
        x={x}
        y={y + 5}
        width={width}
        height={height}
        rx={RADIUS.plate}
        fill={PANEL.plateEdge}
      />
      <Shaded kind="cylY" opacity={0.5}>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={RADIUS.plate}
          fill={light ? PANEL.plateLight : PANEL.plate}
        />
      </Shaded>
      <Screw cx={x + inset} cy={y + inset} />
      <Screw cx={x + width - inset} cy={y + inset} />
      <Screw cx={x + inset} cy={y + height - inset} />
      <Screw cx={x + width - inset} cy={y + height - inset} />
      {children}
    </g>
  )
}

/** Pantalla negra con retícula, como el osciloscopio y el radar del kit. */
export function ScreenBox({
  x,
  y,
  width,
  height,
  grid = 40,
  children,
}: {
  x: number
  y: number
  width: number
  height: number
  grid?: number
  children?: React.ReactNode
}) {
  const id = `grid-${x}-${y}-${grid}`
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={RADIUS.instrument} fill={PANEL.screen} />
      <defs>
        <pattern id={id} width={grid} height={grid} patternUnits="userSpaceOnUse">
          <path
            d={`M ${grid} 0 L 0 0 0 ${grid}`}
            fill="none"
            stroke={PANEL.grid}
            strokeOpacity={0.35}
            strokeWidth={STROKE.hair}
          />
        </pattern>
        <clipPath id={`${id}-clip`}>
          <rect x={x} y={y} width={width} height={height} rx={RADIUS.instrument} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect x={x} y={y} width={width} height={height} fill={`url(#${id})`} />
        {children}
        {useRealistic() && <rect x={x} y={y} width={width} height={height} fill={shadeFill('glass')} />}
      </g>
    </g>
  )
}

/** Piloto luminoso. Apagado se pinta gris, nunca se oculta. */
export function Lamp({
  cx,
  cy,
  r = 15,
  color,
  on = true,
}: {
  cx: number
  cy: number
  r?: number
  color: string
  on?: boolean
}) {
  const fill = on ? color : PANEL.screw
  return (
    <g>
      {on && <ColorGlow cx={cx} cy={cy} r={r * 3.4} color={color} />}
      <Shaded kind="sphere">
        <circle cx={cx} cy={cy} r={r} fill={fill} />
      </Shaded>
      {/* Brillo plano: un óvalo claro arriba a la izquierda, sin degradado. */}
      <ellipse cx={cx - r * 0.28} cy={cy - r * 0.3} rx={r * 0.34} ry={r * 0.24} fill={shade(fill, 0.45)} />
    </g>
  )
}

/** Indicador de aguja con aro negro y cara blanca. */
export function Gauge({
  cx,
  cy,
  r,
  /** 0 a 1. */
  value,
  color = ACCENT.red,
}: {
  cx: number
  cy: number
  r: number
  value: number
  color?: string
}) {
  const angle = (-120 + Math.min(1, Math.max(0, value)) * 240) * (Math.PI / 180)
  const tip = { x: cx + Math.sin(angle) * r * 0.66, y: cy - Math.cos(angle) * r * 0.66 }
  const arc = (from: number, to: number, stroke: string) => {
    const a0 = (-120 + from * 240) * (Math.PI / 180)
    const a1 = (-120 + to * 240) * (Math.PI / 180)
    const rr = r * 0.8
    const p0 = { x: cx + Math.sin(a0) * rr, y: cy - Math.cos(a0) * rr }
    const p1 = { x: cx + Math.sin(a1) * rr, y: cy - Math.cos(a1) * rr }
    return (
      <path
        d={`M ${p0.x} ${p0.y} A ${rr} ${rr} 0 0 1 ${p1.x} ${p1.y}`}
        fill="none"
        stroke={stroke}
        strokeWidth={STROKE.regular}
        strokeLinecap="round"
      />
    )
  }
  return (
    <g>
      <Shaded kind="sphere">
        <circle cx={cx} cy={cy} r={r} fill={PANEL.bezel} />
      </Shaded>
      <Shaded kind="fadeDown" opacity={0.25}>
        <circle cx={cx} cy={cy} r={r * 0.86} fill={ACCENT.white} />
      </Shaded>
      {arc(0, 0.55, ACCENT.teal)}
      {arc(0.6, 0.8, ACCENT.amber)}
      {arc(0.85, 1, ACCENT.red)}
      <line
        x1={cx}
        y1={cy}
        x2={tip.x}
        y2={tip.y}
        stroke={color}
        strokeWidth={STROKE.regular}
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r={r * 0.12} fill={INK.line} />
      {useRealistic() && <circle cx={cx} cy={cy} r={r * 0.86} fill={shadeFill('glass')} />}
    </g>
  )
}

/** Rótulo de placa: mayúsculas, centrado, como en la referencia. */
export function PlateLabel({
  x,
  y,
  text,
  size = 22,
  color = INK.label,
}: {
  x: number
  y: number
  text: string
  size?: number
  color?: string
}) {
  return (
    <text
      x={x}
      y={y}
      fill={color}
      fontFamily={FONT}
      fontSize={size}
      fontWeight={700}
      letterSpacing={size * 0.12}
      textAnchor="middle"
      style={{ textTransform: 'uppercase' }}
    >
      {text.toUpperCase()}
    </text>
  )
}

/** Rótulo sobre fondo negro, como la banda "SISTEMA PRINCIPAL" del kit. */
export function LabelBar({
  x,
  y,
  width,
  height = 34,
  text,
}: {
  x: number
  y: number
  width: number
  height?: number
  text: string
}) {
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={6} fill={PANEL.bezel} />
      <PlateLabel
        x={x + width / 2}
        y={y + height * 0.7}
        text={text}
        size={height * 0.5}
        color={INK.textOnDark}
      />
    </g>
  )
}

/** Pulsador cuadrado con canto: la fila de botones del kit de referencia. */
export function SquareButton({
  x,
  y,
  size = 44,
  color,
  on = true,
  glyph,
}: {
  x: number
  y: number
  size?: number
  color: string
  on?: boolean
  glyph?: string
}) {
  const fill = on ? color : shade(PANEL.screw, -0.1)
  return (
    <g>
      {on && <ColorGlow cx={x + size / 2} cy={y + size / 2} r={size * 1.25} color={color} opacity={0.7} />}
      <rect x={x} y={y + 4} width={size} height={size} rx={RADIUS.button} fill={shade(fill, -0.35)} />
      <Shaded kind="cylY">
        <rect x={x} y={y} width={size} height={size} rx={RADIUS.button} fill={fill} />
      </Shaded>
      {glyph && (
        <text
          x={x + size / 2}
          y={y + size * 0.68}
          fill={INK.textOnDark}
          fontFamily={FONT}
          fontSize={size * 0.5}
          fontWeight={700}
          textAnchor="middle"
        >
          {glyph}
        </text>
      )}
    </g>
  )
}

/**
 * Rejilla de pulsadores. `lit` decide cuáles están encendidos; se pasa una
 * función para que cada escena decida su propio patrón a partir del reloj.
 */
export function ButtonGrid({
  x,
  y,
  columns,
  rows,
  size = 40,
  gap = 12,
  colors,
  lit,
}: {
  x: number
  y: number
  columns: number
  rows: number
  size?: number
  gap?: number
  colors: string[]
  lit?: (index: number) => boolean
}) {
  const cells = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const i = r * columns + c
      cells.push(
        <SquareButton
          key={i}
          x={x + c * (size + gap)}
          y={y + r * (size + gap)}
          size={size}
          color={colors[i % colors.length]}
          on={lit ? lit(i) : true}
        />
      )
    }
  }
  return <g>{cells}</g>
}

/** Interruptor de palanca corta, como los A–F de la referencia. */
export function ToggleSwitch({
  cx,
  cy,
  height = 60,
  up,
  label,
}: {
  cx: number
  cy: number
  height?: number
  up: boolean
  label?: string
}) {
  const w = height * 0.36
  return (
    <g>
      <Shaded kind="cylX">
        <rect x={cx - w / 2} y={cy - height / 2} width={w} height={height} rx={w / 2} fill={PANEL.bezel} />
      </Shaded>
      <Shaded kind="sphere">
        <circle
          cx={cx}
          cy={up ? cy - height * 0.26 : cy + height * 0.26}
          r={w * 0.46}
          fill={ACCENT.white}
        />
      </Shaded>
      {label && <PlateLabel x={cx} y={cy + height * 0.75 + 14} text={label} size={16} />}
    </g>
  )
}

/**
 * Palanca de mando. `position` va de 0 (atrás) a 1 (adelante) y desplaza el
 * puño por su recorrido.
 */
export function Lever({
  cx,
  baseY,
  travel = 120,
  position,
  color,
}: {
  cx: number
  baseY: number
  travel?: number
  position: number
  color: string
}) {
  const knobY = baseY - travel * Math.min(1, Math.max(0, position)) - 26
  return (
    <g>
      {/* Guía del recorrido. */}
      <Shaded kind="cylX">
        <rect x={cx - 9} y={baseY - travel - 26} width={18} height={travel + 30} rx={9} fill={PANEL.bezel} />
      </Shaded>
      <line
        x1={cx}
        y1={baseY}
        x2={cx}
        y2={knobY}
        stroke={shade(PANEL.screw, -0.2)}
        strokeWidth={STROKE.heavy}
        strokeLinecap="round"
      />
      <rect x={cx - 26} y={knobY - 22} width={52} height={44} rx={16} fill={shade(color, -0.3)} />
      <Shaded kind="sphere">
        <rect x={cx - 26} y={knobY - 26} width={52} height={44} rx={16} fill={color} />
      </Shaded>
      <ellipse cx={cx - 7} cy={knobY - 14} rx={11} ry={6} fill={shade(color, 0.4)} />
    </g>
  )
}

/**
 * Tira de luz de mamparo. Se le pasan los cuatro vértices para que siga la
 * perspectiva de la pared en la que va.
 */
export function LightStrip({
  points,
  color,
  on = true,
}: {
  points: [number, number][]
  color: string
  on?: boolean
}) {
  const d = points.map(([px, py]) => `${px},${py}`).join(' ')
  const real = useRealistic()
  return (
    <g>
      {/* Realista: la luz se derrama por la pared en anillos cada vez más tenues. */}
      {real &&
        on &&
        [34, 20, 10].map(w => (
          <polygon key={w} points={d} fill="none" stroke={color} strokeWidth={w} strokeLinejoin="round" opacity={0.1} />
        ))}
      <polygon points={d} fill={on ? color : shade(PANEL.screw, -0.15)} />
      {real && on && <polygon points={d} fill={shadeFill('cylY')} opacity={0.6} />}
    </g>
  )
}
