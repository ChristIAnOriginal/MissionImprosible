import React, { useEffect, useRef, useState } from 'react'
import { SWATCHES } from '../../shared/palette'
import type { ParamSpec, ParamValue } from '../../shared/types'
import { OPTION_PREVIEWS } from './optionPreviews'

/**
 * Un mando por parámetro, construido a partir de su ficha. Ninguna animación
 * escribe interfaz de control: si necesita un mando nuevo, se añade un `kind`
 * aquí y en `ParamSpec`.
 */
export function ParamField({
  spec,
  value,
  onChange,
}: {
  spec: ParamSpec
  value: ParamValue
  onChange: (value: ParamValue) => void
}) {
  // Un select con juego de miniaturas se pinta como cuadros con imagen.
  const preview = spec.kind === 'select' && spec.preview ? OPTION_PREVIEWS[spec.preview] : undefined

  return (
    <div className="param">
      <div className="param__head">
        <span className="param__label">{spec.label}</span>
        {spec.kind === 'number' && (
          <span className="param__value">
            {formatNumber(value as number, spec.step)}
            {spec.unit ?? ''}
          </span>
        )}
      </div>

      {spec.kind === 'number' && (
        <input
          className="param__range"
          type="range"
          min={spec.min}
          max={spec.max}
          step={spec.step}
          value={value as number}
          onChange={e => onChange(Number(e.target.value))}
        />
      )}

      {spec.kind === 'boolean' && spec.button && (
        <button className="btn btn--primary" type="button" onClick={() => onChange(!value)}>
          {value ? spec.button.toFalse : spec.button.toTrue}
        </button>
      )}

      {spec.kind === 'boolean' && !spec.button && (
        <button
          className={`switch${value ? ' switch--on' : ''}`}
          onClick={() => onChange(!value)}
          type="button"
        >
          <span className="switch__track">
            <span className="switch__knob" />
          </span>
          <span className="switch__state">{value ? 'Sí' : 'No'}</span>
        </button>
      )}

      {spec.kind === 'color' && (
        <ColorField value={value as string} onChange={onChange} />
      )}

      {spec.kind === 'select' && preview && (
        <div className="tiles">
          {spec.options.map(o => (
            <button
              key={o.value}
              type="button"
              className={`tile${value === o.value ? ' tile--active' : ''}`}
              onClick={() => onChange(o.value)}
            >
              <svg viewBox="0 0 100 100" className="tile__img" aria-hidden>
                {preview(o.value)}
              </svg>
              <span>{o.label}</span>
            </button>
          ))}
        </div>
      )}

      {spec.kind === 'select' && !preview && (
        <div className="chips">
          {spec.options.map(o => (
            <button
              key={o.value}
              type="button"
              className={`chip${value === o.value ? ' chip--active' : ''}`}
              onClick={() => onChange(o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      {spec.kind === 'text' && (
        <TextField value={value as string} maxLength={spec.maxLength} onChange={onChange} />
      )}

      {spec.hint && <p className="param__hint">{spec.hint}</p>}
    </div>
  )
}

function formatNumber(n: number, step: number) {
  const decimals = step < 1 ? String(step).split('.')[1]?.length ?? 1 : 0
  return n.toFixed(decimals)
}

/** Muestras de la paleta más un selector libre, por si hace falta otro tono. */
function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="colors">
      {SWATCHES.map(s => (
        <button
          key={s.value}
          type="button"
          title={s.label}
          aria-label={s.label}
          className={`swatch${value.toLowerCase() === s.value.toLowerCase() ? ' swatch--active' : ''}`}
          style={{ background: s.value }}
          onClick={() => onChange(s.value)}
        />
      ))}
      <label className="swatch swatch--custom" title="Otro color">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} />
        <span style={{ background: value }} />
      </label>
    </div>
  )
}

/**
 * Borrador local: escribir no puede esperar al viaje de ida y vuelta por IPC.
 * Sólo se resincroniza cuando el campo no tiene el foco.
 */
function TextField({
  value,
  maxLength,
  onChange,
}: {
  value: string
  maxLength?: number
  onChange: (v: string) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    if (document.activeElement !== ref.current) setDraft(value)
  }, [value])

  return (
    <input
      ref={ref}
      className="param__text"
      type="text"
      maxLength={maxLength}
      value={draft}
      onChange={e => {
        setDraft(e.target.value)
        onChange(e.target.value)
      }}
    />
  )
}
