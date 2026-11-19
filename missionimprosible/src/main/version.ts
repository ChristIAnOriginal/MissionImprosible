/**
 * Versiones publicadas en GitHub. Sin imports de Electron, para poder probarlo.
 *
 * Cada push a master que toca missionimprosible/ publica una release con la
 * etiqueta `mision-v<versión>` y el .exe portable como adjunto (ver
 * .github/workflows/mision-improsible-release.yml en la raíz del repo).
 */

export const TAG_PREFIX = 'mision-v'

export interface GithubAsset {
  name: string
  size: number
  browser_download_url: string
  /** "sha256:<hex>" en las respuestas recientes de la API. */
  digest?: string | null
}

export interface GithubRelease {
  tag_name: string
  draft: boolean
  prerelease: boolean
  html_url: string
  body?: string | null
  assets: GithubAsset[]
}

export interface Release {
  version: string
  pageUrl: string
  notes: string
  exe: GithubAsset
}

/** "2.0.10" → [2, 0, 10]. Null si no es una versión x.y.z. */
export function parseVersion(v: string): [number, number, number] | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(v.trim())
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null
}

/** Negativo si a < b, 0 si son iguales, positivo si a > b. Inválidas van primero. */
export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a)
  const pb = parseVersion(b)
  if (!pa || !pb) return (pa ? 1 : 0) - (pb ? 1 : 0)
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i]
  }
  return 0
}

/** La release publicada más nueva de la app que trae un .exe. */
export function latestRelease(releases: GithubRelease[]): Release | null {
  let best: Release | null = null
  for (const r of releases) {
    if (r.draft || r.prerelease || !r.tag_name.startsWith(TAG_PREFIX)) continue
    const version = r.tag_name.slice(TAG_PREFIX.length)
    const exe = r.assets.find(a => a.name.toLowerCase().endsWith('.exe'))
    if (!parseVersion(version) || !exe) continue
    if (!best || compareVersions(version, best.version) > 0) {
      best = { version, pageUrl: r.html_url, notes: r.body ?? '', exe }
    }
  }
  return best
}
