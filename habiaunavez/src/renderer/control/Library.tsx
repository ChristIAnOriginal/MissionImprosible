import React from 'react'
import { GripVertical } from 'lucide-react'
import { Thumb } from '../thumbs'
import { writeDrag, type Dragged, type Kind } from './dnd'
import type { Picked } from './Sequence'

/**
 * Lista de fichas arrastrables. Pinchar una la selecciona para editar sus
 * parámetros; arrastrarla la lleva a un hueco de la secuencia; con doble clic
 * se usa directamente (`onOpen`).
 */
export function Library({
  title,
  kind,
  items,
  picked,
  onPick,
  onOpen,
  onDragChange,
}: {
  title: string
  kind: Kind
  items: { id: string; name: string; description: string; accent: string; tag?: string; sub?: string }[]
  picked: Picked | null
  onPick: (picked: Picked) => void
  /** Doble clic: la animación sale ya; la transición queda en cola. */
  onOpen?: (id: string) => void
  onDragChange: (dragging: Dragged | null) => void
}) {
  return (
    <div className="plate library">
      <h2>{title}</h2>
      <div className="list">
        {items.map(item => {
          const isPicked = picked?.kind === kind && picked.id === item.id
          return (
            <div
              key={item.id}
              className={`card${isPicked ? ' card--picked' : ''}`}
              style={{ '--card-accent': item.accent } as React.CSSProperties}
              draggable
              onDragStart={e => {
                writeDrag(e, { kind, id: item.id })
                onDragChange({ kind, id: item.id })
              }}
              onDragEnd={() => onDragChange(null)}
              onClick={() => onPick({ kind, id: item.id })}
              onDoubleClick={() => onOpen?.(item.id)}
              title={onOpen ? (kind === 'animation' ? 'Doble clic: poner en pantalla' : 'Doble clic: dejar en cola') : undefined}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') onPick({ kind, id: item.id })
              }}
            >
              <GripVertical className="card__grip" size={14} />
              <Thumb id={item.id} kind={kind} />
              <div className="card__body">
                <b>
                  {item.name}
                  {item.tag && <span className="card__tag">{item.tag}</span>}
                </b>
                {item.sub && <i>{item.sub}</i>}
                <em>{item.description}</em>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
