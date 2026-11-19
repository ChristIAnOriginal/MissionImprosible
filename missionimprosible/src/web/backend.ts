/**
 * Las peticiones con respuesta (invoke) de la versión web: lo que en Electron
 * resuelven main.ts y store.ts leyendo y escribiendo archivos. Los JSON editados
 * se guardan en IndexedDB; hasta entonces se leen los publicados con la web.
 */
import type { InvokeChannel, InvokeMap } from '../shared/ipc'
import { dbGet, dbSet } from './db'
import { dataUrl, deleteUserFile, hasUserFile, pickFile, saveUserFile } from './files'
import { listDisplays } from './screens'

const LOGO_ID = 'logo'

export async function readJson<T>(name: string): Promise<T> {
  const saved = await dbGet<T>(`json:${name}`)
  if (saved !== undefined) return saved
  const res = await fetch(dataUrl(name))
  if (!res.ok) throw new Error(`No se pudo cargar ${name} (${res.status})`)
  return (await res.json()) as T
}

const writeJson = (name: string, data: unknown) => dbSet(`json:${name}`, data)

const readText = async (relative: string) => (await fetch(dataUrl(relative))).text()

/** Lo que el backend necesita del resto: aplicar cambios de estado y avisar a las demás ventanas. */
export interface BackendContext {
  setParticipantPhoto: (participantId: string, path: string) => void
  bumpLogo: () => void
  fileChanged: (id: string) => void
}

type Handlers = {
  [C in InvokeChannel]: (payload: InvokeMap[C]['request']) => Promise<InvokeMap[C]['response']> | InvokeMap[C]['response']
}

export function createBackend(ctx: BackendContext): Handlers {
  const upload = async (accept: string, id?: string) => {
    const file = await pickFile(accept)
    if (!file) return null
    const saved = await saveUserFile(file, id)
    ctx.fileChanged(saved.id)
    return saved.path
  }

  return {
    'data:get-missions': () => readJson('missions.json'),
    'data:save-missions': m => writeJson('missions.json', m),
    'data:get-objectives': () => readJson('objectives.json'),
    'data:save-objectives': o => writeJson('objectives.json', o),
    'data:get-challenges': () => readJson('challenges.json'),
    'data:save-challenges': c => writeJson('challenges.json', c),
    'data:get-cinematics': () => readJson('cinematics.json'),
    'data:save-cinematics': c => writeJson('cinematics.json', c),
    'data:get-cinematic-audios': () => readJson('cinematic-audios.json'),
    'data:save-cinematic-audios': a => writeJson('cinematic-audios.json', a),
    'data:get-sounds': () => readJson('sounds.json'),

    'data:get-logo-path': () => (hasUserFile(LOGO_ID) ? `user:${LOGO_ID}/logo` : 'img/logo.png'),
    'data:get-svg-logo-path': () => 'img/logoVectorizado.svg',
    'data:get-svg-logo-orange-path': () => 'img/logoVectorizadoNaranja.svg',
    'data:get-svg-logo-content': () => readText('img/logoVectorizado.svg'),
    'data:get-svg-logo-orange-content': () => readText('img/logoVectorizadoNaranja.svg'),

    'file:select-photo': async participantId => {
      const path = await upload('image/png,image/jpeg,image/gif,image/webp')
      if (path) ctx.setParticipantPhoto(participantId, path)
      return path
    },
    'file:select-logo': async () => {
      const path = await upload('image/png,image/jpeg,image/webp', LOGO_ID)
      if (path) ctx.bumpLogo()
      return path
    },
    'file:select-audio': () => upload('audio/*,.mpeg,.m4a'),
    'file:select-video': () => upload('video/mp4'),
    'file:delete': async path => {
      const id = await deleteUserFile(path)
      if (id) ctx.fileChanged(id)
      return id !== null
    },

    'display:list': () => listDisplays(),

    // La web siempre sirve la última versión publicada.
    'update:check': () => ({ current: __APP_VERSION__, latest: __APP_VERSION__, available: false, canInstall: false, notes: '' }),
  }
}
