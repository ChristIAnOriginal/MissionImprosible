/// <reference path="../huna-api.d.ts" />
import React, { useEffect, useMemo, useState } from 'react'
import { Play, Pause, RotateCcw, Monitor, MonitorOff, Undo2, Zap, X } from 'lucide-react'
import {
  ANIMATIONS,
  DEFAULT_ANIMATION_ID,
  TRANSITIONS,
  findAnimation,
  findTransition,
} from '../../shared/animations'
import {
  LOOKS,
  LOOK_LABELS,
  SPEED_LIMITS,
  sanitizeValues,
  type ParamSpec,
  type Look,
  type ShowState,
} from '../../shared/types'
import { Sequence, type Picked } from './Sequence'
import { Library } from './Library'
import type { Dragged } from './dnd'
import { Stage } from '../Stage'
import { useShowClock } from '../useShowClock'
import { useTransitionAudio } from './useTransitionAudio'
import { ParamField } from './ParamField'
import { Presets } from './Presets'
import { Guion } from './Guion'
import './control.css'

const INITIAL: ShowState = {
  activeId: DEFAULT_ANIMATION_ID,
  playing: true,
  speed: 1,
  epoch: 0,
  values: {},
  running: null,
  cue: { transitionId: null, nextId: null },
  arrival: null,
  look: 'realista',
  presets: {},
  guiones: [],
  guion: { id: null, step: null },
}

/** Agrupa los parámetros por su campo `group` conservando el orden de la ficha. */
function byGroup(params: ParamSpec[]): [string, ParamSpec[]][] {
  const groups = new Map<string, ParamSpec[]>()
  for (const p of params) {
    const key = p.group ?? 'General'
    const list = groups.get(key)
    if (list) list.push(p)
    else groups.set(key, [p])
  }
  return [...groups.entries()]
}

export default function ControlApp() {
  const api = window.hunaAPI

  const [state, setState] = useState<ShowState>(INITIAL)
  const [displays, setDisplays] = useState<{ id: number; label: string; isPrimary: boolean }[]>([])
  const [selectedDisplay, setSelectedDisplay] = useState<number | null>(null)
  const [projection, setProjection] = useState({ open: false, displayId: null as number | null })
  const [selection, setSelection] = useState<Picked | null>(null)
  const [dragging, setDragging] = useState<Dragged | null>(null)

  useEffect(() => {
    const offState = api.onState(setState)
    const offProjection = api.onProjectionState(setProjection)
    api.requestState()
    api.listDisplays().then(list => {
      setDisplays(list)
      setSelectedDisplay(prev => prev ?? (list.find(d => !d.isPrimary) ?? list[0])?.id ?? null)
    })
    return () => {
      offState()
      offProjection()
    }
  }, [api])

  // En modo guion, → y AvPág (los mandos de presentación) lanzan el siguiente paso.
  const guided = state.guion.step !== null
  useEffect(() => {
    if (!guided) return
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('input, select, textarea')) return
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault()
        api.nextGuion()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [api, guided])

  // Las transiciones corren a tiempo real: su ritmo lo fija su duración, no
  // el multiplicador global.
  useTransitionAudio(state)
  const time = useShowClock(state.playing, state.running ? 1 : state.speed, state.epoch)
  // Lo seleccionado manda sobre qué parámetros se editan; si no hay nada
  // seleccionado, los de la animación en curso.
  const picked = selection ?? { kind: 'animation' as const, id: state.activeId }
  const meta =
    (picked.kind === 'transition' ? findTransition(picked.id) : findAnimation(picked.id)) ??
    findAnimation(state.activeId)
  const values = useMemo(
    () => (meta ? sanitizeValues(meta, state.values[meta.id]) : {}),
    [meta, state.values]
  )

  // Controles rápidos de la animación en pantalla (no de la seleccionada).
  const liveMeta = findAnimation(state.activeId)
  const liveValues = useMemo(
    () => (liveMeta ? sanitizeValues(liveMeta, state.values[liveMeta.id]) : {}),
    [liveMeta, state.values]
  )
  const visible = (p: ParamSpec, v: typeof values) => !p.showIf || v[p.showIf.key] === p.showIf.equals
  const quick = liveMeta ? liveMeta.params.filter(p => p.quick && visible(p, liveValues)) : []

  const runningMeta = state.running ? findTransition(state.running.id) : undefined
  const nextId = state.running?.to ?? state.cue.nextId
  const queuedId = state.running?.id ?? state.cue.transitionId

  const animationTag = (id: string) =>
    id === state.activeId ? 'En curso' : id === nextId ? 'Siguiente' : undefined

  return (
    <div className="app">
      <header className="header">
        <div className="header__brand">
          <span className="header__mark" />
          <div>
            <h1>Había una vez</h1>
            <p>Gestor de animaciones</p>
          </div>
        </div>
        <div className="header__right">
          {runningMeta && (
            <button className="badge badge--running" onClick={() => api.cancelTransition()}>
              <Zap size={12} /> {runningMeta.name}
              <X size={12} />
            </button>
          )}
          <span className="badge">
            {ANIMATIONS.length} {ANIMATIONS.length === 1 ? 'animación' : 'animaciones'}
          </span>
        </div>
      </header>

      <main className="layout">
        {/* ----- Secuencia y listas ------------------------------------- */}
        <section className="showcol">
          <div className="plate">
            <h2>Secuencia</h2>
            <Sequence
              state={state}
              time={time}
              guided={guided}
              dragging={dragging}
              picked={picked}
              onPick={setSelection}
              onDropCurrent={id => {
                setSelection({ kind: 'animation', id })
                api.setActive(id)
              }}
              onDropTransition={id => {
                const t = findTransition(id)
                setSelection({ kind: 'transition', id })
                // Sin siguiente todavía, se propone el destino de la ficha.
                api.setCue(state.cue.nextId || !t?.to ? { transitionId: id } : { transitionId: id, nextId: t.to })
              }}
              onDropNext={id => api.setCue({ nextId: id })}
              onClear={slot => api.setCue({ [slot]: null })}
              onPlay={() => api.playCue()}
              onCancel={() => api.cancelTransition()}
            />
          </div>

          <Guion state={state} api={api} dragging={dragging} onPick={setSelection} />

          <div className="libraries">
            <Library
              title="Animaciones"
              kind="animation"
              items={ANIMATIONS.map(a => ({ ...a, tag: animationTag(a.id), sub: a.looks?.length ? (['plano', ...a.looks] as Look[]).map(l => LOOK_LABELS[l]).join(' · ') : undefined }))}
              picked={picked}
              onPick={setSelection}
              onOpen={id => {
                setSelection({ kind: 'animation', id })
                api.setActive(id)
              }}
              onDragChange={setDragging}
            />
            <Library
              title="Transiciones"
              kind="transition"
              items={TRANSITIONS.map(t => ({
                ...t,
                tag: t.id === queuedId ? (state.running ? 'Corriendo' : 'En cola') : undefined,
                sub:
                  t.from && t.to
                    ? `${findAnimation(t.from)?.name ?? t.from} → ${findAnimation(t.to)?.name ?? t.to}`
                    : 'Genérica · entre cualquier animación',
              }))}
              picked={picked}
              onPick={setSelection}
              onOpen={id => {
                const t = findTransition(id)
                setSelection({ kind: 'transition', id })
                api.setCue(state.cue.nextId || !t?.to ? { transitionId: id } : { transitionId: id, nextId: t.to })
              }}
              onDragChange={setDragging}
            />
          </div>
        </section>

        {/* ----- Escena y transporte ------------------------------------ */}
        <section className="stagecol">
          <div className="preview">
            <Stage state={state} time={time} />
          </div>

          <div className="transport">
            <button className="btn btn--primary" onClick={() => api.setPlaying(!state.playing)}>
              {state.playing ? <Pause size={18} /> : <Play size={18} />}
              {state.playing ? 'Pausar' : 'Reproducir'}
            </button>
            <button className="btn" onClick={() => api.restart()}>
              <RotateCcw size={16} /> Reiniciar
            </button>
            <label className="speed">
              <span>Velocidad</span>
              <input
                type="range"
                min={SPEED_LIMITS.min}
                max={SPEED_LIMITS.max}
                step={0.05}
                value={state.speed}
                onChange={e => api.setSpeed(Number(e.target.value))}
              />
              <b>{state.speed.toFixed(2)}x</b>
            </label>
          </div>

          {/* Estilo de dibujo: se aplica a toda animación que tenga versión realista. */}
          <div className="look">
            <span>Estilo</span>
            <div className="chips">
              {LOOKS.map(l => (
                <button
                  key={l}
                  type="button"
                  className={`chip${state.look === l ? ' chip--active' : ''}`}
                  onClick={() => api.setLook(l)}
                >
                  {LOOK_LABELS[l]}
                </button>
              ))}
            </div>
            {state.look !== 'plano' && !findAnimation(state.activeId)?.looks?.includes(state.look) && (
              <em>Esta animación no tiene estilo {LOOK_LABELS[state.look].toLowerCase()}: se ve plana.</em>
            )}
          </div>

          {quick.length > 0 && liveMeta && (
            <div className="plate quick">
              <h2>{liveMeta.name}</h2>
              {quick.map(spec => (
                <ParamField
                  key={spec.key}
                  spec={spec}
                  value={liveValues[spec.key]}
                  onChange={v => api.setParam(liveMeta.id, spec.key, v)}
                />
              ))}
            </div>
          )}

          <div className="plate">
            <h2>Proyección</h2>
            <div className="row">
              <select
                className="select"
                value={selectedDisplay ?? ''}
                onChange={e => setSelectedDisplay(Number(e.target.value))}
              >
                {displays.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.isPrimary ? 'Principal' : 'Secundaria'} — {d.label}
                  </option>
                ))}
              </select>
              <button
                className="btn btn--primary"
                disabled={selectedDisplay === null}
                onClick={() => selectedDisplay !== null && api.openProjection(selectedDisplay)}
              >
                <Monitor size={16} /> {projection.open ? 'Mover aquí' : 'Abrir'}
              </button>
              <button className="btn" disabled={!projection.open} onClick={() => api.closeProjection()}>
                <MonitorOff size={16} /> Cerrar
              </button>
            </div>
          </div>

          {meta && (
            <>
              <p className="editing">
                Parámetros de <b>{meta.name}</b>
              </p>
              <Presets
                meta={meta}
                values={values}
                look={state.look}
                presets={state.presets[meta.id] ?? []}
                api={api}
              />
              {meta.params.every(p => p.quick) ? (
                <div className="plate">
                  <p className="empty">{meta.params.length ? 'Sus controles están bajo la vista previa.' : 'No tiene parámetros.'}</p>
                </div>
              ) : (
                byGroup(meta.params.filter(p => !p.quick && visible(p, values))).map(([group, params]) => (
                  <div className="plate" key={group}>
                    <h2>{group}</h2>
                    {params.map(spec => (
                      <ParamField
                        key={spec.key}
                        spec={spec}
                        value={values[spec.key]}
                        onChange={v => api.setParam(meta.id, spec.key, v)}
                      />
                    ))}
                  </div>
                ))
              )}
              {meta.params.length > 0 && (
                <button className="btn btn--ghost reset" onClick={() => api.resetParams(meta.id)}>
                  <Undo2 size={14} /> Volver a los valores por defecto
                </button>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  )
}
