/// <reference path="../dejavu-api.d.ts" />
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, Rewind, Monitor, MonitorOff, Repeat, Eye, Flame } from 'lucide-react'
import {
  DEFAULT_SETTINGS,
  DisplayInfo,
  LIMITS,
  MILLIS_THRESHOLD_MS,
  TimerSettings,
  TimerTick,
} from '../../shared/types'
import { clamp, formatTime, joinDuration, splitDuration } from '../../shared/format'
import { clockView } from '../../shared/display'
import { useSmoothRemaining } from '../useSmoothRemaining'
import '@fontsource/arimo/400.css'
import './control.css'

const PHASE_LABEL: Record<TimerTick['phase'], string> = {
  idle: 'Listo',
  running: 'En marcha',
  paused: 'En pausa',
  rewinding: 'Rebobinando',
}

const PRESETS_MIN = [1, 3, 5, 10, 15, 30]

/** Atajos del aviso, en segundos. */
const ALERT_PRESETS_S = [10, 30, 60, 120]

const INITIAL_TICK: TimerTick = { phase: 'idle', remainingMs: 0, laps: 0, anchorAt: 0, rate: 0 }

/** Campo numérico con etiqueta corta, usado para h / m / s. */
function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <input
        className="field__input"
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(clamp(Number(e.target.value) || 0, min, max))}
      />
    </label>
  )
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className={`toggle${checked ? ' toggle--on' : ''}`}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle__track">
        <span className="toggle__knob" />
      </span>
      <span className="toggle__text">
        {label}
        {hint && <em>{hint}</em>}
      </span>
    </label>
  )
}

export default function ControlApp() {
  const api = window.dejavuAPI

  const [tick, setTick] = useState<TimerTick>(INITIAL_TICK)
  const [settings, setSettings] = useState<TimerSettings>(DEFAULT_SETTINGS)
  const [displays, setDisplays] = useState<DisplayInfo[]>([])
  const [selectedDisplay, setSelectedDisplay] = useState<number | null>(null)
  const [projection, setProjection] = useState<{ open: boolean; displayId: number | null }>({
    open: false,
    displayId: null,
  })

  useEffect(() => {
    const offTick = api.onTick(setTick)
    const offSettings = api.onSettings(setSettings)
    const offProjection = api.onProjectionState(setProjection)
    api.requestState()
    api.listDisplays().then(list => {
      setDisplays(list)
      setSelectedDisplay(prev => prev ?? (list.find(d => !d.isPrimary) ?? list[0])?.id ?? null)
    })
    return () => {
      offTick()
      offSettings()
      offProjection()
    }
  }, [api])

  // Atajos de escenario: espacio arranca/pausa, R rebobina.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return
      if (e.code === 'Space') {
        e.preventDefault()
        if (tick.phase === 'running' || tick.phase === 'rewinding') api.pause()
        else api.start()
      } else if (e.key.toLowerCase() === 'r') {
        api.rewind()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [api, tick.phase])

  const patch = useCallback((update: Partial<TimerSettings>) => api.updateSettings(update), [api])

  /*
   * El input del punto de vista tiene borrador local: si se pintara directo
   * desde `settings`, cada tecla esperaría el viaje de ida y vuelta por IPC.
   * Sólo se resincroniza cuando el campo no tiene el foco.
   */
  const viewpointRef = useRef<HTMLInputElement>(null)
  const [viewpointDraft, setViewpointDraft] = useState(settings.viewpointText)
  useEffect(() => {
    if (document.activeElement !== viewpointRef.current) setViewpointDraft(settings.viewpointText)
  }, [settings.viewpointText])

  const duration = useMemo(() => splitDuration(settings.durationMs), [settings.durationMs])
  const setDuration = (h: number, m: number, s: number) => patch({ durationMs: joinDuration(h, m, s) })

  const running = tick.phase === 'running' || tick.phase === 'rewinding'
  // La vista previa usa la misma interpolación y las mismas reglas que la proyección.
  const remainingMs = useSmoothRemaining(tick, settings.durationMs)
  const view = clockView(remainingMs, tick.phase, settings)
  const alertDuration = useMemo(() => splitDuration(settings.alertAtMs), [settings.alertAtMs])
  const progress = settings.durationMs > 0 ? clamp(remainingMs / settings.durationMs, 0, 1) : 0

  return (
    <div className="app">
      <header className="header">
        <div className="header__brand">
          <span className="header__mark">◀◀</span>
          <div>
            <h1>DejaVu</h1>
            <p>Temporizador con rebobinado</p>
          </div>
        </div>
        <div className={`chip chip--${tick.phase}`}>{PHASE_LABEL[tick.phase]}</div>
      </header>

      <main className="layout">
        {/* ----- Vista previa ------------------------------------------- */}
        <section className="preview">
          <div className={`preview__screen preview__screen--${tick.phase}`}>
            <div
              className={`preview__clock${view.pulsing ? ' preview__clock--alert' : ''}`}
              style={{
                color: view.color,
                ...(view.pulsing ? { animationDuration: `${view.pulseSeconds}s` } : {}),
              }}
            >
              {view.main}
              {view.frac && <span className="preview__frac">{view.frac}</span>}
            </div>
            {settings.showViewpoint && settings.viewpointText.trim() && (
              <div className="preview__viewpoint">
                <span>Punto de vista:</span> {settings.viewpointText.trim()}
              </div>
            )}
            {tick.phase === 'rewinding' && <div className="preview__rewind">◀◀</div>}
          </div>

          <div className="preview__bar">
            <div className="preview__fill" style={{ width: `${progress * 100}%` }} />
          </div>

          <div className="preview__meta">
            <span>Duración {formatTime(settings.durationMs, 0)}</span>
            <span>Rebobinado {(settings.rewindMs / 1000).toFixed(1)} s</span>
            <span>Vueltas {tick.laps}</span>
          </div>

          <div className="transport">
            <button className="btn btn--primary" onClick={() => (running ? api.pause() : api.start())}>
              {running ? <Pause size={18} /> : <Play size={18} />}
              {running ? 'Pausar' : 'Iniciar'}
            </button>
            <button className="btn" onClick={() => api.rewind()} disabled={tick.phase === 'rewinding'}>
              <Rewind size={16} /> Rebobinar
            </button>
            <button className="btn" onClick={() => api.reset()}>
              <RotateCcw size={16} /> Reiniciar
            </button>
          </div>
          <p className="hint">
            Espacio inicia o pausa · <kbd>R</kbd> rebobina
          </p>
        </section>

        {/* ----- Controles ---------------------------------------------- */}
        <section className="controls">
          <div className="card">
            <h2>Duración</h2>
            <div className="row">
              <NumberField label="h" value={duration.hours} min={0} max={23} onChange={v => setDuration(v, duration.minutes, duration.seconds)} />
              <NumberField label="min" value={duration.minutes} min={0} max={59} onChange={v => setDuration(duration.hours, v, duration.seconds)} />
              <NumberField label="seg" value={duration.seconds} min={0} max={59} onChange={v => setDuration(duration.hours, duration.minutes, v)} />
            </div>
            <div className="presets">
              {PRESETS_MIN.map(min => (
                <button
                  key={min}
                  className={`preset${settings.durationMs === min * 60_000 ? ' preset--active' : ''}`}
                  onClick={() => patch({ durationMs: min * 60_000 })}
                >
                  {min} min
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>Rebobinado</h2>
            <p className="card__note">Cuánto tarda el reloj en volver del cero a la duración completa.</p>
            <div className="slider">
              <input
                type="range"
                min={LIMITS.rewindMs.min}
                max={15_000}
                step={100}
                value={clamp(settings.rewindMs, LIMITS.rewindMs.min, 15_000)}
                onChange={e => patch({ rewindMs: Number(e.target.value) })}
              />
              <input
                className="slider__value"
                type="number"
                min={LIMITS.rewindMs.min / 1000}
                max={LIMITS.rewindMs.max / 1000}
                step={0.1}
                value={(settings.rewindMs / 1000).toFixed(1)}
                onChange={e => patch({ rewindMs: (Number(e.target.value) || 0) * 1000 })}
              />
              <span className="slider__unit">s</span>
            </div>
          </div>

          <div className="card">
            <h2>Comportamiento</h2>
            <Toggle
              label="Bucle"
              hint="Al terminar el rebobinado vuelve a contar"
              checked={settings.loop}
              onChange={loop => patch({ loop })}
            />
            <Toggle
              label="Décimas de segundo"
              checked={settings.showTenths}
              onChange={showTenths => patch({ showTenths })}
            />
            <Toggle
              label="Milisegundos al final"
              hint={`En los últimos ${MILLIS_THRESHOLD_MS / 1000} segundos`}
              checked={settings.showMillis}
              onChange={showMillis => patch({ showMillis })}
            />
            <div className="slider slider--labeled">
              <span className="slider__label">Tamaño de los dígitos</span>
              <input
                type="range"
                min={LIMITS.digitScale.min}
                max={LIMITS.digitScale.max}
                step={0.05}
                value={settings.digitScale}
                onChange={e => patch({ digitScale: Number(e.target.value) })}
              />
              <span className="slider__unit">{Math.round(settings.digitScale * 100)}%</span>
            </div>
          </div>

          <div className="card">
            <h2>Aviso de tiempo</h2>
            <Toggle
              label="Teñir los dígitos"
              hint="Del blanco al naranja y al rojo según se acerca el cero"
              checked={settings.alertTint}
              onChange={alertTint => patch({ alertTint })}
            />
            <Toggle
              label="Hacer latir los dígitos"
              hint="El latido se acelera al acercarse al cero"
              checked={settings.alertPulse}
              onChange={alertPulse => patch({ alertPulse })}
            />
            <p className="card__note card__note--after">
              Ambos arrancan cuando quede este tiempo:
            </p>
            <div className="row">
              <NumberField
                label="min"
                value={alertDuration.minutes}
                min={0}
                max={59}
                onChange={v => patch({ alertAtMs: joinDuration(0, v, alertDuration.seconds) })}
              />
              <NumberField
                label="seg"
                value={alertDuration.seconds}
                min={0}
                max={59}
                onChange={v => patch({ alertAtMs: joinDuration(0, alertDuration.minutes, v) })}
              />
            </div>
            <div className="presets">
              {ALERT_PRESETS_S.map(secs => (
                <button
                  key={secs}
                  className={`preset${settings.alertAtMs === secs * 1000 ? ' preset--active' : ''}`}
                  onClick={() => patch({ alertAtMs: secs * 1000 })}
                >
                  <Flame size={11} /> {secs < 60 ? `${secs} s` : `${secs / 60} min`}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>Punto de vista</h2>
            <Toggle
              label="Mostrar sobre el reloj"
              checked={settings.showViewpoint}
              onChange={showViewpoint => patch({ showViewpoint })}
            />
            <div className="prefixed">
              <span className="prefixed__label">
                <Eye size={13} /> Punto de vista:
              </span>
              <input
                ref={viewpointRef}
                className="prefixed__input"
                type="text"
                maxLength={LIMITS.viewpointText.maxLength}
                placeholder="Texto a mostrar"
                value={viewpointDraft}
                onChange={e => {
                  setViewpointDraft(e.target.value)
                  patch({ viewpointText: e.target.value })
                }}
              />
            </div>
          </div>

          <div className="card">
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
            </div>
            <div className="row">
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

          {settings.loop && (
            <p className="loop-note">
              <Repeat size={13} /> El ciclo se repite hasta que pauses o reinicies.
            </p>
          )}
        </section>
      </main>
    </div>
  )
}
