import { app, BrowserWindow, ipcMain, screen } from 'electron'
import * as path from 'path'
import { findAnimation, findTransition } from '../shared/animations'
import {
  GENERIC_TRANSITION_ID,
  LOOKS,
  PRESET_NAME_MAX,
  SPEED_LIMITS,
  ShowState,
  sanitizeValues,
  transitionDuration,
  type Cue,
  type Guion,
  type Preset,
} from '../shared/types'
import { GUION_NAME_MAX, loadState, normalizeGuion, saveState } from './store'
import { handleSend, handleInvoke, broadcastIpc } from '../shared/ipc'

let controlWindow: BrowserWindow | null = null
let projectionWindow: BrowserWindow | null = null
let projectionDisplayId: number | null = null

let state: ShowState

/**
 * El reloj de la transición vive aquí, no en los renderers: hay dos ventanas y
 * sólo puede haber una fuente de verdad sobre cuándo termina y se cambia de
 * animación. Las transiciones corren a tiempo real, al margen del multiplicador
 * de velocidad, porque tienen su propia duración como parámetro.
 */
let transitionTimer: ReturnType<typeof setTimeout> | null = null

function allWindows() {
  return [controlWindow, projectionWindow]
}

function broadcastState() {
  broadcastIpc(allWindows(), 'show:state', state)
}

function broadcastProjectionState() {
  broadcastIpc(allWindows(), 'projection:state', {
    open: projectionWindow !== null,
    displayId: projectionDisplayId,
  })
}

/** Aplica un cambio, avisa a las ventanas y persiste. */
function commit(next: ShowState) {
  state = next
  broadcastState()
  saveState(state)
}

function createControlWindow() {
  controlWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1040,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Es un programa de show: tapado por otra ventana tiene que seguir a su
      // ritmo, no al que Chromium reserva para pestañas de fondo.
      backgroundThrottling: false,
    },
    title: 'Había una vez — Panel',
    backgroundColor: '#eef1f5',
  })
  controlWindow.loadFile(path.join(__dirname, '../renderer/control/index.html'))
  controlWindow.on('closed', () => {
    controlWindow = null
    app.quit()
  })
}

function createProjectionWindow(displayId?: number) {
  const displays = screen.getAllDisplays()
  let target = displays[0]
  if (displayId !== undefined) {
    const found = displays.find(d => d.id === displayId)
    if (found) target = found
  } else if (displays.length > 1) {
    target = displays[1]
  }

  if (projectionWindow) {
    projectionWindow.removeAllListeners('closed')
    projectionWindow.destroy()
    projectionWindow = null
  }

  projectionWindow = new BrowserWindow({
    x: target.bounds.x,
    y: target.bounds.y,
    width: target.bounds.width,
    height: target.bounds.height,
    fullscreen: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Es un programa de show: tapado por otra ventana tiene que seguir a su
      // ritmo, no al que Chromium reserva para pestañas de fondo.
      backgroundThrottling: false,
    },
    title: 'Había una vez',
    backgroundColor: '#141b26',
  })
  projectionDisplayId = target.id
  projectionWindow.loadFile(path.join(__dirname, '../renderer/projection/index.html'))
  projectionWindow.once('ready-to-show', () => {
    broadcastState()
    broadcastProjectionState()
  })
  projectionWindow.on('closed', () => {
    projectionWindow = null
    projectionDisplayId = null
    broadcastProjectionState()
  })
  broadcastProjectionState()
}

app.whenReady().then(() => {
  state = loadState()
  createControlWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

function clearTransitionTimer() {
  if (transitionTimer !== null) {
    clearTimeout(transitionTimer)
    transitionTimer = null
  }
}

/** Milisegundos ya corridos de la transición en curso. */
function transitionElapsed(): number {
  const run = state.running
  if (!run) return 0
  return run.elapsedMs + (run.startedAt === null ? 0 : Date.now() - run.startedAt)
}

/** Programa el final de la transición con lo que le queda. */
function armTransitionTimer() {
  clearTransitionTimer()
  const run = state.running
  if (!run || run.startedAt === null) return
  const meta = findTransition(run.id)
  if (!meta) return
  const remaining = transitionDuration(meta, state.values[run.id]) - transitionElapsed()
  transitionTimer = setTimeout(finishTransition, Math.max(0, remaining))
}

/**
 * Al terminar, y sólo entonces, queda activa la animación de destino, con la
 * configuración que traiga del guion. La cola se vacía: lo que era «siguiente»
 * pasa a ser la animación en curso. En modo guion, la cola pasa al paso
 * siguiente.
 */
function finishTransition() {
  clearTransitionTimer()
  const run = state.running
  if (!run) return
  const values = run.toValues ? { ...state.values, [run.to]: run.toValues } : state.values
  const inGuion = run.step !== undefined && state.guion.step !== null
  const step = inGuion ? run.step! : state.guion.step
  commit({
    ...state,
    activeId: findAnimation(run.to) ? run.to : state.activeId,
    values,
    look: run.toLook ?? state.look,
    running: null,
    cue: inGuion ? guionCue(currentGuion(), step!) : { transitionId: null, nextId: null },
    guion: { ...state.guion, step },
    arrival: run.id,
    epoch: state.epoch + 1,
  })
}

// ----- Guion ------------------------------------------------------------------

function currentGuion(): Guion | undefined {
  return state.guiones.find(g => g.id === state.guion.id)
}

/** Valores y estilo de una configuración guardada, si existe. */
function presetOf(sceneId: string, presetId: string | null) {
  const meta = sceneMeta(sceneId)
  const preset = presetId ? state.presets[sceneId]?.find(p => p.id === presetId) : undefined
  if (!meta || !preset) return null
  return { values: sanitizeValues(meta, preset.values), look: preset.look }
}

/** La cola que arma el guion desde un paso: la transición y la animación del siguiente. */
function guionCue(guion: Guion | undefined, step: number): Cue {
  const next = guion?.steps[step + 1]
  if (!next) return { transitionId: null, nextId: null }
  return { transitionId: next.transitionId ?? GENERIC_TRANSITION_ID, nextId: next.animationId }
}

/** Corta a un paso del guion, con su configuración, y deja preparado el siguiente. */
function goToStep(step: number) {
  const guion = currentGuion()
  const target = guion?.steps[step]
  if (!guion || !target) return
  clearTransitionTimer()
  const preset = presetOf(target.animationId, target.animationPresetId)
  commit({
    ...state,
    activeId: target.animationId,
    values: preset ? { ...state.values, [target.animationId]: preset.values } : state.values,
    look: preset?.look ?? state.look,
    running: null,
    arrival: null,
    cue: guionCue(guion, step),
    guion: { ...state.guion, step },
    epoch: state.epoch + 1,
  })
}

/** Lanza la transición hacia el paso siguiente. */
function guionNext() {
  const guion = currentGuion()
  const step = state.guion.step
  if (state.running || !guion || step === null) return
  const next = guion.steps[step + 1]
  if (!next) return
  const transitionId = next.transitionId ?? GENERIC_TRANSITION_ID
  if (!findTransition(transitionId) || !findAnimation(next.animationId)) return
  const tPreset = next.transitionId ? presetOf(transitionId, next.transitionPresetId) : null
  const aPreset = presetOf(next.animationId, next.animationPresetId)
  clearTransitionTimer()
  commit({
    ...state,
    playing: true,
    values: tPreset ? { ...state.values, [transitionId]: tPreset.values } : state.values,
    running: {
      id: transitionId,
      to: next.animationId,
      startedAt: Date.now(),
      elapsedMs: 0,
      toValues: aPreset?.values,
      toLook: aPreset?.look,
      step: step + 1,
    },
    arrival: null,
  })
  armTransitionTimer()
}

function guionUid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

handleSend(ipcMain, 'guion:create', ({ name }) => {
  const guion: Guion = {
    id: guionUid(),
    name: String(name ?? '').trim().slice(0, GUION_NAME_MAX) || `Guion ${state.guiones.length + 1}`,
    // Arranca con lo que está en pantalla como primer paso.
    steps: [
      { id: guionUid(), animationId: state.activeId, animationPresetId: null, transitionId: null, transitionPresetId: null },
    ],
  }
  commit({ ...state, guiones: [...state.guiones, guion], guion: { id: guion.id, step: null } })
})

handleSend(ipcMain, 'guion:save', ({ guion: raw }) => {
  const guion = normalizeGuion(raw, state.presets)
  if (!guion || !state.guiones.some(g => g.id === guion.id)) return
  const guiones = state.guiones.map(g => (g.id === guion.id ? guion : g))
  let { step } = state.guion
  let cue = state.cue
  if (state.guion.id === guion.id && step !== null) {
    // Si el paso en curso ya no existe, se sale del modo guion.
    if (step >= guion.steps.length) step = null
    else if (!state.running) cue = guionCue(guion, step)
  }
  commit({ ...state, guiones, guion: { ...state.guion, step }, cue })
})

handleSend(ipcMain, 'guion:delete', ({ id }) => {
  const guiones = state.guiones.filter(g => g.id !== id)
  const guion = state.guion.id === id ? { id: null, step: null } : state.guion
  commit({ ...state, guiones, guion })
})

handleSend(ipcMain, 'guion:select', ({ id }) => {
  if (state.guion.step !== null) return
  if (id !== null && !state.guiones.some(g => g.id === id)) return
  commit({ ...state, guion: { id, step: null } })
})

handleSend(ipcMain, 'guion:start', ({ step }) => goToStep(step))
handleSend(ipcMain, 'guion:next', () => guionNext())

handleSend(ipcMain, 'guion:stop', () => {
  if (state.guion.step === null) return
  commit({ ...state, guion: { ...state.guion, step: null } })
})

handleSend(ipcMain, 'state:get', () => {
  broadcastState()
  broadcastProjectionState()
})

handleSend(ipcMain, 'show:set-active', ({ id }) => {
  if (!findAnimation(id)) return
  if (id === state.activeId && !state.running) return
  // Saltar a una animación aborta la transición que hubiera en curso y saca
  // del modo guion.
  clearTransitionTimer()
  commit({
    ...state,
    activeId: id,
    running: null,
    arrival: null,
    guion: { ...state.guion, step: null },
    epoch: state.epoch + 1,
  })
})

handleSend(ipcMain, 'show:set-cue', patch => {
  // La cola no se toca mientras corre la transición que salió de ella, ni
  // cuando la arma el guion.
  if (state.running || state.guion.step !== null) return
  const cue = { ...state.cue }
  if (patch.transitionId !== undefined) {
    cue.transitionId = patch.transitionId && findTransition(patch.transitionId) ? patch.transitionId : null
  }
  if (patch.nextId !== undefined) {
    cue.nextId = patch.nextId && findAnimation(patch.nextId) ? patch.nextId : null
  }
  commit({ ...state, cue })
})

handleSend(ipcMain, 'show:play-cue', () => {
  if (state.guion.step !== null) return guionNext()
  const { transitionId, nextId } = state.cue
  if (state.running || !transitionId || !nextId) return
  if (!findTransition(transitionId) || !findAnimation(nextId)) return
  clearTransitionTimer()
  commit({
    ...state,
    playing: true,
    running: { id: transitionId, to: nextId, startedAt: Date.now(), elapsedMs: 0 },
    arrival: null,
  })
  armTransitionTimer()
})

handleSend(ipcMain, 'show:cancel-transition', () => {
  if (!state.running) return
  clearTransitionTimer()
  commit({ ...state, running: null })
})

handleSend(ipcMain, 'show:set-look', ({ look }) => {
  if (!LOOKS.includes(look) || look === state.look) return
  commit({ ...state, look })
})

handleSend(ipcMain, 'show:set-playing', ({ playing }) => {
  const next = !!playing
  if (next === state.playing) return
  // En pausa, el reloj de la transición se congela con el de las ventanas.
  let running = state.running
  if (running) {
    running = next
      ? { ...running, startedAt: Date.now() }
      : { ...running, startedAt: null, elapsedMs: transitionElapsed() }
  }
  commit({ ...state, playing: next, running })
  armTransitionTimer()
})

handleSend(ipcMain, 'show:set-speed', ({ speed }) => {
  const clamped = Math.min(SPEED_LIMITS.max, Math.max(SPEED_LIMITS.min, speed))
  commit({ ...state, speed: clamped })
})

handleSend(ipcMain, 'show:restart', () => {
  const running = state.running
    ? { ...state.running, startedAt: state.playing ? Date.now() : null, elapsedMs: 0 }
    : null
  // Reiniciar la animación de destino no repite el destello de llegada.
  commit({ ...state, running, arrival: running ? state.arrival : null, epoch: state.epoch + 1 })
  armTransitionTimer()
})

handleSend(ipcMain, 'show:set-param', ({ id, key, value }) => {
  const meta = findAnimation(id) ?? findTransition(id)
  if (!meta || !meta.params.some(p => p.key === key)) return
  // Se revalida la ficha entera: un valor fuera de rango nunca se guarda.
  const values = sanitizeValues(meta, { ...state.values[id], [key]: value })
  commit({ ...state, values: { ...state.values, [id]: values } })
  // Tocar la duración de la transición en marcha recoloca su final.
  if (state.running?.id === id) armTransitionTimer()
})

// ----- Configuraciones guardadas --------------------------------------------

function sceneMeta(id: string) {
  return findAnimation(id) ?? findTransition(id)
}

/** El estilo sólo se guarda si la escena tiene más de uno. */
function lookFor(sceneId: string) {
  return findAnimation(sceneId)?.looks?.length ? state.look : undefined
}

/**
 * Identificador de una configuración. No usa `crypto`: el main se empaqueta con
 * Vite, que deja los módulos de Node como vacíos y `randomUUID` no existiría.
 */
function presetId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function cleanName(name: string, fallback: string) {
  const trimmed = String(name ?? '').trim().slice(0, PRESET_NAME_MAX)
  return trimmed || fallback
}

function withPresets(sceneId: string, update: (list: Preset[]) => Preset[]) {
  const list = update(state.presets[sceneId] ?? [])
  commit({ ...state, presets: { ...state.presets, [sceneId]: list } })
}

handleSend(ipcMain, 'preset:save', ({ sceneId, name }) => {
  const meta = sceneMeta(sceneId)
  if (!meta) return
  const list = state.presets[sceneId] ?? []
  const preset: Preset = {
    id: presetId(),
    name: cleanName(name, `Configuración ${list.length + 1}`),
    values: sanitizeValues(meta, state.values[sceneId]),
    look: lookFor(sceneId),
    savedAt: Date.now(),
  }
  withPresets(sceneId, l => [...l, preset])
})

handleSend(ipcMain, 'preset:apply', ({ sceneId, presetId }) => {
  const meta = sceneMeta(sceneId)
  const preset = state.presets[sceneId]?.find(p => p.id === presetId)
  if (!meta || !preset) return
  // Se revalida contra la ficha actual: un parámetro que cambió o ya no
  // existe cae a su valor por defecto en vez de romper la escena.
  const values = { ...state.values, [sceneId]: sanitizeValues(meta, preset.values) }
  const look = preset.look && LOOKS.includes(preset.look) ? preset.look : state.look
  commit({ ...state, values, look })
  if (state.running?.id === sceneId) armTransitionTimer()
})

handleSend(ipcMain, 'preset:overwrite', ({ sceneId, presetId }) => {
  const meta = sceneMeta(sceneId)
  if (!meta) return
  withPresets(sceneId, l =>
    l.map(p =>
      p.id === presetId
        ? { ...p, values: sanitizeValues(meta, state.values[sceneId]), look: lookFor(sceneId), savedAt: Date.now() }
        : p
    )
  )
})

handleSend(ipcMain, 'preset:rename', ({ sceneId, presetId, name }) => {
  withPresets(sceneId, l => l.map(p => (p.id === presetId ? { ...p, name: cleanName(name, p.name) } : p)))
})

handleSend(ipcMain, 'preset:delete', ({ sceneId, presetId }) => {
  withPresets(sceneId, l => l.filter(p => p.id !== presetId))
})

handleSend(ipcMain, 'show:reset-params', ({ id }) => {
  const meta = findAnimation(id) ?? findTransition(id)
  if (!meta) return
  commit({ ...state, values: { ...state.values, [id]: sanitizeValues(meta, undefined) } })
})

handleInvoke(ipcMain, 'display:list', () =>
  screen.getAllDisplays().map(d => ({
    id: d.id,
    label: `${d.bounds.width}×${d.bounds.height} (${d.bounds.x}, ${d.bounds.y})`,
    isPrimary: d.id === screen.getPrimaryDisplay().id,
  }))
)

handleSend(ipcMain, 'display:set', displayId => createProjectionWindow(displayId))
handleSend(ipcMain, 'projection:close', () => {
  if (projectionWindow) projectionWindow.close()
})
