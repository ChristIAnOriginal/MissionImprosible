/**
 * Almacén clave-valor en IndexedDB: los JSON editados (misiones, objetivos…) y
 * los archivos que sube el usuario. Es por navegador y por equipo.
 */
const DB_NAME = 'mision-improsible'
const STORE = 'kv'

let opening: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  opening ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return opening
}

async function run<T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const req = op(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export const dbGet = <T>(key: string) => run<T | undefined>('readonly', s => s.get(key) as IDBRequest<T | undefined>)
export const dbSet = (key: string, value: unknown) => run('readwrite', s => s.put(value, key)).then(() => undefined)
export const dbDelete = (key: string) => run('readwrite', s => s.delete(key)).then(() => undefined)

export async function dbKeys(prefix: string): Promise<string[]> {
  const keys = await run('readonly', s => s.getAllKeys())
  return keys.map(String).filter(k => k.startsWith(prefix))
}

/** Pide que el navegador no borre estos datos cuando le falte espacio. */
export function persistStorage() {
  navigator.storage?.persist?.().catch(() => undefined)
}
