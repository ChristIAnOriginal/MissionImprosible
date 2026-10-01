/**
 * "Despegue": de la nave encendida y quieta a la deriva estelar.
 *
 * Los tramos siguen al audio (`assets/audio/despegue.mpeg`), en fracción del
 * total:
 *  - rumor    0    – 0,42  los motores arrancan: temblor leve, cielo quieto;
 *  - subida   0,42 – 0,66  el cielo empieza a moverse y la luna cae por debajo;
 *  - empuje   0,66 – 0,9   el audio a tope: estrellas estiradas, temblor fuerte;
 *  - destello 0,9  – 1     todo se va a blanco para cortar limpio al destino.
 */
import React from 'react'
import { STAGE } from '../../shared/palette'
import type { TransitionSceneProps } from '../../renderer/scene/contract'
import { CabinFrame, WINDOW, type ConsoleMode } from '../../renderer/scene/CabinFrame'
import { Moon, Starfield, StillStars, Void } from '../../renderer/scene/space'
import { ramp, smooth, starfieldTime, travelled } from '../../renderer/scene/motion'

const STAGES = {
  rumble: [0, 0.42],
  climb: [0.42, 0.66],
  thrust: [0.66, 0.9],
  flash: [0.9, 0.975],
} as const

/** Mismo punto de fuga que la deriva estelar, para que el corte encaje. */
const ORIGIN = { x: WINDOW.x + WINDOW.width / 2, y: WINDOW.y + WINDOW.height * 0.52 }

/** Velocidad de fuga de las estrellas en cada punto del avance. */
function starSpeed(progress: number, warp: number): number {
  const climb = ramp(progress, STAGES.climb)
  const thrust = ramp(progress, STAGES.thrust)
  return 0.8 * climb * climb + (warp - 0.8) * thrust * thrust
}

export default function Despegue({ values, time, progress }: TransitionSceneProps) {
  const shake = values.shake as number
  const warp = values.warp as number
  const thrustMode = values.thrustMode as ConsoleMode
  const moonSize = values.moonSize as number
  const starCount = values.starCount as number
  const seconds = (values.durationMs as number) / 1000

  const rumble = ramp(progress, STAGES.rumble)
  const climb = ramp(progress, STAGES.climb)
  const thrust = ramp(progress, STAGES.thrust)
  const flash = smooth(ramp(progress, STAGES.flash))

  // Temblor: crece con cada tramo. Varios senos desacompasados, para que no se
  // lea como un vaivén regular.
  const amp = shake * (1.2 * rumble + 3.5 * climb + 9 * thrust)
  const dx = amp * (Math.sin(time * 41) * 0.6 + Math.sin(time * 67 + 1.3) * 0.4)
  const dy = amp * (Math.sin(time * 53 + 0.7) * 0.6 + Math.sin(time * 29 + 2.1) * 0.4)
  // Se amplía justo lo que tiembla, para que nunca asome el borde del lienzo.
  const zoom = 1 + (amp * 2.2) / (STAGE.height / 2)

  // Al ganar velocidad, las estrellas quietas dejan paso a las que corren.
  const speed = starSpeed(progress, warp)
  const travel = travelled(p => starSpeed(p, warp), progress, seconds)
  const stillOpacity = 1 - ramp(progress, [0.44, 0.6])
  const runOpacity = ramp(progress, [0.4, 0.56])

  // La nave cabecea hacia arriba: la luna baja y se pierde bajo el tablero.
  const moonDrop = Math.pow(ramp(progress, [0.3, 0.8]), 2) * 900

  // Resplandor del empuje en el punto de fuga: aros planos, sin degradados.
  const glow = ramp(progress, [0.7, 0.92])

  const mode: ConsoleMode = thrust > 0 ? thrustMode : 'calma'

  return (
    <>
      <g
        transform={`translate(${STAGE.width / 2 + dx} ${STAGE.height / 2 + dy}) scale(${zoom}) translate(${-STAGE.width / 2} ${-STAGE.height / 2})`}
      >
        <CabinFrame time={time} mode={mode}>
          <Void />
          {stillOpacity > 0 && (
            <g opacity={stillOpacity}>
              <StillStars count={34} />
            </g>
          )}
          {moonSize > 0 && (
            <Moon
              cx={WINDOW.x + 0.72 * WINDOW.width}
              cy={WINDOW.y + 0.3 * WINDOW.height + moonDrop}
              r={moonSize}
              phase={0.26}
            />
          )}
          {runOpacity > 0 && (
            <g opacity={runOpacity}>
              <Starfield
                time={starfieldTime(travel, speed)}
                speed={speed}
                count={starCount}
                originX={ORIGIN.x}
                originY={ORIGIN.y}
                reach={1500}
              />
            </g>
          )}
          {glow > 0 &&
            [260, 170, 90].map((r, i) => (
              <circle
                key={r}
                cx={ORIGIN.x}
                cy={ORIGIN.y}
                r={r * (0.6 + glow * 0.6) * (1 + 0.04 * Math.sin(time * 9 + i))}
                fill="#dcebff"
                opacity={glow * (0.12 + i * 0.1)}
              />
            ))}
        </CabinFrame>
      </g>
      {flash > 0 && <rect width={STAGE.width} height={STAGE.height} fill="#ffffff" opacity={flash} />}
    </>
  )
}
