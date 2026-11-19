/**
 * El estado del show en la web. Vive en la ventana del panel de control y hace
 * lo mismo que main.ts en Electron: aplica cada mensaje, guarda los ajustes y
 * difunde el estado y los eventos a todas las ventanas.
 */
import type { SendChannel, SendMap, BroadcastChannel as Channel, BroadcastMap } from '../shared/ipc'
import type { AppState } from '../shared/types'
import { FINAL_AUDIO, PERSISTED_KEYS, SETTINGS_DEFAULTS, initialAppState, settingsFrom, type Settings } from '../shared/defaults'
import { readJson } from './backend'
import { closeProjection, openProjection } from './screens'

const SETTINGS_KEY = 'mision-improsible:ajustes'

export type Emit = <C extends Channel>(channel: C, payload: BroadcastMap[C]) => void

function loadSettings(published: Partial<Settings>): Settings {
  let saved: Partial<Settings> = {}
  try {
    saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}')
  } catch {
    // Ajustes corruptos: se usan los publicados.
  }
  return { ...SETTINGS_DEFAULTS, ...published, ...saved }
}

export async function createHub(emit: Emit) {
  // Los ajustes publicados con la web hacen de valores por defecto, como el
  // settings.json que trae el .exe.
  const published = await readJson<Partial<Settings>>('settings.json').catch(() => ({}))
  let state: AppState = initialAppState(loadSettings(published))

  const broadcastState = () => emit('state:update', state)
  const saveSettings = () => localStorage.setItem(SETTINGS_KEY, JSON.stringify(settingsFrom(state)))

  const handlers: { [C in SendChannel]: (payload: SendMap[C]) => void | Promise<void> } = {
    'state:get': () => broadcastState(),
    'appstate:update': update => {
      state = { ...state, ...update }
      broadcastState()
      if (PERSISTED_KEYS.some(k => k in update)) saveSettings()
    },
    'participant:score': ({ id, delta }) => {
      const p = state.participants.find(p => p.id === id)
      if (p) { p.score += delta; broadcastState() }
    },
    'participant:score-set': ({ id, value }) => {
      const p = state.participants.find(p => p.id === id)
      if (p) { p.score = value; broadcastState() }
    },
    'participant:update': participant => {
      const idx = state.participants.findIndex(p => p.id === participant.id)
      if (idx !== -1) { state.participants[idx] = participant; broadcastState() }
    },
    'display:set': displayId => openProjection(displayId),
    'window:close-projection': () => closeProjection(),
    'objective:announce': p => emit('objective:announce', p),
    'mission:announce': p => emit('mission:announce', p),
    'rating:show': r => emit('rating:show', r),
    'rating:clear': () => emit('rating:clear', undefined),
    'roulette:start': p => emit('roulette:start', p),
    'improsible:start': ({ finalistIds }) => {
      state = { ...state, improsibleFinalists: finalistIds }
      emit('improsible:start', { finalistIds, audioPath: FINAL_AUDIO })
    },
    'improsible:final-start': p => {
      state = { ...state, improsibleWinner: p.winnerId }
      emit('improsible:final-start', p)
    },
    'improsible:clear': () => {
      state = { ...state, improsibleFinalists: null, improsibleWinner: null }
      emit('improsible:clear', undefined)
    },
    // La intro arranca con la cortinilla quieta, como en main.ts.
    'intro:start': async () => {
      state = { ...state, curtain: true, curtainFlipEnabled: false, curtainPulseEnabled: false, curtainWobbleEnabled: false }
      broadcastState()
      const sounds = await readJson<Record<string, string | null>>('sounds.json')
      emit('intro:start', { audioPath: sounds.intro ?? null })
    },
    'intro:stop': () => emit('intro:stop', undefined),
    'update:install': () => undefined,
    'update:open-page': () => undefined,
  }

  return {
    send<C extends SendChannel>(channel: C, payload: SendMap[C]) {
      return handlers[channel](payload)
    },
    setParticipantPhoto(participantId: string, path: string) {
      const p = state.participants.find(p => p.id === participantId)
      if (p) { p.photoPath = path; broadcastState() }
    },
    bumpLogo() {
      state = { ...state, logoVersion: (state.logoVersion ?? 0) + 1 }
      broadcastState()
    },
  }
}

export type Hub = Awaited<ReturnType<typeof createHub>>
