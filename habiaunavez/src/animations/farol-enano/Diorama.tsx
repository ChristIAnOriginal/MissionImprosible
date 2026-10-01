/**
 * "Farol del planeta enano" en estilo diorama: el planeta visto entero.
 *
 * La cámara se aleja: el planeta diminuto flota en el espacio con el farol y el
 * banco en lo alto, y el sol y la luna giran a su alrededor en una órbita que
 * se ve completa. La mitad del planeta que no mira al sol queda en sombra, así
 * que el día y la noche se ven pasar por encima del farol.
 *
 * Profundidad: nebulosas y estrellas al fondo, planetas lejanos, la órbita
 * (su mitad trasera por detrás del planeta, la delantera por delante) y
 * asteroides en primer plano con el canto iluminado del lado del sol.
 *
 * Usa la misma ficha que el plano: modo automático o manual, duración del
 * ciclo o del cambio, zona iluminada, bichitos y banco. En manual, el astro
 * nuevo queda siempre arriba, en el centro, sobre el farol.
 */
import React from 'react'
import { ACCENT, PANEL, SPACE, STAGE, mix, shade } from '../../shared/palette'
import type { SceneProps } from '../../renderer/scene/contract'
import { hash } from '../../renderer/scene/room'
import { ramp, smooth } from '../../renderer/scene/motion'
import { Halo, Layer, LightPool, Rays, starPath } from '../../renderer/scene/diorama'

const CX = STAGE.width / 2
const PLANET = { x: CX, y: 690, r: 250 }
/** Órbita del sol y la luna: al mediodía el astro queda arriba, sobre el farol. */
const ORBIT = { rx: 700, ry: 560 }
const GROUND = shade(ACCENT.orange, 0.35)
const IRON = PANEL.bezel

function onOrbit(angle: number) {
  return { x: PLANET.x + Math.sin(angle) * ORBIT.rx, y: PLANET.y - Math.cos(angle) * ORBIT.ry }
}

// ----- Fondo ---------------------------------------------------------------------------

/* Estática: no depende del reloj, se memoriza para no repintarla cada fotograma. */
const Deep = React.memo(function Deep({ day }: { day: number }) {
  const sky = mix(shade(SPACE.nebula, -0.1), SPACE.deep, 1 - day * 0.4)
  return (
    <g>
      <rect x={-60} y={-60} width={STAGE.width + 120} height={STAGE.height + 120} fill={sky} />
      {/* Bandas de nebulosa, planas y superpuestas. */}
      {[
        [220, 0.1, -12],
        [520, 0.16, 8],
        [860, 0.1, -6],
      ].map(([y, a, tilt]) => (
        <ellipse key={y} cx={CX} cy={y} rx={1300} ry={120} fill={shade(ACCENT.blue, 0.2)} opacity={a} transform={`rotate(${tilt} ${CX} ${y})`} />
      ))}
      <ellipse cx={1500} cy={300} rx={360} ry={90} fill={shade(ACCENT.red, 0.2)} opacity={0.08} transform="rotate(-20 1500 300)" />
    </g>
  )
})

function Stars({ time }: { time: number }) {
  return (
    <g>
      {Array.from({ length: 110 }, (_, i) => {
        const x = hash(i) * STAGE.width
        const y = hash(i + 0.5) * STAGE.height
        const big = hash(i + 0.7) > 0.86
        const tw = 0.55 + 0.45 * Math.sin(time * (1 + hash(i + 0.3) * 2) + i)
        return big ? (
          <path key={i} d={starPath(x, y, 7, 0.4)} fill={SPACE.star} opacity={tw} />
        ) : (
          <circle key={i} cx={x} cy={y} r={2} fill={SPACE.starDim} opacity={tw} />
        )
      })}
    </g>
  )
}

function FarWorlds({ time }: { time: number }) {
  const bob = Math.sin(time * 0.3) * 6
  return (
    <g>
      <circle cx={260} cy={260 + bob} r={60} fill={shade(ACCENT.teal, -0.2)} />
      <circle cx={242} cy={244 + bob} r={40} fill={shade(ACCENT.teal, 0.1)} opacity={0.5} />
      <ellipse cx={260} cy={260 + bob} rx={110} ry={20} fill="none" stroke={shade(ACCENT.amber, 0.3)} strokeWidth={8} transform={`rotate(-14 260 ${260 + bob})`} />
      <circle cx={1700} cy={880 - bob} r={34} fill={shade(ACCENT.red, -0.25)} />
      <circle cx={1500} cy={140} r={16} fill={shade(ACCENT.blue, 0.3)} />
    </g>
  )
}

// ----- Órbita y astros ------------------------------------------------------------------

/** Media órbita punteada: la trasera va por detrás del planeta, la delantera por delante. */
function OrbitHalf({ front, color }: { front: boolean; color: string }) {
  const { rx, ry } = ORBIT
  const d = front
    ? `M ${PLANET.x - rx} ${PLANET.y} A ${rx} ${ry} 0 0 0 ${PLANET.x + rx} ${PLANET.y}`
    : `M ${PLANET.x - rx} ${PLANET.y} A ${rx} ${ry} 0 0 1 ${PLANET.x + rx} ${PLANET.y}`
  return <path d={d} fill="none" stroke={color} strokeWidth={4} strokeDasharray="4 18" strokeLinecap="round" opacity={0.5} />
}

function Sun({ x, y, time }: { x: number; y: number; time: number }) {
  const spin = time * 0.25
  return (
    <g>
      <Halo cx={x} cy={y} r={300} color={ACCENT.amber} alpha={1.3} />
      <g fill={ACCENT.amber}>
        {Array.from({ length: 12 }, (_, i) => {
          const a = spin + (i / 12) * Math.PI * 2
          const p = (d: number, o: number) => `${x + Math.cos(a + o) * d},${y + Math.sin(a + o) * d}`
          return <polygon key={i} points={`${p(78, -0.13)} ${p(112, 0)} ${p(78, 0.13)}`} />
        })}
      </g>
      <circle cx={x} cy={y} r={70} fill={ACCENT.amber} />
      <circle cx={x - 8} cy={y - 8} r={48} fill={shade(ACCENT.amber, 0.45)} />
    </g>
  )
}

function MoonBody({ x, y }: { x: number; y: number }) {
  const light = shade(ACCENT.blue, 0.85)
  return (
    <g>
      <Halo cx={x} cy={y} r={200} color={shade(ACCENT.blue, 0.7)} alpha={1} />
      <circle cx={x} cy={y} r={56} fill={light} />
      <circle cx={x + 22} cy={y - 6} r={52} fill={SPACE.deep} opacity={0.55} />
      <circle cx={x - 18} cy={y - 14} r={9} fill={shade(light, -0.12)} />
      <circle cx={x - 26} cy={y + 18} r={6} fill={shade(light, -0.12)} />
    </g>
  )
}

// ----- Planeta, farol y banco ----------------------------------------------------------

function Planet({ angle, dark, lamp, lightSize, bench, moths, time }: { angle: number; dark: number; lamp: number; lightSize: number; bench: boolean; moths: boolean; time: number }) {
  const { x, y, r } = PLANET
  const deg = (angle * 180) / Math.PI
  const top = y - r
  const glass = mix(shade(PANEL.bezel, 0.3), shade(ACCENT.amber, 0.35), lamp)
  return (
    <g>
      {/* Atmósfera: anillos translúcidos del color del cielo. */}
      <Halo cx={x} cy={y} r={r * 1.35} color={shade(ACCENT.blue, 0.6)} alpha={0.9} />
      {/* Sombra dura del planeta sobre el vacío, lejos del sol. */}
      <circle cx={x - Math.sin(angle) * 22} cy={y + Math.cos(angle) * 22} r={r} fill={SPACE.deep} opacity={0.4} />
      <circle cx={x} cy={y} r={r} fill={GROUND} />
      <clipPath id="dio-planet">
        <circle cx={x} cy={y} r={r} />
      </clipPath>
      <g clipPath="url(#dio-planet)">
        {[
          [-0.4, 0.2, 0.22],
          [0.35, 0.45, 0.16],
          [0.1, -0.2, 0.12],
          [-0.2, 0.62, 0.1],
        ].map(([dx, dy, s], i) => (
          <g key={i}>
            <circle cx={x + dx * r} cy={y + dy * r} r={s * r} fill={shade(GROUND, 0.25)} />
            <circle cx={x + dx * r + s * r * 0.12} cy={y + dy * r + s * r * 0.12} r={s * r * 0.8} fill={shade(GROUND, -0.15)} />
          </g>
        ))}
        <ellipse cx={x + 60} cy={y + 90} rx={170} ry={40} fill={shade(ACCENT.red, -0.35)} opacity={0.4} transform={`rotate(-20 ${x + 60} ${y + 90})`} />
        {/* Noche: la mitad que no mira al sol, girando con él. */}
        <rect x={x - r * 1.2} y={y} width={r * 2.4} height={r * 1.4} fill={SPACE.deep} opacity={0.55} transform={`rotate(${deg} ${x} ${y})`} />
        {/* Borde encendido del lado del sol. */}
        <circle cx={x} cy={y} r={r - 7} fill="none" stroke={shade(ACCENT.amber, 0.6)} strokeWidth={14} opacity={0.5 * (1 - dark * 0.6)} strokeDasharray={`${Math.PI * r * 0.9} ${Math.PI * r * 2}`} transform={`rotate(${deg - 90 - 81} ${x} ${y})`} />
      </g>

      {/* Luz del farol sobre la curva del planeta. */}
      <LightPool cx={x} cy={top + 10} rx={200 * lightSize} ry={36 * lightSize} color={ACCENT.amber} alpha={lamp * 1.4} />
      <polygon points={`${x - 16},${top - 112} ${x + 16},${top - 112} ${x + 150 * lightSize},${top + 14} ${x - 150 * lightSize},${top + 14}`} fill={ACCENT.amber} opacity={lamp * 0.14} />

      {/* Banco a la izquierda del farol. */}
      {bench && (
        <g>
          {[x - 132, x - 66].map(bx => (
            <rect key={bx} x={bx} y={top - 36} width={6} height={40} rx={3} fill={IRON} />
          ))}
          {[top - 40, top - 28, top - 16].map((by, i) => (
            <rect key={by} x={x - 140} y={by} width={86} height={9} rx={4} fill={i === 2 ? shade(ACCENT.orange, -0.35) : shade(ACCENT.orange, -0.45)} />
          ))}
        </g>
      )}

      {/* Farol. */}
      <rect x={x - 16} y={top - 12} width={32} height={16} rx={6} fill={IRON} />
      <rect x={x - 5} y={top - 120} width={10} height={112} rx={4} fill={IRON} />
      <rect x={x - 5} y={top - 120} width={4} height={112} rx={2} fill={shade(IRON, 0.3)} />
      <polygon points={`${x - 13},${top - 118} ${x + 13},${top - 118} ${x + 19},${top - 156} ${x - 19},${top - 156}`} fill={glass} />
      <polygon points={`${x - 28},${top - 154} ${x + 28},${top - 154} ${x + 14},${top - 168} ${x - 14},${top - 168}`} fill={IRON} />
      <circle cx={x} cy={top - 172} r={5} fill={ACCENT.amber} />
      <Halo cx={x} cy={top - 138} r={120} color={ACCENT.amber} alpha={lamp} />

      {/* Bichitos alrededor de la luz. */}
      {moths && lamp > 0 && (
        <g fill={shade(ACCENT.amber, 0.6)} opacity={lamp}>
          {[0, 1, 2, 3].map(k => {
            const a = time * (1.6 + k * 0.4) + k * 1.5
            return <circle key={k} cx={x + Math.cos(a) * (26 + k * 8)} cy={top - 138 + Math.sin(a * 1.3) * (16 + k * 5)} r={2.6} />
          })}
        </g>
      )}
    </g>
  )
}

/** Asteroides del primer plano, con el canto iluminado del lado del sol. */
function Asteroids({ time, sun }: { time: number; sun: { x: number; y: number } }) {
  const rocks: [number, number, number, number][] = [
    [140, 930, 110, 0],
    [1790, 170, 80, 1],
    [1760, 990, 140, 2],
  ]
  return (
    <g>
      {rocks.map(([x, y, s, seed]) => {
        const rot = time * (4 + seed * 2) + seed * 40
        const toward = Math.atan2(sun.y - y, sun.x - x)
        const pts = Array.from({ length: 9 }, (_, i) => {
          const a = (i / 9) * Math.PI * 2
          const rr = s * (0.75 + hash(seed * 10 + i) * 0.35)
          return `${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)}`
        }).join(' ')
        return (
          <g key={seed}>
            <g transform={`rotate(${rot.toFixed(2)} ${x} ${y})`}>
              <polygon points={pts} fill={shade(PANEL.bezel, 0.1)} stroke={shade(PANEL.bezel, 0.1)} strokeWidth={14} strokeLinejoin="round" />
              <circle cx={x + s * 0.2} cy={y - s * 0.1} r={s * 0.2} fill={shade(PANEL.bezel, -0.2)} />
            </g>
            {/* Canto encendido: un creciente del lado del sol. */}
            <path
              d={`M ${x + Math.cos(toward - 1.1) * s * 0.9} ${y + Math.sin(toward - 1.1) * s * 0.9} A ${s * 0.9} ${s * 0.9} 0 0 1 ${x + Math.cos(toward + 1.1) * s * 0.9} ${y + Math.sin(toward + 1.1) * s * 0.9}`}
              fill="none"
              stroke={shade(ACCENT.amber, 0.5)}
              strokeWidth={8}
              strokeLinecap="round"
              opacity={0.55}
            />
          </g>
        )
      })}
    </g>
  )
}

// ----- Escena ---------------------------------------------------------------------------

export default function FarolDiorama({ values, time, since }: SceneProps) {
  const mode = values.mode as 'auto' | 'manual'
  const cycle = values.cycleSeconds as number
  const night = values.night as boolean
  const switchSeconds = values.switchSeconds as number
  const lightSize = values.lightSize as number
  const moths = values.moths as boolean
  const bench = values.bench as boolean

  // Mismo reloj de día y noche que el plano: 0 = el sol arriba, π = la luna.
  let angle: number
  if (mode === 'auto') {
    angle = (time / cycle) * Math.PI * 2
  } else {
    const p = Math.min(1, (since?.('night') ?? Infinity) / switchSeconds)
    angle = (night ? Math.PI : 0) - Math.PI * (1 - smooth(p))
  }
  const height = Math.cos(angle)
  const day = smooth(ramp(height, [-0.25, 0.25]))
  const dark = 1 - day
  const lamp = smooth(ramp(dark, [0.45, 0.75]))

  const sun = onOrbit(angle)
  const moon = onOrbit(angle + Math.PI)
  // La mitad de arriba de la órbita es la trasera: lo que pasa por ella va detrás del planeta.
  const behind = (a: number) => Math.cos(a) > 0

  return (
    <g>
      <Layer depth={0.03} time={time}>
        <Deep day={day} />
        <Stars time={time} />
      </Layer>
      <Layer depth={0.12} time={time}>
        <FarWorlds time={time} />
      </Layer>

      <Layer depth={0.45} time={time}>
        <OrbitHalf front={false} color={shade(ACCENT.amber, 0.4)} />
        {behind(angle) && <Sun x={sun.x} y={sun.y} time={time} />}
        {behind(angle + Math.PI) && <MoonBody x={moon.x} y={moon.y} />}
        <Rays
          x={sun.x}
          y={sun.y}
          from={Math.atan2(PLANET.y - sun.y, PLANET.x - sun.x) - 0.35}
          to={Math.atan2(PLANET.y - sun.y, PLANET.x - sun.x) + 0.35}
          count={5}
          length={1600}
          color={shade(ACCENT.amber, 0.5)}
          opacity={0.07 * day + 0.03}
          time={time}
        />
        <Planet angle={angle} dark={dark} lamp={lamp} lightSize={lightSize} bench={bench} moths={moths} time={time} />
        <OrbitHalf front color={shade(ACCENT.amber, 0.4)} />
        {!behind(angle) && <Sun x={sun.x} y={sun.y} time={time} />}
        {!behind(angle + Math.PI) && <MoonBody x={moon.x} y={moon.y} />}
      </Layer>

      <Layer depth={0.95} time={time}>
        <Asteroids time={time} sun={sun} />
      </Layer>
    </g>
  )
}
