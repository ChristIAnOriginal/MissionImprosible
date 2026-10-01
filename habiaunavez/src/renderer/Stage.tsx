import React, { useRef } from 'react'
import { STAGE } from '../shared/palette'
import { findAnimation, findTransition } from '../shared/animations'
import { FLASH_OUT_KEY, sanitizeValues, transitionDuration, type Look, type ParamValues, type ShowState } from '../shared/types'
import { DIORAMA_SCENES, SCENES } from './animations'
import { TRANSITION_SCENES } from './transitions'
import { LookContext, RealismDefs } from './scene/realism'

/**
 * Escenario: monta lo que toque en el lienzo de diseño y lo escala al hueco
 * disponible. Lo usan igual la proyección y la vista previa del panel, así que
 * lo que se ve en el panel es lo que se proyecta.
 *
 * Mientras hay una transición en marcha, es ella la que se pinta; la animación
 * de destino no aparece hasta que termina.
 */
export function Stage({ state, time }: { state: ShowState; time: number }) {
  const meta = findAnimation(state.activeId)
  // Se revalida en el renderer: así una escena nunca recibe un hueco sin valor.
  const values = meta ? sanitizeValues(meta, state.values[meta.id]) : {}
  const since = useSince(state.activeId, values)
  // El estilo sólo se aplica si la escena en pantalla lo tiene.
  // En una transición manda su ficha; si no, la de la animación en pantalla.
  const runMeta = state.running ? findTransition(state.running.id) : undefined
  const look: Look = state.running
    ? state.look !== 'plano' && runMeta?.looks?.includes(state.look) ? state.look : 'plano'
    : lookOf(meta?.id, state.look)
  const content = state.running
    ? renderTransition(state, time, values, since)
    : renderAnimation(state.activeId, values, time, since, look)

  if (!content) {
    return (
      <svg viewBox={`0 0 ${STAGE.width} ${STAGE.height}`} className="stage__svg">
        <rect width={STAGE.width} height={STAGE.height} fill="#141b26" />
        <text x={STAGE.width / 2} y={STAGE.height / 2} fill="#e9edf1" fontSize={44} textAnchor="middle">
          Sin escena
        </text>
      </svg>
    )
  }

  return (
    <svg
      viewBox={`0 0 ${STAGE.width} ${STAGE.height}`}
      preserveAspectRatio="xMidYMid slice"
      className="stage__svg"
    >
      {(look === 'realista' || usesRealism(state)) && <RealismDefs />}
      <LookContext.Provider value={look}>{content}</LookContext.Provider>
      {!state.running && renderArrival(state, time)}
    </svg>
  )
}

/**
 * Recuerda cuándo vio cambiar cada parámetro de la animación activa, en reloj
 * real. Es por ventana: una que se abre después no ha visto cambios y recibe
 * `Infinity`, es decir, el estado ya asentado.
 */
function useSince(activeId: string, values: ParamValues): (key: string) => number {
  const seen = useRef<{ id: string; values: ParamValues; at: Record<string, number> } | null>(null)
  const now = performance.now()
  if (!seen.current || seen.current.id !== activeId) {
    seen.current = { id: activeId, values, at: {} }
  } else {
    for (const key of Object.keys(values)) {
      if (values[key] !== seen.current.values[key]) seen.current.at[key] = now
    }
    seen.current.values = values
  }
  const at = seen.current.at
  return key => (key in at ? (performance.now() - at[key]) / 1000 : Infinity)
}

/** El estilo pedido, si la animación lo tiene; si no, plano. */
function lookOf(id: string | undefined, wanted: Look): Look {
  return wanted !== 'plano' && id && findAnimation(id)?.looks?.includes(wanted) ? wanted : 'plano'
}

/** Una transición que dibuja las escenas necesita los degradados realistas si alguna lo es. */
function usesRealism(state: ShowState) {
  const run = state.running
  if (!run || !findTransition(run.id)?.showsScenes) return false
  return lookOf(state.activeId, state.look) === 'realista' || lookOf(run.to, run.toLook ?? state.look) === 'realista'
}

const settled = () => Infinity

function renderAnimation(
  id: string,
  values: ParamValues,
  time: number,
  since: (key: string) => number,
  look: Look
) {
  const meta = findAnimation(id)
  // El diorama es otra escena; plano y realista comparten la misma.
  const Scene = meta ? (look === 'diorama' && DIORAMA_SCENES[meta.id]) || SCENES[meta.id] : undefined
  if (!meta || !Scene) return null
  return <Scene values={values} time={time} since={since} />
}

/**
 * Si la transición que acaba de terminar cerró en un destello, la animación
 * de destino arranca saliendo de él en vez de aparecer de golpe.
 */
function renderArrival(state: ShowState, time: number) {
  const meta = state.arrival ? findTransition(state.arrival) : undefined
  if (!meta?.exitFlash) return null
  const raw = sanitizeValues(meta, state.values[meta.id])[FLASH_OUT_KEY]
  const seconds = (typeof raw === 'number' ? raw : 700) / 1000
  if (seconds <= 0 || time >= seconds) return null
  return (
    <rect width={STAGE.width} height={STAGE.height} fill={meta.exitFlash} opacity={1 - time / seconds} />
  )
}

function renderTransition(state: ShowState, time: number, values: ParamValues, since: (key: string) => number) {
  const run = state.running
  if (!run) return null
  const meta = findTransition(run.id)
  const Scene = meta ? TRANSITION_SCENES[meta.id] : undefined
  if (!meta || !Scene) return null

  const own = sanitizeValues(meta, state.values[meta.id])
  const seconds = transitionDuration(meta, own) / 1000
  // La transición no usa el reloj acumulado por fotogramas: si la ventana va
  // lenta se atrasaría respecto al audio y al corte del main. Sale del mismo
  // ancla que el main, así que llega al destello justo cuando toca.
  // `time` sólo sirve para forzar el redibujado de cada fotograma.
  void time
  const elapsed = (run.elapsedMs + (run.startedAt === null ? 0 : Date.now() - run.startedAt)) / 1000
  const progress = seconds > 0 ? Math.min(1, Math.max(0, elapsed / seconds)) : 1
  if (!meta.showsScenes) return <Scene values={own} time={elapsed} progress={progress} />

  // La salida sigue en marcha con su reloj; el destino, quieto en el
  // fotograma con el que arranca al terminar.
  const fromLook = lookOf(state.activeId, state.look)
  const toMeta = findAnimation(run.to)
  const toLook = lookOf(run.to, run.toLook ?? state.look)
  const toValues = toMeta ? sanitizeValues(toMeta, run.toValues ?? state.values[run.to]) : {}
  return (
    <Scene
      values={own}
      time={elapsed}
      progress={progress}
      from={
        <LookContext.Provider value={fromLook}>
          {renderAnimation(state.activeId, values, time, since, fromLook)}
        </LookContext.Provider>
      }
      to={
        <LookContext.Provider value={toLook}>{renderAnimation(run.to, toValues, 0, settled, toLook)}</LookContext.Provider>
      }
    />
  )
}
