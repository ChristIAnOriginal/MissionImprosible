/**
 * Piezas de «Boa» y «Elefante»: el dibujo número 1 y el número 2 de El
 * Principito (`referencia/referenciaElefante*.jpeg`).
 *
 * Boa y elefante se dibujan en las coordenadas de la referencia (1600 de
 * ancho, barriga en y = 360) y `StillBoa` los coloca en el lienzo. Las dos
 * animaciones son imágenes fijas con el mismo acabado: en grises sobre
 * blanco y con el sombreado realista de `scene/realism.tsx`, que se fuerza
 * aquí aunque el estilo global sea otro.
 */
import React, { useId } from 'react'
import { ACCENT, INK, PANEL, STAGE, shade } from '../../shared/palette'
import { hash } from '../../renderer/scene/room'
import { LookContext, RealismDefs, Shaded, shadeFill, useRealistic } from '../../renderer/scene/realism'

export type Tint = (c: string) => string

/** Pasa un color a gris por su luminancia: la versión en blanco y negro. */
export const grayscale: Tint = c => {
  const n = parseInt(c.slice(1), 16)
  const l = Math.round(0.3 * ((n >> 16) & 255) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255))
  const h = l.toString(16).padStart(2, '0')
  return `#${h}${h}${h}`
}

// ----- Boa ---------------------------------------------------------------------

/**
 * Silueta del dibujo número 1: cola fina a la izquierda, la joroba alta de la
 * cabeza del elefante, el lomo y la cabeza de la boa a la derecha.
 */
export const BOA_PATH =
  'M 118 352 C 118 346 200 344 330 340 C 400 336 440 330 470 290 C 505 230 520 150 620 135 ' +
  'C 700 125 740 185 800 200 C 880 215 980 195 1015 215 C 1040 235 1030 300 1090 335 ' +
  'C 1180 345 1320 345 1420 340 C 1460 335 1490 340 1488 350 C 1485 360 1440 362 1400 360 ' +
  'C 1200 362 400 362 130 360 C 112 359 112 354 118 352 Z'

export const REF_BASELINE = 360
/** Centro horizontal de la silueta en la referencia. */
export const REF_CENTER = 803

/** Grosor de la piel cuando se ve por dentro (el trazo va mitad dentro, mitad fuera). */
const SKIN = 30

const ELEPHANT = PANEL.screw

/** El elefante del dibujo número 2, mirando a la izquierda, bajo la joroba. */
export function Elephant({ tint }: { tint: Tint }) {
  const body = tint(ELEPHANT)
  const far = tint(shade(ELEPHANT, -0.22))
  const light = tint(shade(ELEPHANT, 0.2))
  const ivory = tint('#f4efe2')
  return (
    <g>
      {/* Patas del lado lejano: un tono más oscuras, un poco retrasadas. */}
      <Shaded kind="cylX">
        <rect x={712} y={296} width={40} height={60} rx={12} fill={far} />
      </Shaded>
      <Shaded kind="cylX">
        <rect x={958} y={296} width={38} height={60} rx={12} fill={far} />
      </Shaded>

      {/* Cuerpo, con el lomo que sigue la curva de la boa. */}
      <Shaded kind="cylY">
        <path
          d="M 650 222 C 720 205 800 212 880 216 C 960 220 1002 226 1006 262 C 1010 300 992 322 962 326 L 690 326 C 650 322 628 290 640 250 Z"
          fill={body}
        />
      </Shaded>
      {/* Barriga en sombra: el mismo gris, un paso más oscuro abajo. */}
      <path d="M 660 306 C 760 316 900 316 1000 300 C 996 316 982 324 962 326 L 690 326 C 676 324 666 318 660 306 Z" fill={far} />
      {/* Cola. */}
      <path d="M 1002 250 C 1016 262 1020 280 1016 298" fill="none" stroke={far} strokeWidth={6} strokeLinecap="round" />

      {/* Patas del lado cercano, con sus uñas claras. */}
      {[656, 906].map(x => (
        <g key={x}>
          <Shaded kind="cylX">
            <rect x={x} y={292} width={44} height={64} rx={12} fill={body} />
          </Shaded>
          {[0, 1, 2].map(k => (
            <ellipse key={k} cx={x + 9 + k * 13} cy={351} rx={5} ry={4} fill={light} />
          ))}
        </g>
      ))}

      {/* Trompa: baja por la ladera de la joroba hacia la cola, afinándose. */}
      <Shaded kind="cylY">
        <path
          d="M 548 262 C 520 290 500 318 470 336 C 440 348 400 350 360 350 L 360 344 C 400 343 432 338 458 326 C 488 308 510 282 530 250 Z"
          fill={body}
        />
      </Shaded>
      {/* Cabeza. */}
      <Shaded kind="sphere">
        <circle cx={588} cy={246} r={62} fill={body} />
      </Shaded>
      {/* Colmillo. */}
      <Shaded kind="sheen">
        <path d="M 556 292 C 540 304 520 308 500 306 C 516 300 532 292 546 282 Z" fill={ivory} />
      </Shaded>
      {/* Oreja grande y caída, con su cara interna más oscura. */}
      <Shaded kind="sphere">
        <path d="M 612 196 C 680 186 706 238 694 284 C 684 312 644 308 626 288 C 610 264 604 226 612 196 Z" fill={light} />
      </Shaded>
      <path d="M 628 212 C 672 208 688 244 680 276 C 672 294 648 292 638 280 C 626 262 622 236 628 212 Z" fill={body} />
      {/* Ojo, como en la referencia: blanco con la pupila. */}
      <circle cx={556} cy={226} r={11} fill={tint('#ffffff')} />
      <circle cx={558} cy={226} r={6} fill={INK.line} />
    </g>
  )
}

/** Manchas del lomo: una retícula al tresbolillo que la silueta recorta. */
const SPOTS = Array.from({ length: 7 }, (_, row) =>
  Array.from({ length: 22 }, (_, col) => ({
    x: 140 + col * 64 + (row % 2) * 32,
    y: 150 + row * 32,
    r: 13 + hash(row * 31 + col) * 6,
  }))
).flat()

/**
 * La boa, apoyada en `y = REF_BASELINE` de sus coordenadas. `reveal` abre la
 * vista por dentro; `breath` hincha la joroba desde el suelo. `lightFromRight`
 * pone el brillo realista del lado del sol.
 */
export function Boa({
  color,
  spots,
  reveal,
  breath,
  time,
  tint,
  lightFromRight = false,
  tongue: showTongue = true,
}: {
  color: string
  spots: boolean
  reveal: number
  breath: number
  time: number
  tint: Tint
  lightFromRight?: boolean
  tongue?: boolean
}) {
  const real = useRealistic()
  const clip = `boa-${useId().replace(/:/g, '')}`
  const base = tint(color)
  const top = tint(shade(color, 0.22))
  const belly = tint(shade(color, -0.28))
  const spot = tint(shade(color, -0.16))
  const stomach = tint(shade(color, -0.62))

  // La lengua asoma un momento cada pocos segundos.
  const flick = time % 4.2
  const tongue = showTongue && flick < 0.45 ? Math.sin((flick / 0.45) * Math.PI) : 0

  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <path d={BOA_PATH} />
        </clipPath>
      </defs>

      {/* Lengua bífida, detrás de la cabeza. */}
      {tongue > 0 && (
        <path
          d={`M 1484 350 L ${1484 + 26 * tongue} 350 l 8 -5 M ${1484 + 26 * tongue} 350 l 8 5`}
          fill="none"
          stroke={tint(ACCENT.red)}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* La respiración hincha la joroba desde el suelo. */}
      <g transform={`translate(0 ${REF_BASELINE}) scale(1 ${breath}) translate(0 -${REF_BASELINE})`}>
        <g clipPath={`url(#${clip})`}>
          {/* Brillo arriba, cuerpo, barriga abajo: el volumen sale del tono. */}
          <rect x={100} y={100} width={1420} height={280} fill={top} />
          <path d={BOA_PATH} transform="translate(0 10)" fill={base} />
          {spots &&
            SPOTS.map((s, i) =>
              real ? (
                <Shaded key={i} kind="sphere" opacity={0.6}>
                  <ellipse cx={s.x} cy={s.y} rx={s.r} ry={s.r * 0.62} fill={spot} />
                </Shaded>
              ) : (
                <ellipse key={i} cx={s.x} cy={s.y} rx={s.r} ry={s.r * 0.62} fill={spot} />
              )
            )}
          <rect x={100} y={REF_BASELINE - 12} width={1420} height={20} fill={belly} />
          {/* Realista: el cuerpo redondo, con la luz de un lado y un brillo de escamas. */}
          {real && (
            <>
              <rect x={110} y={130} width={1390} height={234} fill={shadeFill('cylY')} />
              <rect x={110} y={130} width={1390} height={234} fill={shadeFill(lightFromRight ? 'cylXRev' : 'cylX')} opacity={0.5} />
              <rect x={110} y={130} width={1390} height={234} fill={shadeFill('sheen')} opacity={0.6} />
            </>
          )}

          {/* Por dentro: el estómago oscuro y el elefante. */}
          {reveal > 0 && (
            <g opacity={reveal}>
              <rect x={100} y={100} width={1420} height={280} fill={stomach} />
              {real && <rect x={110} y={130} width={1390} height={234} fill={shadeFill('fadeUp')} />}
              {/* El elefante se apoya en la piel de abajo, no dentro de ella. */}
              <g transform={`translate(0 ${(1 - reveal) * 16 - 14})`}>
                <Elephant tint={tint} />
              </g>
            </g>
          )}
        </g>
        {/* La piel, como banda del color de la boa, encima del elefante. */}
        {reveal > 0 && (
          <path
            d={BOA_PATH}
            fill="none"
            stroke={base}
            strokeWidth={SKIN}
            strokeLinejoin="round"
            clipPath={`url(#${clip})`}
            opacity={reveal}
          />
        )}
        {/* Ojo de la boa. */}
        <circle cx={1452} cy={347} r={4.5} fill={INK.line} />
      </g>
    </g>
  )
}

/**
 * La boa en grises sobre blanco, como el dibujo número 1. Cerrada se lee como
 * un sombrero; `inside` la muestra abierta con el elefante dentro. Imagen
 * fija: no depende del reloj.
 */
export function StillBoa({ inside }: { inside: boolean }) {
  const scale = 1.1
  const to = `translate(${STAGE.width / 2} 690) scale(${scale}) translate(-${REF_CENTER} -${REF_BASELINE})`
  return (
    <LookContext.Provider value="realista">
      <RealismDefs />
      <rect x={-60} y={-60} width={STAGE.width + 120} height={STAGE.height + 120} fill="#ffffff" />
      {/* Sombra de apoyo, suave. */}
      <ellipse cx={STAGE.width / 2} cy={694} rx={800} ry={22} fill={shadeFill('fadeDown')} opacity={0.5} />
      <g transform={to}>
        <Boa
          color="#6f8f3e"
          spots={false}
          reveal={inside ? 1 : 0}
          breath={1}
          time={0}
          tint={c => grayscale(shade(c, -0.25))}
          tongue={false}
        />
      </g>
    </LookContext.Provider>
  )
}
