/**
 * Converts a 0-100 volume value to a 0-1 perceptual scale.
 * Uses square root for a more natural perceived loudness curve.
 */
export function normalizeVolume(volume: number): number {
  return Math.sqrt(volume / 100)
}

/**
 * Plays an audio URL at the given 0-100 volume.
 * Returns the HTMLAudioElement for further control if needed.
 */
export function playAudio(url: string, volume: number): HTMLAudioElement {
  const audio = new Audio(url)
  audio.volume = normalizeVolume(volume)
  audio.play()
  return audio
}

/**
 * Plays an audio URL and calls onDuration(ms) once the duration is known.
 * Useful for timing UI animations to match audio length.
 */
function resolveInfinityDuration(audio: HTMLAudioElement, onResolved: (durationMs: number) => void): void {
  // WAV files sometimes report Infinity — seek past the end to force duration calculation
  audio.currentTime = 1e101
  const onDurationChange = () => {
    if (isFinite(audio.duration)) {
      audio.removeEventListener('durationchange', onDurationChange)
      console.log('[audio] durationchange after seek — duration:', audio.duration, 's')
      onResolved(audio.duration * 1000)
    }
  }
  audio.addEventListener('durationchange', onDurationChange)
}

export function playAudioTimed(
  url: string,
  volume: number,
  onDuration: (remainingMs: number) => void
): HTMLAudioElement {
  const audio = new Audio(url)
  audio.volume = normalizeVolume(volume)
  const start = Date.now()
  let resolved = false
  const resolve = (remaining: number) => {
    if (resolved) return
    resolved = true
    onDuration(remaining)
  }
  audio.addEventListener('loadedmetadata', () => {
    console.log('[audio] loadedmetadata fired — duration:', audio.duration, 's')
    if (!isFinite(audio.duration)) {
      resolveInfinityDuration(audio, (totalMs) => {
        audio.currentTime = 0
        audio.play()
        const elapsed = Date.now() - start
        resolve(Math.max(totalMs - elapsed, totalMs))
      })
      return
    }
    const elapsed = Date.now() - start
    const remaining = Math.max(audio.duration * 1000 - elapsed, 0)
    console.log('[audio] remaining:', remaining, 'ms')
    resolve(remaining)
  })
  audio.addEventListener('ended', () => {
    console.log('[audio] ended fired')
    resolve(0)
  })
  audio.play()
  return audio
}

/**
 * Loads an audio URL and calls onDuration(ms) once the duration is known,
 * without playing it. Used to pre-fetch duration for UI blocking.
 */
export function getAudioDuration(
  url: string,
  onDuration: (durationMs: number) => void
): void {
  const audio = new Audio(url)
  audio.addEventListener('loadedmetadata', () => {
    if (!isFinite(audio.duration)) {
      resolveInfinityDuration(audio, onDuration)
      return
    }
    onDuration(audio.duration * 1000)
  })
  audio.load()
}
