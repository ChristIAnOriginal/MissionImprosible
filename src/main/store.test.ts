import { describe, it, expect } from 'vitest'
import { resolveAudioPathIn } from './paths'

describe('resolveAudioPathIn', () => {
  const dataDir = '/fake/data'

  it('returns null for null input', () => {
    expect(resolveAudioPathIn(dataDir, null)).toBeNull()
  })

  it('returns absolute paths unchanged', () => {
    const abs = process.platform === 'win32' ? 'C:\\tmp\\foo.wav' : '/tmp/foo.wav'
    expect(resolveAudioPathIn(dataDir, abs)).toBe(abs)
  })

  it('resolves relative paths against data dir', () => {
    const result = resolveAudioPathIn(dataDir, 'audio/foo.wav')
    expect(result).toMatch(/audio[\\/]foo\.wav$/)
    expect(result).not.toBe('audio/foo.wav')
  })
})
