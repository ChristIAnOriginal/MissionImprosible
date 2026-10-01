import React, { useState } from 'react'
import { Check, Pencil, Save, Trash2, X } from 'lucide-react'
import {
  LOOK_LABELS,
  PRESET_NAME_MAX,
  sanitizeValues,
  type AnimationMeta,
  type Look,
  type ParamValues,
  type Preset,
  type TransitionMeta,
} from '../../shared/types'

type Api = Window['hunaAPI']

/**
 * Configuraciones guardadas de la escena seleccionada: se guardan con nombre,
 * se aplican con un clic y se pueden sobrescribir, renombrar o borrar.
 *
 * Se marca la que coincide con lo que se ve ahora (mismos valores y, si la
 * escena tiene varios estilos, mismo estilo).
 */
export function Presets({
  meta,
  values,
  look,
  presets,
  api,
}: {
  meta: AnimationMeta | TransitionMeta
  values: ParamValues
  look: Look
  presets: Preset[]
  api: Api
}) {
  const [name, setName] = useState('')
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const save = () => {
    api.savePreset(meta.id, name)
    setName('')
  }

  const matches = (p: Preset) => {
    const saved = sanitizeValues(meta, p.values)
    const sameValues = meta.params.every(spec => saved[spec.key] === values[spec.key])
    return sameValues && (!p.look || p.look === look)
  }

  return (
    <div className="plate presets">
      <h2>Configuraciones guardadas</h2>

      <form
        className="presets__new"
        onSubmit={e => {
          e.preventDefault()
          save()
        }}
      >
        <input
          className="param__text"
          placeholder={`Configuración ${presets.length + 1}`}
          maxLength={PRESET_NAME_MAX}
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <button className="btn btn--primary" type="submit" title="Guardar los valores actuales">
          <Save size={15} /> Guardar
        </button>
      </form>

      {presets.length === 0 ? (
        <p className="empty">Aún no hay configuraciones. Ajusta los parámetros y guárdalos con un nombre.</p>
      ) : (
        <ul className="presets__list">
          {presets.map(p => {
            const active = matches(p)
            if (renaming?.id === p.id) {
              return (
                <li key={p.id} className="preset preset--editing">
                  <form
                    className="presets__new"
                    onSubmit={e => {
                      e.preventDefault()
                      api.renamePreset(meta.id, p.id, renaming.name)
                      setRenaming(null)
                    }}
                  >
                    <input
                      className="param__text"
                      autoFocus
                      maxLength={PRESET_NAME_MAX}
                      value={renaming.name}
                      onChange={e => setRenaming({ id: p.id, name: e.target.value })}
                      onKeyDown={e => e.key === 'Escape' && setRenaming(null)}
                    />
                    <button className="iconbtn" type="submit" title="Guardar nombre">
                      <Check size={15} />
                    </button>
                    <button className="iconbtn" type="button" title="Cancelar" onClick={() => setRenaming(null)}>
                      <X size={15} />
                    </button>
                  </form>
                </li>
              )
            }
            return (
              <li key={p.id} className={`preset${active ? ' preset--active' : ''}`}>
                <button className="preset__apply" type="button" onClick={() => api.applyPreset(meta.id, p.id)} title="Aplicar">
                  <b>{p.name}</b>
                  {p.look && <span className="card__tag">{LOOK_LABELS[p.look]}</span>}
                  {active && <em>En uso</em>}
                </button>
                {confirmDelete === p.id ? (
                  <>
                    <button
                      className="iconbtn iconbtn--danger"
                      type="button"
                      title="Confirmar borrado"
                      onClick={() => {
                        api.deletePreset(meta.id, p.id)
                        setConfirmDelete(null)
                      }}
                    >
                      <Check size={15} />
                    </button>
                    <button className="iconbtn" type="button" title="No borrar" onClick={() => setConfirmDelete(null)}>
                      <X size={15} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="iconbtn"
                      type="button"
                      title="Sobrescribir con los valores actuales"
                      onClick={() => api.overwritePreset(meta.id, p.id)}
                    >
                      <Save size={15} />
                    </button>
                    <button className="iconbtn" type="button" title="Renombrar" onClick={() => setRenaming({ id: p.id, name: p.name })}>
                      <Pencil size={15} />
                    </button>
                    <button className="iconbtn" type="button" title="Borrar" onClick={() => setConfirmDelete(p.id)}>
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
