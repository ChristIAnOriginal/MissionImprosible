import React, { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Check, ChevronRight, Pencil, Play, Plus, SkipBack, SkipForward, Square, Trash2, X } from 'lucide-react'
import { ANIMATIONS, TRANSITIONS, findAnimation, findTransition } from '../../shared/animations'
import { GENERIC_TRANSITION_ID, type GuionStep, type ShowState } from '../../shared/types'
import { Thumb } from '../thumbs'
import { readDrag, type Dragged, type Kind } from './dnd'
import type { Picked } from './Sequence'

type Api = Window['hunaAPI']

/**
 * Guiones: secuencias fijas de animaciones, cada una con su configuración, y
 * la transición (también con la suya) con la que se llega a cada paso.
 *
 * Los pasos se arman arrastrando desde las listas: una animación al final
 * añade un paso; soltada sobre un paso, lo cambia; una transición sobre un
 * paso fija con cuál se llega a él. Con el guion en marcha, la cola la arma el
 * guion y «Siguiente» (o → / AvPág) lanza la transición al paso siguiente.
 */
export function Guion({
  state,
  api,
  dragging,
  onPick,
}: {
  state: ShowState
  api: Api
  dragging: Dragged | null
  onPick: (picked: Picked) => void
}) {
  const guion = state.guiones.find(g => g.id === state.guion.id)
  const active = state.guion.step
  const [renaming, setRenaming] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmBack, setConfirmBack] = useState(false)

  // Atrás: al paso anterior; si hay una transición en marcha, vuelve al paso
  // del que salió (la animación que se veía antes).
  const backStep = active === null ? -1 : state.running ? active : active - 1
  const back = guion?.steps[backStep]
  const askBack = () => back && setConfirmBack(true)

  // ← y RePág piden volver atrás, igual que el botón.
  useEffect(() => {
    if (active === null) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, select, textarea')) return
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        askBack()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const save = (steps: GuionStep[]) => guion && api.saveGuion({ ...guion, steps })
  const update = (i: number, patch: Partial<GuionStep>) =>
    guion && save(guion.steps.map((s, k) => (k === i ? { ...s, ...patch } : s)))
  const move = (i: number, by: number) => {
    if (!guion) return
    const steps = [...guion.steps]
    const [s] = steps.splice(i, 1)
    steps.splice(i + by, 0, s)
    save(steps)
  }
  const add = (animationId: string) =>
    guion &&
    save([
      ...guion.steps,
      { id: uid(), animationId, animationPresetId: null, transitionId: null, transitionPresetId: null },
    ])

  const next = guion && active !== null ? guion.steps[active + 1] : undefined
  const nextTransition = next ? findTransition(next.transitionId ?? GENERIC_TRANSITION_ID) : undefined

  return (
    <div className={`plate guion${active !== null ? ' guion--live' : ''}`}>
      <div className="guion__head">
        <h2>Guion</h2>
        {renaming !== null && guion ? (
          <form
            className="guion__rename"
            onSubmit={e => {
              e.preventDefault()
              api.saveGuion({ ...guion, name: renaming })
              setRenaming(null)
            }}
          >
            <input
              className="param__text"
              autoFocus
              maxLength={40}
              value={renaming}
              onChange={e => setRenaming(e.target.value)}
              onKeyDown={e => e.key === 'Escape' && setRenaming(null)}
            />
            <button className="iconbtn" type="submit" title="Guardar nombre">
              <Check size={15} />
            </button>
            <button className="iconbtn" type="button" title="Cancelar" onClick={() => setRenaming(null)}>
              <X size={15} />
            </button>
          </form>
        ) : (
          <select
            className="select"
            value={state.guion.id ?? ''}
            disabled={active !== null}
            onChange={e => api.selectGuion(e.target.value || null)}
          >
            <option value="">Modo libre (sin guion)</option>
            {state.guiones.map(g => (
              <option key={g.id} value={g.id}>
                {g.name} · {g.steps.length} {g.steps.length === 1 ? 'paso' : 'pasos'}
              </option>
            ))}
          </select>
        )}
        {renaming === null && (
          <>
            <button className="iconbtn" type="button" title="Nuevo guion" disabled={active !== null} onClick={() => api.createGuion('')}>
              <Plus size={15} />
            </button>
            {guion && (
              <button className="iconbtn" type="button" title="Renombrar" onClick={() => setRenaming(guion.name)}>
                <Pencil size={15} />
              </button>
            )}
            {guion &&
              (confirmDelete ? (
                <>
                  <button
                    className="iconbtn iconbtn--danger"
                    type="button"
                    title="Confirmar borrado"
                    onClick={() => {
                      api.deleteGuion(guion.id)
                      setConfirmDelete(false)
                    }}
                  >
                    <Check size={15} />
                  </button>
                  <button className="iconbtn" type="button" title="No borrar" onClick={() => setConfirmDelete(false)}>
                    <X size={15} />
                  </button>
                </>
              ) : (
                <button className="iconbtn" type="button" title="Borrar guion" onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={15} />
                </button>
              ))}
          </>
        )}
      </div>

      {!guion ? (
        <p className="empty">
          Sin guion, la secuencia se arma a mano. Crea uno con <b>+</b> para cargar una lista fija de animaciones que
          avanza con un botón.
        </p>
      ) : (
        <>
          <div className="guion__controls">
            {active === null ? (
              <button className="btn btn--primary" disabled={guion.steps.length === 0} onClick={() => api.startGuion(0)}>
                <Play size={16} /> Iniciar guion
              </button>
            ) : (
              <>
                <button
                  className="btn guion__back"
                  disabled={!back}
                  onClick={askBack}
                  title="Atrás (← o RePág)"
                >
                  <SkipBack size={16} /> Atrás
                </button>
                <button
                  className="btn btn--primary guion__next"
                  disabled={!!state.running || !next}
                  onClick={() => api.nextGuion()}
                  title="Siguiente (→ o AvPág)"
                >
                  <SkipForward size={18} />
                  <span>
                    <b>{state.running ? 'En transición…' : next ? 'Siguiente' : 'Fin del guion'}</b>
                    {next && !state.running && (
                      <small>
                        {nextTransition?.name} → {findAnimation(next.animationId)?.name}
                      </small>
                    )}
                  </span>
                </button>
                <span className="guion__count">
                  Paso {active + 1} de {guion.steps.length}
                </span>
                <button className="btn" onClick={() => api.stopGuion()} title="Volver al modo libre">
                  <Square size={14} /> Detener
                </button>
              </>
            )}
          </div>

          <ol className="guion__steps">
            {guion.steps.map((s, i) => (
              <StepRow
                key={s.id}
                step={s}
                index={i}
                count={guion.steps.length}
                state={state}
                dragging={dragging}
                current={active === i}
                upcoming={active !== null && active + 1 === i}
                onJump={() => api.startGuion(i)}
                onPick={onPick}
                onChange={patch => update(i, patch)}
                onMove={by => move(i, by)}
                onRemove={() => save(guion.steps.filter((_, k) => k !== i))}
              />
            ))}
            <DropBox className="guion__add" accept="animation" dragging={dragging} onDrop={add}>
              <AddStep onAdd={add} />
            </DropBox>
          </ol>

        </>
      )}

      {confirmBack && back && (
        <ConfirmDialog
          title="¿Volver atrás?"
          text={`Se corta de inmediato a «${findAnimation(back.animationId)?.name ?? back.animationId}» (paso ${backStep + 1}), sin transición.`}
          confirm="Volver atrás"
          onConfirm={() => {
            api.startGuion(backStep)
            setConfirmBack(false)
          }}
          onCancel={() => setConfirmBack(false)}
        />
      )}
    </div>
  )
}

/**
 * Añadir un paso: un botón que abre un buscador sobre la lista de
 * animaciones. Se filtra por nombre o descripción; Intro añade la primera,
 * Escape cierra.
 */
function AddStep({ onAdd }: { onAdd: (animationId: string) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const box = useRef<HTMLDivElement>(null)
  const norm = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const q = norm(query.trim())
  const found = ANIMATIONS.filter(a => !q || norm(a.name).includes(q) || norm(a.description).includes(q))

  // Se cierra al pinchar fuera.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open])

  const pick = (id: string) => {
    onAdd(id)
    setOpen(false)
    setQuery('')
  }

  if (!open) {
    return (
      <>
        <button className="btn guion__addbtn" onClick={() => setOpen(true)}>
          <Plus size={14} /> Añadir paso
        </button>
        <span>o arrastrá una animación aquí</span>
      </>
    )
  }
  return (
    <div className="picker" ref={box}>
      <input
        className="param__text"
        autoFocus
        placeholder="Buscar animación…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Escape') setOpen(false)
          if (e.key === 'Enter' && found[0]) pick(found[0].id)
        }}
      />
      <ul className="picker__list">
        {found.length === 0 && <li className="empty">Ninguna animación coincide.</li>}
        {found.map(a => (
          <li key={a.id}>
            <button className="picker__item" onClick={() => pick(a.id)}>
              <Thumb id={a.id} kind="animation" />
              <span>
                <b>{a.name}</b>
                <em>{a.description}</em>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Cuadro de confirmación sobre el panel. Intro confirma, Escape cancela. */
function ConfirmDialog({
  title,
  text,
  confirm,
  onConfirm,
  onCancel,
}: {
  title: string
  text: string
  confirm: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const ok = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    ok.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        onCancel()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onCancel])
  return (
    <div className="dialog" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="dialog__box" onClick={e => e.stopPropagation()}>
        <h3>{title}</h3>
        <p>{text}</p>
        <div className="dialog__actions">
          <button className="btn" onClick={onCancel}>
            Cancelar
          </button>
          <button className="btn btn--primary" ref={ok} onClick={onConfirm}>
            <SkipBack size={15} /> {confirm}
          </button>
        </div>
      </div>
    </div>
  )
}

function StepRow({
  step,
  index,
  count,
  state,
  dragging,
  current,
  upcoming,
  onJump,
  onPick,
  onChange,
  onMove,
  onRemove,
}: {
  step: GuionStep
  index: number
  count: number
  state: ShowState
  dragging: Dragged | null
  current: boolean
  upcoming: boolean
  onJump: () => void
  onPick: (picked: Picked) => void
  onChange: (patch: Partial<GuionStep>) => void
  onMove: (by: number) => void
  onRemove: () => void
}) {
  const animation = findAnimation(step.animationId)
  const transition = step.transitionId ? findTransition(step.transitionId) : undefined
  const generic = findTransition(GENERIC_TRANSITION_ID)
  const locked = state.running !== null && (current || upcoming)

  return (
    <li className={`gstep${current ? ' gstep--current' : ''}${upcoming ? ' gstep--next' : ''}`}>
      <button className="gstep__num" onClick={onJump} disabled={!!state.running} title="Ir a este paso">
        {index + 1}
      </button>

      {index === 0 ? (
        <span className="gstep__start">Inicio</span>
      ) : (
        <DropBox
          className="gstep__box gstep__box--transition"
          accept="transition"
          dragging={locked ? null : dragging}
          onDrop={id => onChange({ transitionId: id, transitionPresetId: null })}
        >
          <div className="gstep__name">
            <button
              className="gstep__thumb"
              title="Editar sus parámetros"
              onClick={() => onPick({ kind: 'transition', id: transition?.id ?? GENERIC_TRANSITION_ID })}
            >
              <Thumb id={transition?.id ?? GENERIC_TRANSITION_ID} kind="transition" />
            </button>
            <select
              className="select gstep__pick"
              value={step.transitionId ?? ''}
              disabled={locked}
              onChange={e => onChange({ transitionId: e.target.value || null, transitionPresetId: null })}
              title="Transición con la que se llega a este paso"
            >
              <option value="">{generic?.name ?? 'Fundido'} · por defecto</option>
              {TRANSITIONS.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          {transition ? (
            <PresetSelect
              state={state}
              sceneId={transition.id}
              value={step.transitionPresetId}
              onChange={id => onChange({ transitionPresetId: id })}
            />
          ) : (
            <select className="select gstep__preset" disabled value="">
              <option value="">Valores actuales</option>
            </select>
          )}
        </DropBox>
      )}

      <ChevronRight className="gstep__arrow" size={16} />

      <DropBox
        className="gstep__box"
        accept="animation"
        dragging={locked ? null : dragging}
        onDrop={id => onChange({ animationId: id, animationPresetId: null })}
      >
        <div className="gstep__name">
          <button
            className="gstep__thumb"
            title="Editar sus parámetros"
            onClick={() => onPick({ kind: 'animation', id: step.animationId })}
          >
            <Thumb id={step.animationId} kind="animation" />
          </button>
          <select
            className="select gstep__pick"
            value={animation?.id ?? ''}
            disabled={locked}
            onChange={e => onChange({ animationId: e.target.value, animationPresetId: null })}
            title="Animación de este paso"
          >
            {ANIMATIONS.map(a => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <PresetSelect
          state={state}
          sceneId={step.animationId}
          value={step.animationPresetId}
          onChange={id => onChange({ animationPresetId: id })}
        />
      </DropBox>

      <div className="gstep__tools">
        <button className="iconbtn" title="Subir" disabled={index === 0} onClick={() => onMove(-1)}>
          <ArrowUp size={13} />
        </button>
        <button className="iconbtn" title="Bajar" disabled={index === count - 1} onClick={() => onMove(1)}>
          <ArrowDown size={13} />
        </button>
        <button className="iconbtn" title="Quitar paso" disabled={current} onClick={onRemove}>
          <Trash2 size={13} />
        </button>
      </div>
    </li>
  )
}

function PresetSelect({
  state,
  sceneId,
  value,
  onChange,
}: {
  state: ShowState
  sceneId: string
  value: string | null
  onChange: (id: string | null) => void
}) {
  const presets = state.presets[sceneId] ?? []
  return (
    <select
      className="select gstep__preset"
      value={value ?? ''}
      onChange={e => onChange(e.target.value || null)}
      title="Configuración con la que entra"
    >
      <option value="">Valores actuales</option>
      {presets.map(p => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  )
}

/** Caja que acepta soltar un tipo de ficha. */
function DropBox({
  className,
  accept,
  dragging,
  onDrop,
  children,
}: {
  className: string
  accept: Kind
  dragging: Dragged | null
  onDrop: (id: string) => void
  children: React.ReactNode
}) {
  const [over, setOver] = useState(false)
  const accepts = dragging?.kind === accept
  const Tag = className.includes('guion__add') ? 'li' : 'div'
  return (
    <Tag
      className={`${className}${accepts ? ' drop--accepts' : ''}${accepts && over ? ' drop--over' : ''}`}
      onDragOver={e => {
        if (!accepts) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={e => {
        setOver(false)
        const dropped = readDrag(e)
        if (!accepts || !dropped || dropped.kind !== accept) return
        e.preventDefault()
        onDrop(dropped.id)
      }}
    >
      {children}
    </Tag>
  )
}

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

