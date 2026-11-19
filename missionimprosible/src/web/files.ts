/**
 * Rutas de archivo en la web.
 *
 * - Datos incluidos: rutas relativas a la carpeta de datos (`audio/misiones/x.wav`),
 *   servidas junto a la web en `data/`.
 * - Archivos subidos: `user:<id>/<nombre>`, guardados en IndexedDB. Cada ventana
 *   los carga al arrancar como URL blob:, así `fileUrl` puede ser síncrona.
 */
import { dbDelete, dbGet, dbKeys, dbSet } from './db'

const USER = 'user:'
const KEY = 'file:'

interface StoredFile {
  name: string
  blob: Blob
}

const urls = new Map<string, string>()

/** Carpeta de datos publicada: hermana de las páginas control/ y projection/. */
const DATA_BASE = new URL('../data/', document.baseURI)

export function dataUrl(relative: string): string {
  return new URL(relative.split('/').map(encodeURIComponent).join('/'), DATA_BASE).href
}

const idOf = (path: string) => path.slice(USER.length).split('/')[0]

export function fileUrl(path: string | null): string | null {
  if (!path) return null
  if (path.startsWith(USER)) return urls.get(idOf(path)) ?? null
  if (/^(blob:|https?:|data:)/.test(path)) return path
  return dataUrl(path)
}

export async function loadUserFile(id: string) {
  const f = await dbGet<StoredFile>(KEY + id)
  const old = urls.get(id)
  if (old) URL.revokeObjectURL(old)
  if (f) urls.set(id, URL.createObjectURL(f.blob))
  else urls.delete(id)
}

export async function loadUserFiles() {
  const keys = await dbKeys(KEY)
  await Promise.all(keys.map(k => loadUserFile(k.slice(KEY.length))))
}

export function hasUserFile(id: string) {
  return urls.has(id)
}

/** Guarda el archivo y devuelve su ruta. Con `id` fijo reemplaza el anterior (el logo). */
export async function saveUserFile(file: File, id: string = crypto.randomUUID()): Promise<{ id: string; path: string }> {
  await dbSet(KEY + id, { name: file.name, blob: file } satisfies StoredFile)
  await loadUserFile(id)
  return { id, path: `${USER}${id}/${file.name}` }
}

/** Sólo se borran archivos subidos: los incluidos con la web no se tocan. */
export async function deleteUserFile(path: string | null): Promise<string | null> {
  if (!path?.startsWith(USER)) return null
  const id = idOf(path)
  await dbDelete(KEY + id)
  await loadUserFile(id)
  return id
}

/**
 * Selector de archivos del navegador. Debe llamarse dentro del clic que lo pide:
 * el navegador sólo abre el diálogo con un gesto del usuario.
 */
export function pickFile(accept: string): Promise<File | null> {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.oncancel = () => resolve(null)
    input.click()
  })
}
