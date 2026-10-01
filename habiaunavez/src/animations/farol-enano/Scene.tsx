/**
 * "Farol del planeta enano": fondo.
 *
 * Un planeta tan pequeño que su horizonte se curva en el propio encuadre. El
 * cielo entero — sol, luna, estrellas y un planeta lejano — gira alrededor del
 * centro del planeta, así que el día y la noche pasan en segundos.
 *
 * Dos modos:
 *  - automático: el giro sale de `time` y de la duración del ciclo;
 *  - manual: un botón alterna día y noche. El cielo da media vuelta en
 *    `switchSeconds` y el astro nuevo queda siempre arriba, en el centro. El
 *    tiempo desde la pulsación llega por `since('night')`.
 *
 * El farol se apaga de día; de noche enciende su linterna, echa un cono de
 * luz sobre el suelo y atrae a unos bichitos que revolotean alrededor.
 *
 * En estilo realista (`scene/realism.tsx`): cielo en degradado según la hora,
 * halo de atmósfera, el planeta iluminado desde donde está el sol, astros con
 * volumen y resplandor, estrellas que titilan, un cono de luz que se apaga en
 * el suelo, sombras de contacto y viñeteado.
 */
import React from 'react'
import { ACCENT, PANEL, SPACE, STAGE, mix, shade } from '../../shared/palette'
import type { SceneProps } from '../../renderer/scene/contract'
import { Moon, Planet } from '../../renderer/scene/space'
import { hash } from '../../renderer/scene/room'
import { ramp, smooth } from '../../renderer/scene/motion'
import { ContactShadow, Shaded, SoftGlow, Vignette, useRealistic } from '../../renderer/scene/realism'

/** Centro del planeta, muy por debajo del encuadre, y su radio. */
const PIVOT = { x: STAGE.width / 2, y: 2250 }
const PLANET_R = 1450
/**
 * Órbita aparente de los astros: alta, para que al mediodía queden arriba del
 * farol, y estrecha de lado, para que se les vea bajar y subir por los bordes
 * del encuadre en vez de salir de él enseguida.
 */
const ORBIT = { x: 1060, y: 2080 }

const SKY_DAY = shade(ACCENT.blue, 0.45)
const SKY_NIGHT = SPACE.deep
const GROUND = shade(ACCENT.orange, 0.5)
const GROUND_DARK = shade(ACCENT.red, -0.38)

/** Punto del cielo a un ángulo (0 = arriba) y distancia del centro del planeta. */
function onSky(angle: number, radius: number, radiusX = radius) {
  return { x: PIVOT.x + Math.sin(angle) * radiusX, y: PIVOT.y - Math.cos(angle) * radius }
}

// ----- Farol -------------------------------------------------------------------

const CX = STAGE.width / 2
const IRON = PANEL.bezel
const IRON_LIGHT = shade(PANEL.bezel, 0.28)
const WOOD = shade(ACCENT.orange, -0.45)

/** Cristal de la linterna: un trapecio más ancho arriba, como los faroles de calle. */
const GLASS = { bottom: 462, top: 378, bottomHalf: 28, topHalf: 42 }
const LANTERN = { x: CX, y: (GLASS.bottom + GLASS.top) / 2 }
const GLASS_PTS = `${CX - GLASS.bottomHalf},${GLASS.bottom} ${CX + GLASS.bottomHalf},${GLASS.bottom} ${CX + GLASS.topHalf},${GLASS.top} ${CX - GLASS.topHalf},${GLASS.top}`

const GLASS_OFF = shade(PANEL.bezel, 0.3)
const GLASS_ON = shade(ACCENT.amber, 0.35)

/* Estática: no depende del reloj, se memoriza para no repintarla cada fotograma. */
const Lamppost = React.memo(function Lamppost() {
  return (
    <g>
      {/* Pedestal escalonado, con su canto claro arriba. */}
      <rect x={CX - 40} y={790} width={80} height={22} rx={8} fill={IRON} />
      <Shaded kind="cylX">
        <rect x={CX - 30} y={764} width={60} height={32} rx={8} fill={IRON} />
      </Shaded>
      <rect x={CX - 30} y={764} width={60} height={7} rx={3.5} fill={IRON_LIGHT} />

      {/* Poste, algo más fino arriba; el brillo a la izquierda da el volumen. */}
      <Shaded kind="cylX">
        <polygon points={`${CX - 12},766 ${CX + 12},766 ${CX + 8},470 ${CX - 8},470`} fill={IRON} />
      </Shaded>
      <polygon points={`${CX - 12},766 ${CX - 5},766 ${CX - 3},470 ${CX - 8},470`} fill={IRON_LIGHT} />
      {[640, 520].map(y => (
        <rect key={y} x={CX - 18} y={y} width={36} height={12} rx={6} fill={IRON} />
      ))}

      {/* Linterna: bandeja, cristal (se enciende aparte), tejadillo y remate. */}
      <rect x={CX - 36} y={GLASS.bottom} width={72} height={14} rx={6} fill={IRON} />
      <polygon points={GLASS_PTS} fill={GLASS_OFF} />
      {/* Un trazo del mismo color redondea las esquinas sin dibujar borde. */}
      <polygon
        points={`${CX - 58},${GLASS.top + 4} ${CX + 58},${GLASS.top + 4} ${CX + 34},${GLASS.top - 22} ${CX - 34},${GLASS.top - 22}`}
        fill={IRON}
        stroke={IRON}
        strokeWidth={8}
        strokeLinejoin="round"
      />
      <Shaded kind="sphere">
        <path d={`M ${CX - 24} ${GLASS.top - 20} Q ${CX} ${GLASS.top - 60} ${CX + 24} ${GLASS.top - 20} Z`} fill={IRON} />
      </Shaded>
      <circle cx={CX} cy={GLASS.top - 50} r={8} fill={ACCENT.amber} />
    </g>
  )
})

/** Montantes del cristal: van encima, esté encendido o no. */
function LanternFrame() {
  const bar = (dx0: number, dx1: number) =>
    `${CX + dx0 - 3},${GLASS.bottom} ${CX + dx0 + 3},${GLASS.bottom} ${CX + dx1 + 3},${GLASS.top} ${CX + dx1 - 3},${GLASS.top}`
  return (
    <g fill={IRON}>
      <polygon points={bar(-10, -15)} />
      <polygon points={bar(10, 15)} />
    </g>
  )
}

const BENCH = { x0: 730, x1: 870 }

/* Estática: no depende del reloj, se memoriza para no repintarla cada fotograma. */
const Bench = React.memo(function Bench() {
  const { x0, x1 } = BENCH
  return (
    <g>
      {[x0 + 14, x1 - 24].map(x => (
        <rect key={x} x={x} y={726} width={10} height={90} rx={4} fill={IRON} />
      ))}
      {/* Tablas: respaldo arriba, asiento abajo; canto oscuro debajo y brillo arriba. */}
      {[728, 748, 772].map((y, i) => (
        <g key={y}>
          <rect x={x0} y={y + 4} width={x1 - x0} height={14} rx={6} fill={shade(WOOD, -0.3)} />
          <rect x={x0} y={y} width={x1 - x0} height={14} rx={6} fill={i === 2 ? shade(WOOD, 0.1) : WOOD} />
          <rect x={x0 + 8} y={y + 2} width={x1 - x0 - 16} height={4} rx={2} fill={shade(WOOD, 0.3)} />
        </g>
      ))}
    </g>
  )
})

// ----- Suelo -------------------------------------------------------------------

/* Estática: no depende del reloj, se memoriza para no repintarla cada fotograma. */
const Ground = React.memo(function Ground() {
  // Cráteres aplastados: cuanto más cerca del horizonte, más de canto se ven.
  const craters: [number, number, number, number][] = [
    [380, 1010, 130, 30],
    [1480, 960, 96, 22],
    [1230, 1050, 150, 30],
    [640, 900, 64, 14],
    [1690, 1045, 70, 18],
  ]
  return (
    <g>
      <circle cx={PIVOT.x} cy={PIVOT.y} r={PLANET_R} fill={GROUND} />
      <ellipse cx={560} cy={960} rx={260} ry={34} fill={GROUND_DARK} opacity={0.5} />
      <ellipse cx={1420} cy={1030} rx={300} ry={40} fill={GROUND_DARK} opacity={0.5} />
      {craters.map(([x, y, rx, ry]) => (
        <g key={x}>
          <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={shade(GROUND, 0.3)} />
          <ellipse cx={x + rx * 0.06} cy={y + ry * 0.2} rx={rx * 0.84} ry={ry * 0.72} fill={shade(GROUND, -0.18)} />
        </g>
      ))}
    </g>
  )
})

/**
 * Máscara de lo que la noche oscurece: el suelo, el farol y el banco, con su
 * silueta exacta. Se pintan las mismas piezas forzadas a blanco (la regla CSS
 * pisa los rellenos propios); con rectángulos aproximados, sobre el cielo en
 * degradado, se veían los cuadrados al anochecer.
 */
function DarkMask({ bench }: { bench: boolean }) {
  return (
    <mask id="farol-dark" maskUnits="userSpaceOnUse" x={0} y={0} width={STAGE.width} height={STAGE.height}>
      <style>{'.farol-sil, .farol-sil * { fill: #fff !important; stroke: #fff !important; opacity: 1 !important; fill-opacity: 1 !important; }'}</style>
      <g className="farol-sil">
        <circle cx={PIVOT.x} cy={PIVOT.y} r={PLANET_R + 4} />
        <Lamppost />
        {bench && <Bench />}
      </g>
    </mask>
  )
}

// ----- Cielo -------------------------------------------------------------------

function Stars({ angle, alpha, time }: { angle: number; alpha: number; time: number }) {
  const real = useRealistic()
  if (alpha <= 0.02) return null
  const stars: React.ReactElement[] = []
  for (let i = 0; i < 170; i++) {
    const p = onSky(hash(i) * Math.PI * 2 + angle, 1520 + hash(i + 0.5) * 1100)
    // Sólo las que caen en cuadro: el resto del cielo gira fuera de él.
    if (p.x < -10 || p.x > STAGE.width + 10 || p.y < -10 || p.y > STAGE.height) continue
    const big = hash(i + 0.7) > 0.8
    // En realista titilan, cada una a su ritmo.
    const twinkle = real ? 0.55 + 0.45 * Math.sin(time * (1.5 + hash(i + 0.3) * 3) + i) : 1
    stars.push(
      <circle key={i} cx={p.x} cy={p.y} r={big ? 3.4 : 2} fill={big ? SPACE.star : SPACE.starDim} opacity={twinkle} />
    )
  }
  return <g opacity={alpha}>{stars}</g>
}

function Sun({ x, y, time }: { x: number; y: number; time: number }) {
  const spin = time * 0.3
  return (
    <g>
      <g stroke={ACCENT.amber} strokeWidth={14} strokeLinecap="round">
        {Array.from({ length: 12 }, (_, i) => {
          const a = spin + (i / 12) * Math.PI * 2
          return (
            <line
              key={i}
              x1={x + Math.cos(a) * 100}
              y1={y + Math.sin(a) * 100}
              x2={x + Math.cos(a) * 128}
              y2={y + Math.sin(a) * 128}
            />
          )
        })}
      </g>
      <circle cx={x} cy={y} r={80} fill={ACCENT.amber} stroke={shade(ACCENT.amber, -0.25)} strokeWidth={6} />
      <circle cx={x - 8} cy={y - 8} r={52} fill={shade(ACCENT.amber, 0.4)} />
    </g>
  )
}

// ----- Luz del farol -----------------------------------------------------------

/** Bichitos que revolotean alrededor de la linterna encendida. */
function Moths({ time, alpha }: { time: number; alpha: number }) {
  return (
    <g fill={shade(ACCENT.amber, 0.6)} opacity={alpha}>
      {[0, 1, 2, 3, 4].map(k => {
        const a = time * (1.6 + k * 0.37) + k * 1.3
        return (
          <circle
            key={k}
            cx={LANTERN.x + Math.cos(a) * (46 + k * 11)}
            cy={LANTERN.y + Math.sin(a * 1.3) * (26 + k * 7)}
            r={3.4}
          />
        )
      })}
    </g>
  )
}

function LitZone({ alpha, time, size }: { alpha: number; time: number; size: number }) {
  const breathe = 1 + 0.03 * Math.sin(time * 2.2)
  const r = size * breathe
  if (useRealistic()) {
    return (
      <g>
        <polygon
          points={`${CX - GLASS.bottomHalf},${GLASS.bottom} ${CX + GLASS.bottomHalf},${GLASS.bottom} ${CX + 320 * r},818 ${CX - 320 * r},818`}
          fill="url(#rl-beamWarm)"
          opacity={alpha * 0.9}
        />
        <ellipse cx={CX} cy={818} rx={420 * r} ry={64 * r} fill="url(#rl-glowWarm)" opacity={alpha} />
        <circle cx={LANTERN.x} cy={LANTERN.y} r={300 * breathe} fill="url(#rl-glowWarm)" opacity={alpha} />
        <polygon points={GLASS_PTS} fill={GLASS_ON} opacity={alpha} />
      </g>
    )
  }
  return (
    <g>
      <g fill={ACCENT.amber}>
        {/* Cono de luz hacia el suelo, desde la base del cristal. */}
        <polygon
          points={`${CX - GLASS.bottomHalf},${GLASS.bottom} ${CX + GLASS.bottomHalf},${GLASS.bottom} ${CX + 300 * r},818 ${CX - 300 * r},818`}
          opacity={alpha * 0.1}
        />
        <ellipse cx={CX} cy={818} rx={330 * r} ry={46 * r} opacity={alpha * 0.2} />
        <ellipse cx={CX} cy={814} rx={180 * r} ry={24 * r} opacity={alpha * 0.22} />
        <circle cx={LANTERN.x} cy={LANTERN.y} r={130 * breathe} opacity={alpha * 0.14} />
        <circle cx={LANTERN.x} cy={LANTERN.y} r={70 * breathe} opacity={alpha * 0.22} />
      </g>
      <polygon points={GLASS_PTS} fill={GLASS_ON} opacity={alpha} />
    </g>
  )
}

// ----- Realista ----------------------------------------------------------------

/** Cielo en degradado: más claro y cálido en el horizonte, más hondo arriba. */
function RealSky({ angle, dark, dusk }: { angle: number; dark: number; dusk: number }) {
  const top = mix(shade(ACCENT.blue, 0.15), shade(SPACE.deep, -0.35), dark)
  const low = mix(mix(shade(ACCENT.blue, 0.72), SPACE.nebula, dark), shade(ACCENT.orange, 0.2), dusk * 0.7)
  // El sol tiñe un poco más el lado del cielo donde está.
  const side = Math.sin(angle) > 0 ? 1 : 0
  return (
    <>
      <defs>
        <linearGradient id="farol-sky" x1={0} y1={0} x2={0} y2={1}>
          <stop offset={0} stopColor={top} />
          <stop offset={0.75} stopColor={low} />
        </linearGradient>
        <radialGradient id="farol-dusk" cx={side} cy={0.85} r={0.7}>
          <stop offset={0} stopColor={ACCENT.orange} stopOpacity={0.5 * dusk} />
          <stop offset={1} stopColor={ACCENT.orange} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect width={STAGE.width} height={STAGE.height} fill="url(#farol-sky)" />
      {dusk > 0 && <rect width={STAGE.width} height={STAGE.height} fill="url(#farol-dusk)" />}
    </>
  )
}

/** Halo de atmósfera pegado al horizonte del planeta. */
function Atmosphere({ dark }: { dark: number }) {
  const halo = PLANET_R + 170
  const color = mix(shade(ACCENT.blue, 0.8), SPACE.nebula, dark)
  return (
    <>
      <defs>
        <radialGradient id="farol-atmos" gradientUnits="userSpaceOnUse" cx={PIVOT.x} cy={PIVOT.y} r={halo}>
          <stop offset={PLANET_R / halo} stopColor={color} stopOpacity={0.7} />
          <stop offset={1} stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={PIVOT.x} cy={PIVOT.y} r={halo} fill="url(#farol-atmos)" />
    </>
  )
}

/** El planeta, más claro del lado del sol y en penumbra del otro: la luz gira con el ciclo. */
function PlanetLight({ angle }: { angle: number }) {
  const dx = Math.sin(angle)
  const dy = -Math.cos(angle)
  return (
    <>
      <defs>
        <linearGradient
          id="farol-planet"
          gradientUnits="userSpaceOnUse"
          x1={PIVOT.x + dx * PLANET_R}
          y1={PIVOT.y + dy * PLANET_R}
          x2={PIVOT.x - dx * PLANET_R * 0.3}
          y2={PIVOT.y - dy * PLANET_R * 0.3}
        >
          <stop offset={0} stopColor="#ffffff" stopOpacity={0.28} />
          <stop offset={0.45} stopColor="#ffffff" stopOpacity={0} />
          <stop offset={1} stopColor={SPACE.deep} stopOpacity={0.5} />
        </linearGradient>
      </defs>
      <circle cx={PIVOT.x} cy={PIVOT.y} r={PLANET_R} fill="url(#farol-planet)" />
    </>
  )
}

// ----- Escena ------------------------------------------------------------------

export default function FarolEnano({ values, time, since }: SceneProps) {
  const mode = values.mode as 'auto' | 'manual'
  const cycle = values.cycleSeconds as number
  const night = values.night as boolean
  const switchSeconds = values.switchSeconds as number
  const lightSize = values.lightSize as number
  const moths = values.moths as boolean
  const bench = values.bench as boolean

  // Ángulo del cielo: 0 = el sol arriba en el centro; π = la luna.
  let angle: number
  if (mode === 'auto') {
    angle = (time / cycle) * Math.PI * 2
  } else {
    const target = night ? Math.PI : 0
    // Media vuelta desde el astro anterior hasta el nuevo; sin pulsación vista,
    // directamente asentado.
    const p = Math.min(1, (since?.('night') ?? Infinity) / switchSeconds)
    angle = target - Math.PI * (1 - smooth(p))
  }

  const height = Math.cos(angle)
  const day = smooth(ramp(height, [-0.25, 0.25]))
  const dark = 1 - day
  // El naranja del horizonte aparece en los cruces, no a pleno día ni de noche.
  const dusk = Math.max(0, 1 - Math.abs(height) / 0.35)
  const lamp = smooth(ramp(dark, [0.45, 0.75]))

  const real = useRealistic()
  const sun = onSky(angle, ORBIT.y, ORBIT.x)
  const moon = onSky(angle + Math.PI, ORBIT.y, ORBIT.x)
  const farPlanet = onSky(angle + 2.3, 1900)

  return (
    <g>
      <rect width={STAGE.width} height={STAGE.height} fill={mix(SKY_DAY, SKY_NIGHT, dark)} />
      {real && <RealSky angle={angle} dark={dark} dusk={dusk} />}
      <Stars angle={angle} alpha={dark} time={time} />
      <g opacity={0.3 + 0.7 * dark}>
        <Planet cx={farPlanet.x} cy={farPlanet.y} r={42} color={ACCENT.teal} ring time={time} />
      </g>
      {dusk > 0 && (
        <g fill={ACCENT.orange}>
          <circle cx={PIVOT.x} cy={PIVOT.y} r={PLANET_R + 170} opacity={dusk * 0.3} />
          <circle cx={PIVOT.x} cy={PIVOT.y} r={PLANET_R + 80} opacity={dusk * 0.35} />
        </g>
      )}
      {sun.y < STAGE.height && (
        <>
          <SoftGlow cx={sun.x} cy={sun.y} r={420} tone="sun" />
          <Sun x={sun.x} y={sun.y} time={time} />
        </>
      )}
      {moon.y < STAGE.height && (
        <>
          <SoftGlow cx={moon.x} cy={moon.y} r={220} tone="cool" opacity={0.7} />
          <Moon cx={moon.x} cy={moon.y} r={70} phase={0.28} />
          {real && <circle cx={moon.x} cy={moon.y} r={70} fill="url(#rl-sphere)" />}
        </>
      )}

      {real && <Atmosphere dark={dark} />}
      <Ground />
      {real && <PlanetLight angle={angle} />}
      <ContactShadow cx={CX} cy={814} rx={120} ry={16} />
      {bench && <ContactShadow cx={(BENCH.x0 + BENCH.x1) / 2} cy={816} rx={110} ry={14} />}
      {bench && <Bench />}
      <Lamppost />

      {/* La noche oscurece sólo el suelo, el farol y el banco: el cielo ya
          lleva su propio color y los astros no se apagan. */}
      {dark > 0.01 && (
        <>
          <defs>
            <DarkMask bench={bench} />
          </defs>
          <rect width={STAGE.width} height={STAGE.height} fill={SPACE.deep} opacity={dark * 0.55} mask="url(#farol-dark)" />
        </>
      )}

      {lamp > 0 && <LitZone alpha={lamp} time={time} size={lightSize} />}
      <LanternFrame />
      {lamp > 0 && moths && <Moths time={time} alpha={lamp} />}
      <Vignette />
    </g>
  )
}
