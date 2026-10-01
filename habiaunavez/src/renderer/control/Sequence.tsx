import React, { useState } from 'react'
import { ChevronRight, Play, Square, X } from 'lucide-react'
import { findAnimation, findTransition } from '../../shared/animations'
import { sanitizeValues, transitionDuration, type ShowState } from '../../shared/types'
import { Thumb } from '../thumbs'
import { readDrag, type Dragged, type Kind } from './dnd'

/**
 * Secuencia: animación en curso → transición → animación siguiente.
 *
 * Cada hueco acepta un solo tipo de ficha. Soltar una animación en «En curso»
 * corta a ella; en «Siguiente» la deja preparada. La transición se lanza con
 * su play y, al terminar, la siguiente pasa a estar en curso.
 */

export type Picked = { kind: Kind; id: string }

export function Sequence({
  state,
  time,
  guided,
  dragging,
  picked,
  onPick,
  onDropCurrent,
  onDropTransition,
  onDropNext,
  onClear,
  onPlay,
  onCancel,
}: {
  state: ShowState
  time: number
  /** Modo guion: la cola la arma el guion y los huecos no aceptan fichas. */
  guided: boolean
  dragging: Dragged | null
  picked: Picked | null
  onPick: (picked: Picked) => void
  onDropCurrent: (id: string) => void
  onDropTransition: (id: string) => void
  onDropNext: (id: string) => void
  onClear: (slot: 'transitionId' | 'nextId') => void
  onPlay: () => void
  onCancel: () => void
}) {
  const running = state.running
  // Mientras corre, la secuencia enseña lo que está pasando, no la cola.
  const transitionId = running?.id ?? state.cue.transitionId
  const nextId = running?.to ?? state.cue.nextId
  const current = findAnimation(state.activeId)
  const transition = transitionId ? findTransition(transitionId) : undefined
  const next = nextId ? findAnimation(nextId) : undefined

  const ready = !running && !!transition && !!next
  const progress = (() => {
    if (!running || !transition) return 0
    const seconds = transitionDuration(transition, sanitizeValues(transition, state.values[transition.id])) / 1000
    // Mismo ancla que el main y que el Stage; `time` sólo fuerza el redibujado.
    void time
    const elapsed = (running.elapsedMs + (running.startedAt === null ? 0 : Date.now() - running.startedAt)) / 1000
    return seconds > 0 ? Math.min(1, elapsed / seconds) : 1
  })()
  // Aviso suave: la transición se puede lanzar desde cualquier animación, pero
  // su dibujo está pensado para arrancar de una concreta.
  const offStart = !running && transition?.from && transition.from !== state.activeId

  return (
    <div className="sequence">
      <Slot
        label="En curso"
        accept="animation"
        dragging={dragging}
        locked={!!running || guided}
        onDrop={onDropCurrent}
        item={current && { kind: 'animation', id: current.id, name: current.name, accent: current.accent }}
        picked={picked}
        onPick={onPick}
        live
      />

      <ChevronRight className="sequence__arrow" size={22} />

      <Slot
        label="Transición"
        accept="transition"
        dragging={dragging}
        locked={!!running || guided}
        onDrop={onDropTransition}
        onClear={() => onClear('transitionId')}
        item={transition && { kind: 'transition', id: transition.id, name: transition.name, accent: transition.accent }}
        picked={picked}
        onPick={onPick}
        empty="Arrastrá una transición"
        footer={
          <>
            {running ? (
              <button className="seqplay seqplay--stop" onClick={onCancel} title="Cancelar">
                <Square size={13} fill="currentColor" />
              </button>
            ) : (
              <button className="seqplay" disabled={!ready} onClick={onPlay} title="Ejecutar">
                <Play size={14} fill="currentColor" />
              </button>
            )}
            <div className="seqbar">
              <div className="seqbar__fill" style={{ width: `${progress * 100}%` }} />
            </div>
          </>
        }
        note={
          guided
            ? 'La arma el guion.'
            : offStart
            ? `Pensada para salir de «${findAnimation(transition.from!)?.name ?? transition.from}».`
            : undefined
        }
      />

      <ChevronRight className="sequence__arrow" size={22} />

      <Slot
        label="Siguiente"
        accept="animation"
        dragging={dragging}
        locked={!!running || guided}
        onDrop={onDropNext}
        onClear={() => onClear('nextId')}
        item={next && { kind: 'animation', id: next.id, name: next.name, accent: next.accent }}
        picked={picked}
        onPick={onPick}
        empty="Arrastrá una animación"
      />
    </div>
  )
}

function Slot({
  label,
  accept,
  dragging,
  locked,
  onDrop,
  onClear,
  item,
  picked,
  onPick,
  empty,
  footer,
  note,
  live,
}: {
  label: string
  accept: Kind
  dragging: Dragged | null
  locked: boolean
  onDrop: (id: string) => void
  onClear?: () => void
  item: { kind: Kind; id: string; name: string; accent: string } | undefined
  picked: Picked | null
  onPick: (picked: Picked) => void
  empty?: string
  footer?: React.ReactNode
  note?: string
  live?: boolean
}) {
  const [over, setOver] = useState(false)
  const accepts = !locked && dragging?.kind === accept
  const isPicked = !!item && picked?.kind === item.kind && picked.id === item.id

  const cls = [
    'slot',
    item ? 'slot--filled' : 'slot--empty',
    accepts ? 'slot--accepts' : '',
    accepts && over ? 'slot--over' : '',
    isPicked ? 'slot--picked' : '',
    live ? 'slot--live' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={cls}
      style={item ? ({ '--slot-accent': item.accent } as React.CSSProperties) : undefined}
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
      <div className="slot__head">
        <span>{label}</span>
        {item && onClear && !locked && (
          <button className="slot__clear" onClick={onClear} title="Quitar">
            <X size={12} />
          </button>
        )}
      </div>

      {item ? (
        <button className="slot__body" onClick={() => onPick({ kind: item.kind, id: item.id })}>
          <Thumb id={item.id} kind={item.kind} />
          <b>{item.name}</b>
        </button>
      ) : (
        <div className="slot__body slot__body--empty">{empty}</div>
      )}

      {footer && <div className="slot__foot">{footer}</div>}
      {note && <p className="slot__note">{note}</p>}
    </div>
  )
}
