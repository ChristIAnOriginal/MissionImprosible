/**
 * Arrastrar y soltar entre las listas y la secuencia.
 *
 * Durante `dragover` el navegador no deja leer `dataTransfer`, así que lo que
 * se está arrastrando se guarda también en estado de React: con eso cada hueco
 * sabe si lo acepta y se ilumina antes de soltar.
 */

export type Kind = 'animation' | 'transition'

export interface Dragged {
  kind: Kind
  id: string
}

const MIME = 'application/x-huna'

export function writeDrag(e: React.DragEvent, item: Dragged) {
  e.dataTransfer.setData(MIME, JSON.stringify(item))
  e.dataTransfer.effectAllowed = 'copy'
}

export function readDrag(e: React.DragEvent): Dragged | null {
  try {
    const item = JSON.parse(e.dataTransfer.getData(MIME)) as Dragged
    return item && typeof item.id === 'string' ? item : null
  } catch {
    return null
  }
}
