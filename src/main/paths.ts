import * as path from 'path'

/**
 * Pure path helpers. No Electron imports here so these functions
 * can be unit-tested without mocking the Electron runtime.
 *
 * `store.ts` re-exports `resolveAudioPath` bound to the live data dir.
 */

export function resolveAudioPathIn(dataDir: string, audioPath: string | null): string | null {
  if (!audioPath) return null
  if (path.isAbsolute(audioPath)) return audioPath
  return path.join(dataDir, audioPath)
}
