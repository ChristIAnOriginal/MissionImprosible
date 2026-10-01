/**
 * "Aceleración": de la deriva estelar a un planeta.
 *
 * Los tramos siguen al audio (`assets/audio/aceleracion.mpeg`, 15 s), en
 * fracción del total:
 *  - aceleración 0    – 0,63  las estrellas corren cada vez más y se estiran;
 *  - frenazo     0,63 – 0,72  cae en seco con el golpe del audio (≈ 9,5 s);
 *  - llegada     0,66 – 0,97  el planeta aparece al fondo y se acerca;
 *  - destello    0,92 – 0,985 todo a blanco para cortar limpio.
 *
 * Arranca con los valores por defecto de la deriva (su planeta, su nebulosa,
 * su densidad y su velocidad), para que el paso desde ella no dé salto.
 */
import React from 'react'
import { ACCENT, SPACE, STAGE } from '../../shared/palette'
import type { TransitionSceneProps } from '../../renderer/scene/contract'
import { CabinFrame, WINDOW } from '../../renderer/scene/CabinFrame'
import { Nebula, Planet, Starfield, Void } from '../../renderer/scene/space'
import { WORLD_SCALE, WorldPlanet, type WorldKind } from '../../renderer/scene/worlds'
import { ramp, smooth, starfieldTime, travelled } from '../../renderer/scene/motion'

const STAGES = {
  accel: [0, 0.63],
  brake: [0.63, 0.72],
  arrive: [0.66, 0.97],
  flash: [0.92, 0.985],
} as const

/** Mismo punto de fuga que la deriva estelar. */
const ORIGIN = { x: WINDOW.x + WINDOW.width / 2, y: WINDOW.y + WINDOW.height * 0.52 }

/** Velocidad tras el frenazo: la nave sigue avanzando, pero despacio. */
const CRUISE = 0.18

function starSpeed(progress: number, start: number, warp: number): number {
  // Acelera cada vez más: curva cuadrática, no una rampa recta.
  const accel = ramp(progress, STAGES.accel)
  const fast = start + (warp - start) * accel * accel
  // El frenazo es rápido y suave a la vez: sin escalón.
  const brake = smooth(ramp(progress, STAGES.brake))
  return fast + (CRUISE - fast) * brake
}

export default function Aceleracion({ values, time, progress, from }: TransitionSceneProps) {
  const kind = values.planet as WorldKind
  const planetSize = values.planetSize as number
  const start = values.startSpeed as number
  const warp = values.warp as number
  const shake = values.shake as number
  const starCount = values.starCount as number
  const leavePlanet = values.leavePlanet as boolean
  const seconds = (values.durationMs as number) / 1000
  // Entrada: la animación de la que sale se desvanece encima de la cabina.
  const mixIn = 1 - smooth(Math.min(1, (progress * seconds) / ((values.mixInMs as number) / 1000)))

  const accel = ramp(progress, STAGES.accel)
  const brake = ramp(progress, STAGES.brake)
  const arrive = ramp(progress, STAGES.arrive)
  const flash = smooth(ramp(progress, STAGES.flash))

  const speed = starSpeed(progress, start, warp)
  const travel = travelled(p => starSpeed(p, start, warp), progress, seconds)

  // Temblor: crece con la velocidad, da un tirón al frenar y se calma.
  const jolt = brake > 0 && brake < 1 ? Math.sin(brake * Math.PI) : 0
  const amp = shake * (7 * accel * accel + 14 * jolt + 1.5 * arrive)
  const dx = amp * (Math.sin(time * 43) * 0.6 + Math.sin(time * 71 + 1.3) * 0.4)
  // El frenazo empuja hacia delante: un tirón vertical además del temblor.
  const dy = amp * (Math.sin(time * 51 + 0.7) * 0.6 + Math.sin(time * 31 + 2.1) * 0.4) + 10 * shake * jolt
  // Se amplía justo lo que tiembla, para que nunca asome el borde del lienzo.
  const zoom = 1 + ((amp + 10 * shake * jolt) * 2.2) / (STAGE.height / 2)

  // El planeta de la deriva se queda atrás: se aparta del centro y crece hasta
  // salir por el borde del cristal.
  const pass = Math.pow(ramp(progress, [0, 0.3]), 2)
  const oldCx = WINDOW.x + 0.74 * WINDOW.width
  const oldCy = WINDOW.y + 0.34 * WINDOW.height
  const spread = 1 + pass * 4
  // La nebulosa se queda atrás con la velocidad.
  const nebula = 1 - ramp(progress, [0.08, 0.4])

  // El planeta de destino nace como un punto al fondo y se acerca: despacio al
  // principio y cada vez más grande, como al llegar de verdad.
  const approach = Math.pow(arrive, 2.3)
  const r = 6 + (planetSize * (WORLD_SCALE[kind] ?? 1) - 6) * approach
  const planetCx = ORIGIN.x + 90 * approach
  const planetCy = ORIGIN.y - 10 * approach

  return (
    <>
      <g
        transform={`translate(${STAGE.width / 2 + dx} ${STAGE.height / 2 + dy}) scale(${zoom}) translate(${-STAGE.width / 2} ${-STAGE.height / 2})`}
      >
        <CabinFrame time={time} mode="calma">
          <Void />
          {nebula > 0 && (
            <g opacity={nebula}>
              <Nebula color={SPACE.nebula} time={time} />
            </g>
          )}
          {leavePlanet && pass < 1 && (
            <Planet
              cx={ORIGIN.x + (oldCx - ORIGIN.x) * spread}
              cy={ORIGIN.y + (oldCy - ORIGIN.y) * spread}
              r={78 * spread}
              color={ACCENT.orange}
              ring
              time={time}
            />
          )}
          <Starfield
            time={starfieldTime(travel, speed)}
            speed={speed}
            count={starCount}
            originX={ORIGIN.x}
            originY={ORIGIN.y}
            reach={1500}
          />
          {arrive > 0 && (
            <g opacity={ramp(progress, [0.66, 0.7])}>
              <WorldPlanet kind={kind} cx={planetCx} cy={planetCy} r={r} time={time} />
            </g>
          )}
        </CabinFrame>
      </g>
      {mixIn > 0 && from && <g opacity={mixIn}>{from}</g>}
      {flash > 0 && <rect width={STAGE.width} height={STAGE.height} fill="#ffffff" opacity={flash} />}
    </>
  )
}
