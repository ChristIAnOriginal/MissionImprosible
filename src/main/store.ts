import * as path from 'path'
import * as fs from 'fs'
import { app } from 'electron'
import { MissionData, ObjectiveData, ChallengeData, CinematicData, CinematicAudioData, MissionPreload } from '../shared/types'
import { resolveAudioPathIn } from './paths'

export function getDataDir(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'data')
    : path.join(app.getAppPath(), 'src', 'data')
}

export function resolveAudioPath(audioPath: string | null): string | null {
  return resolveAudioPathIn(getDataDir(), audioPath)
}

export function deleteDataFile(storedPath: string | null): boolean {
  if (!storedPath) return false
  const resolved = resolveAudioPath(storedPath)
  if (!resolved) return false
  const dataDir = getDataDir()
  const rel = path.relative(dataDir, resolved)
  if (rel.startsWith('..') || path.isAbsolute(rel)) return false
  try {
    if (fs.existsSync(resolved)) {
      fs.unlinkSync(resolved)
      return true
    }
  } catch (err) {
    console.error('[store] deleteDataFile failed', resolved, err)
  }
  return false
}

/**
 * Converts a path to a relative path inside the data dir.
 * If the file is already inside the data dir, just relativize it.
 * If it's external, copy it into audio/user/ and return the relative path.
 */
function toStorablePath(absPath: string | null): string | null {
  if (!absPath) return null
  const dataDir = getDataDir()
  const rel = path.relative(dataDir, absPath)
  // Already inside data dir
  if (!rel.startsWith('..') && !path.isAbsolute(rel)) return rel.replace(/\\/g, '/')
  // External file: copy into audio/user/
  const userAudioDir = path.join(dataDir, 'audio', 'user')
  if (!fs.existsSync(userAudioDir)) fs.mkdirSync(userAudioDir, { recursive: true })
  const destPath = path.join(userAudioDir, path.basename(absPath))
  fs.copyFileSync(absPath, destPath)
  return 'audio/user/' + path.basename(absPath)
}

function loadJson<T>(filename: string): T {
  const filePath = path.join(getDataDir(), filename)
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
}

function saveJson(filename: string, data: unknown): void {
  const filePath = path.join(getDataDir(), filename)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

export function getMissions(): MissionData[] {
  return loadJson<MissionData[]>('missions.json')
}

export function saveMissions(missions: MissionData[]): void {
  saveJson('missions.json', missions.map(m => ({ ...m, audioPath: toStorablePath(m.audioPath) })))
}

export function getObjectives(): ObjectiveData[] {
  return loadJson<ObjectiveData[]>('objectives.json')
}

export function saveObjectives(objectives: ObjectiveData[]): void {
  saveJson('objectives.json', objectives.map(o => ({ ...o, audioPath: toStorablePath(o.audioPath) })))
}

export function getChallenges(): ChallengeData[] {
  return loadJson<ChallengeData[]>('challenges.json')
}

export function saveChallenges(challenges: ChallengeData[]): void {
  saveJson('challenges.json', challenges.map(c => ({ ...c, audioPath: toStorablePath(c.audioPath) })))
}

export function getCinematics(): CinematicData[] {
  return loadJson<CinematicData[]>('cinematics.json')
}

export function saveCinematics(cinematics: CinematicData[]): void {
  saveJson('cinematics.json', cinematics.map(c => ({ ...c, videoPath: toStorablePath(c.videoPath) })))
}

export function getCinematicAudios(): CinematicAudioData[] {
  return loadJson<CinematicAudioData[]>('cinematic-audios.json')
}

export function saveCinematicAudios(audios: CinematicAudioData[]): void {
  saveJson('cinematic-audios.json', audios.map(a => ({ ...a, audioPath: toStorablePath(a.audioPath) })))
}

export interface Settings {
  volume: number
  overlayOpacity: number
  rouletteTickBase: number
  rouletteTickRange: number
  curtainFlipEnabled: boolean
  curtainFlipDuration: number
  curtainPulseEnabled: boolean
  curtainPulseDuration: number
  curtainPulseColor: string
  curtainLogoColor: 'white' | 'orange'
  curtainWobbleEnabled: boolean
  curtainWobbleDuration: number
  missionPreloads: Record<string, MissionPreload>
  ratingDuration: number
  ratingAutoClear: boolean
}

const SETTINGS_DEFAULTS: Settings = {
  volume: 100,
  overlayOpacity: 80,
  rouletteTickBase: 180,
  rouletteTickRange: 520,
  curtainFlipEnabled: true,
  curtainFlipDuration: 10,
  curtainPulseEnabled: true,
  curtainPulseDuration: 5,
  curtainPulseColor: '#ff5500',
  curtainLogoColor: 'white',
  curtainWobbleEnabled: false,
  curtainWobbleDuration: 0.35,
  missionPreloads: {},
  ratingDuration: 5,
  ratingAutoClear: true,
}

export function getSettings(): Settings {
  try {
    const raw = loadJson<Partial<Settings>>('settings.json')
    return { ...SETTINGS_DEFAULTS, ...raw }
  } catch {
    return { ...SETTINGS_DEFAULTS }
  }
}

export function saveSettings(settings: Settings): void {
  saveJson('settings.json', settings)
}

export function getSvgLogoPath(): string {
  return path.join(getDataDir(), 'img', 'logoVectorizado.svg')
}

export function getSvgLogoOrangePath(): string {
  return path.join(getDataDir(), 'img', 'logoVectorizadoNaranja.svg')
}

export function getSounds(): Record<string, string | null> {
  const raw = loadJson<Record<string, string>>('sounds.json')
  return Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, resolveAudioPath(v)])
  )
}
