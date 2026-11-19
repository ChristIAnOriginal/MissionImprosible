import { describe, expect, it } from 'vitest'
import { compareVersions, latestRelease, type GithubRelease } from './version'

const exe = (name = 'MisionImprosible-1.0.0.exe') => ({ name, size: 10, browser_download_url: `https://x/${name}` })
const release = (tag: string, extra: Partial<GithubRelease> = {}): GithubRelease => ({
  tag_name: tag,
  draft: false,
  prerelease: false,
  html_url: `https://x/${tag}`,
  assets: [exe()],
  ...extra,
})

describe('compareVersions', () => {
  it('compara numéricamente, no como texto', () => {
    expect(compareVersions('2.0.10', '2.0.9')).toBeGreaterThan(0)
    expect(compareVersions('2.1.0', '2.0.99')).toBeGreaterThan(0)
    expect(compareVersions('2.0.3', '2.0.3')).toBe(0)
    expect(compareVersions('1.9.9', '2.0.0')).toBeLessThan(0)
  })

  it('acepta el prefijo v', () => {
    expect(compareVersions('v2.0.4', '2.0.3')).toBeGreaterThan(0)
  })
})

describe('latestRelease', () => {
  it('elige la versión más alta de la app', () => {
    const r = latestRelease([release('mision-v2.0.9'), release('mision-v2.0.10'), release('mision-v2.0.4')])
    expect(r?.version).toBe('2.0.10')
  })

  it('ignora otras apps, borradores, prereleases y releases sin .exe', () => {
    const r = latestRelease([
      release('mision-v2.0.4'),
      release('d20-v9.0.0'),
      release('v9.0.0'),
      release('mision-v3.0.0', { draft: true }),
      release('mision-v3.0.1', { prerelease: true }),
      release('mision-v3.0.2', { assets: [{ ...exe('notas.zip') }] }),
    ])
    expect(r?.version).toBe('2.0.4')
  })

  it('devuelve null si no hay ninguna', () => {
    expect(latestRelease([])).toBeNull()
  })
})
