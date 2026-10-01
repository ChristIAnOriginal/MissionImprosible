/**
 * Página de render fotograma a fotograma. Pinta una animación en un instante
 * exacto, sin reloj propio: la usa `record.cjs` para grabar vídeos de ejemplo.
 *
 * Como las escenas son funciones puras de `values` y `time`, el vídeo sale
 * idéntico a lo que se proyecta, sin saltos aunque el equipo vaya lento.
 */
import React from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { STAGE } from '../../src/shared/palette'
import { findAnimation } from '../../src/shared/animations'
import { sanitizeValues, type Look, type ParamValues } from '../../src/shared/types'
import { DIORAMA_SCENES, SCENES } from '../../src/renderer/animations'
import { LookContext, RealismDefs } from '../../src/renderer/scene/realism'

const root = createRoot(document.getElementById('root')!)

declare global {
  interface Window {
    renderScene: (id: string, values: ParamValues, time: number, look?: Look) => boolean
  }
}

window.renderScene = (id, overrides, time, look = 'plano') => {
  const meta = findAnimation(id)
  const Scene = meta ? (look === 'diorama' && DIORAMA_SCENES[meta.id]) || SCENES[meta.id] : undefined
  if (!meta || !Scene) return false
  const values = sanitizeValues(meta, overrides)
  flushSync(() => {
    root.render(
      <svg viewBox={`0 0 ${STAGE.width} ${STAGE.height}`} preserveAspectRatio="xMidYMid slice">
        {look === 'realista' && <RealismDefs />}
        <LookContext.Provider value={look}>
          <Scene values={values} time={time} since={() => Infinity} />
        </LookContext.Provider>
      </svg>
    )
  })
  return true
}
