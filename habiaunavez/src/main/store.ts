/**
 * Persistencia del estado del espectáculo en `userData/show.json`.
 * Los valores se guardan por animación, así cambiar de una a otra y volver
 * no pierde los ajustes.
 */
import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { ANIMATIONS, DEFAULT_ANIMATION_ID, TRANSITIONS, findAnimation, findTransition } from '../shared/animations'
import { LOOKS, PRESET_NAME_MAX, SPEED_LIMITS, ShowState, sanitizeValues, type Guion, type Preset } from '../shared/types'

function stateFile() {
  return path.join(app.getPath('userData'), 'show.json')
}

function freshState(): ShowState {
  return {
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
}

export const GUION_NAME_MAX = 40

/**
 * Deja un guion en pie contra el registro y las configuraciones actuales: se
 * caen los pasos de animaciones que ya no existen, y las transiciones o
 * configuraciones que ya no están pasan a «ninguna».
 */
export function normalizeGuion(raw: Partial<Guion> | null | undefined, presets: ShowState['presets']): Guion | null {
  if (!raw || typeof raw.id !== 'string') return null
  const has = (sceneId: string, id: unknown) =>
    typeof id === 'string' && (presets[sceneId] ?? []).some(p => p.id === id) ? id : null
  const steps: Guion['steps'] = []
  for (const s of Array.isArray(raw.steps) ? raw.steps : []) {
    if (!s || typeof s.id !== 'string' || !findAnimation(s.animationId)) continue
    const transitionId = s.transitionId && findTransition(s.transitionId) ? s.transitionId : null
    steps.push({
      id: s.id,
      animationId: s.animationId,
      animationPresetId: has(s.animationId, s.animationPresetId),
      transitionId,
      transitionPresetId: transitionId ? has(transitionId, s.transitionPresetId) : null,
    })
  }
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, GUION_NAME_MAX) : 'Guion'
  return { id: raw.id, name, steps }
}

/**
 * Configuraciones guardadas, revalidadas: se descartan las de escenas que ya
 * no existen y las entradas mal formadas; los valores se completan con la
 * ficha actual.
 */
function normalizePresets(raw: unknown): ShowState['presets'] {
  const out: ShowState['presets'] = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [sceneId, list] of Object.entries(raw as Record<string, unknown>)) {
    const meta = findAnimation(sceneId) ?? findTransition(sceneId)
    if (!meta || !Array.isArray(list)) continue
    const clean: Preset[] = []
    for (const p of list as Partial<Preset>[]) {
      if (!p || typeof p.id !== 'string' || typeof p.name !== 'string') continue
      clean.push({
        id: p.id,
        name: p.name.slice(0, PRESET_NAME_MAX),
        values: sanitizeValues(meta, p.values),
        look: p.look && LOOKS.includes(p.look) ? p.look : undefined,
        savedAt: typeof p.savedAt === 'number' ? p.savedAt : 0,
      })
    }
    if (clean.length) out[sceneId] = clean
  }
  return out
}

/**
 * Completa el estado guardado contra el registro actual: una animación que ya
 * no existe cae a la primera, y cada ficha aporta sus valores por defecto.
 */
export function normalizeState(raw: Partial<ShowState> | null): ShowState {
  const base = freshState()
  const activeId = raw?.activeId && findAnimation(raw.activeId) ? raw.activeId : base.activeId
  const values: ShowState['values'] = {}
  for (const meta of [...ANIMATIONS, ...TRANSITIONS]) {
    values[meta.id] = sanitizeValues(meta, raw?.values?.[meta.id])
  }
  const presets = normalizePresets(raw?.presets)
  const guiones = (Array.isArray(raw?.guiones) ? raw.guiones : [])
    .map(g => normalizeGuion(g, presets))
    .filter((g): g is Guion => g !== null)
  const guionId = raw?.guion?.id && guiones.some(g => g.id === raw.guion!.id) ? raw.guion.id : null
  const speed = typeof raw?.speed === 'number' && Number.isFinite(raw.speed) ? raw.speed : base.speed
  return {
    activeId,
    playing: typeof raw?.playing === 'boolean' ? raw.playing : base.playing,
    speed: Math.min(SPEED_LIMITS.max, Math.max(SPEED_LIMITS.min, speed)),
    epoch: 0,
    values,
    // Una transición a medias no sobrevive al cierre de la app.
    running: null,
    arrival: null,
    look: raw?.look && LOOKS.includes(raw.look) ? raw.look : base.look,
    presets,
    guiones,
    guion: {
      id: guionId,
      step:
        guionId && typeof raw?.guion?.step === 'number' && raw.guion.step >= 0 &&
        raw.guion.step < (guiones.find(g => g.id === guionId)?.steps.length ?? 0)
          ? raw.guion.step
          : null,
    },
    // Una ficha que ya no existe se cae de la cola.
    cue: {
      transitionId:
        raw?.cue?.transitionId && findTransition(raw.cue.transitionId) ? raw.cue.transitionId : null,
      nextId: raw?.cue?.nextId && findAnimation(raw.cue.nextId) ? raw.cue.nextId : null,
    },
  }
}

export function loadState(): ShowState {
  try {
    return normalizeState(JSON.parse(fs.readFileSync(stateFile(), 'utf-8')))
  } catch {
    return normalizeState(null)
  }
}

export function saveState(state: ShowState) {
  try {
    fs.mkdirSync(path.dirname(stateFile()), { recursive: true })
    // `epoch`, la transición en curso y el destello de llegada son de sesión: no se restauran.
    const { epoch: _epoch, running: _running, arrival: _arrival, ...persisted } = state
    fs.writeFileSync(stateFile(), JSON.stringify(persisted, null, 2))
  } catch {
    // Guardar ajustes nunca debe tumbar la app.
  }
}
