/**
 * Persistencia de la configuración en `userData/settings.json`.
 * No hay datos de contenido: DejaVu sólo guarda ajustes.
 */
import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { DEFAULT_SETTINGS, TimerSettings } from '../shared/types'

function settingsFile() {
  return path.join(app.getPath('userData'), 'settings.json')
}

/**
 * El aviso era un único `alertEnabled`; ahora son dos interruptores
 * independientes. Un ajuste guardado con el campo antiguo enciende los dos.
 */
type StoredSettings = Partial<TimerSettings> & { alertEnabled?: boolean }

function migrate(raw: StoredSettings): Partial<TimerSettings> {
  const { alertEnabled, ...rest } = raw
  if (alertEnabled === undefined) return rest
  return {
    ...rest,
    alertTint: rest.alertTint ?? alertEnabled,
    alertPulse: rest.alertPulse ?? alertEnabled,
  }
}

export function loadSettings(): TimerSettings {
  try {
    const raw = JSON.parse(fs.readFileSync(settingsFile(), 'utf-8')) as StoredSettings
    return { ...DEFAULT_SETTINGS, ...migrate(raw) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: TimerSettings) {
  try {
    fs.mkdirSync(path.dirname(settingsFile()), { recursive: true })
    fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2))
  } catch {
    // Guardar ajustes nunca debe tumbar la app.
  }
}
