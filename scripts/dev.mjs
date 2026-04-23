#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Dev orchestrator: launches two Vite dev servers for the renderers,
 * builds main+preload in watch mode, then starts Electron with env vars
 * pointing to the Vite URLs. Main/preload changes relaunch Electron via
 * electron-reload.
 */
import { spawn } from 'child_process'
import { setTimeout as delay } from 'timers/promises'
import http from 'http'

const CONTROL_URL = 'http://localhost:5173/'
const PROJECTION_URL = 'http://localhost:5174/'

function run(name, cmd, args, env = {}) {
  const child = spawn(cmd, args, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, ...env },
  })
  child.on('exit', (code) => {
    console.log(`[${name}] exited with code ${code}`)
    if (code && code !== 0) process.exit(code)
  })
  return child
}

async function waitForHttp(url, timeoutMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const ok = await new Promise((resolve) => {
      const req = http.get(url, (res) => {
        resolve(res.statusCode && res.statusCode < 500)
        res.resume()
      })
      req.on('error', () => resolve(false))
      req.setTimeout(1000, () => { req.destroy(); resolve(false) })
    })
    if (ok) return
    await delay(500)
  }
  throw new Error(`Timed out waiting for ${url}`)
}

async function main() {
  console.log('[dev] starting Vite dev servers...')
  const controlVite = run('vite:control', 'npx', ['vite', '--config', 'vite.control.config.ts'])
  const projectionVite = run('vite:projection', 'npx', ['vite', '--config', 'vite.projection.config.ts'])

  console.log('[dev] building main + preload (watch)...')
  const mainBuild = run('build:main', 'npx', ['vite', 'build', '--config', 'vite.main.config.ts', '--watch'])
  const preloadBuild = run('build:preload', 'npx', ['vite', 'build', '--config', 'vite.preload.config.ts', '--watch'])

  console.log('[dev] waiting for Vite servers...')
  await waitForHttp(CONTROL_URL)
  await waitForHttp(PROJECTION_URL)

  // Give main/preload a moment for the first bundle to land on disk.
  await delay(2000)

  console.log('[dev] launching Electron...')
  const electron = run('electron', 'npx', ['electron', '.'], {
    CONTROL_DEV_URL: CONTROL_URL,
    PROJECTION_DEV_URL: PROJECTION_URL,
    ELECTRON_ENABLE_LOGGING: '1',
  })

  const shutdown = () => {
    for (const c of [controlVite, projectionVite, mainBuild, preloadBuild, electron]) {
      try { c.kill() } catch { /* ignore */ }
    }
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  electron.on('exit', shutdown)
}

main().catch((err) => {
  console.error('[dev] fatal:', err)
  process.exit(1)
})
