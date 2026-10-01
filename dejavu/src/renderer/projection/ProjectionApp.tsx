/// <reference path="../dejavu-api.d.ts" />
import React, { useEffect, useState } from 'react'
import { DEFAULT_SETTINGS, TimerSettings, TimerTick } from '../../shared/types'
import { clockView } from '../../shared/display'
import { useSmoothRemaining } from '../useSmoothRemaining'
import '@fontsource/arimo/400.css'
import './projection.css'

const INITIAL_TICK: TimerTick = { phase: 'idle', remainingMs: 0, laps: 0, anchorAt: 0, rate: 0 }

/**
 * Pantalla de proyección: fondo negro, dígitos blancos y nada más.
 * Los únicos adornos son el aviso de tiempo agotándose y el rebobinado.
 */
export default function ProjectionApp() {
  const [tick, setTick] = useState<TimerTick>(INITIAL_TICK)
  const [settings, setSettings] = useState<TimerSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    const api = window.dejavuAPI
    const offTick = api.onTick(setTick)
    const offSettings = api.onSettings(setSettings)
    api.requestState()
    return () => {
      offTick()
      offSettings()
    }
  }, [])

  const remainingMs = useSmoothRemaining(tick, settings.durationMs)
  const view = clockView(remainingMs, tick.phase, settings)

  const rewinding = tick.phase === 'rewinding'
  // Activada pero sin texto no pinta nada, para no dejar los dos puntos colgando.
  const viewpoint = settings.showViewpoint ? settings.viewpointText.trim() : ''

  return (
    <div
      className={`stage${rewinding ? ' stage--rewind' : ''}${tick.phase === 'paused' ? ' stage--paused' : ''}`}
      // --chars deja que el CSS ajuste el cuerpo al ancho real del formato en uso.
      style={{ '--scale': settings.digitScale, '--chars': view.chars } as React.CSSProperties}
    >
      <div
        className={`clock${view.pulsing ? ' clock--alert' : ''}`}
        // La duración sólo se fija latiendo: en línea pisaría la del jitter del rebobinado.
        style={{
          color: view.color,
          ...(view.pulsing ? { animationDuration: `${view.pulseSeconds}s` } : {}),
        }}
      >
        {view.main}
        {view.frac && <span className="clock__frac">{view.frac}</span>}
      </div>

      {viewpoint && (
        <div className="viewpoint">
          <span className="viewpoint__label">Punto de vista:</span> {viewpoint}
        </div>
      )}

      {rewinding && (
        <>
          <div className="scanlines" aria-hidden />
          <div className="rewind-mark" aria-hidden>
            ◀◀
          </div>
        </>
      )}
    </div>
  )
}
