# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Ubicacion

Esta es **una** de las apps del workspace (ver el CLAUDE.md de la raiz). Todos los comandos y
rutas de este documento son relativos a `missionimprosible/`. El dashboard la descubre a traves
de `app.manifest.json` y la arranca como proceso externo: no comparte estado ni codigo con el.
El `.exe` portable se genera en `release/` (`npm run package:portable`).

## Commands

```bash
npm install          # Install dependencies

npm run build        # Full build (main + preload + both renderers)
npm run build:main   # Build main process + preload only
npm run build:control    # Build control renderer only
npm run build:projection # Build projection renderer only

npm run start        # Full build then launch Electron
npm run package      # Build + package as Windows NSIS installer
npm run package:portable # Build + package as Windows portable exe
```

There is no dev server or hot-reload — every change requires a rebuild (`npm run build`) before running `npm run start`. To iterate faster, build only the changed target (e.g. `npm run build:control`) then relaunch.

## Architecture

This is a two-window Electron app: a **control panel** window and a **projection screen** window.

### Process boundaries

```
src/main/main.ts        — Electron main process: IPC hub, window management, file I/O
src/main/preload.ts     — contextBridge: exposes electronAPI to renderers
src/main/store.ts       — JSON persistence (missions, objectives, challenges, settings, sounds)
src/shared/types.ts     — Shared TypeScript types (AppState, Participant, MissionView, etc.)

src/renderer/control/   — Control panel React app (ControlApp.tsx + MisionesTab.tsx)
src/renderer/projection/— Projection screen React app (ProjectionApp.tsx)
src/renderer/electron-api.d.ts — Global Window.electronAPI type declarations
src/renderer/utils/audio.ts    — Audio playback helpers (playAudio, playAudioTimed, getAudioDuration)
src/renderer/constants/ — Static data constants (ratings, tabs, challenge/mission/objective labels)
```

### State management

`AppState` lives in the main process (`appState` in `main.ts`). Both renderers receive state via IPC:
- Control sends `appstate:update` → main updates and re-broadcasts `state:update` to all windows
- Projection listens to `state:update` and re-renders

Fields in `PERSISTED_KEYS` are automatically saved to `src/data/settings.json` on every update. All other `AppState` fields reset on app restart.

### IPC pattern

All renderer↔main communication goes through `window.electronAPI` (defined in `preload.ts`, typed in `electron-api.d.ts`). The projection renderer must have `/// <reference path="../electron-api.d.ts" />` at the top of `ProjectionApp.tsx` because the `.d.ts` uses module-style imports.

Key channels:
- `appstate:update` — partial AppState update, broadcast to all renderers
- `state:get` / `state:update` — request/receive full state snapshot
- `mission:announce` / `objective:announce` — trigger cinematic overlays in projection
- `roulette:start` — start challenge roulette animation in projection
- `rating:show` / `rating:clear` — show/hide performance ratings overlay

### Data files (`src/data/`)

JSON files are the source of truth for missions, objectives, challenges, cinematics, and sounds. `store.ts` reads and writes them. Audio paths stored in JSON are **relative** (e.g. `audio/misiones/M_Switch.wav`); `resolveAudioPath()` in `store.ts` converts them to absolute paths before sending to renderers. The renderers then call `toLocalFile()` to convert absolute paths to `localfile://` URLs served by the custom Electron protocol handler.

When packaged, `src/data/` is copied to `resources/data/` via `extraResources` in `electron-builder` config. `getDataDir()` in `store.ts` handles both dev and packaged paths.

### Audio timing

WAV files may report `Infinity` for duration via `loadedmetadata`. `playAudioTimed()` and `getAudioDuration()` in `audio.ts` handle this by seeking to `1e101` to force the browser to calculate the real duration via `durationchange`. Always use these helpers rather than `new Audio()` directly when duration matters.

### Curtain / transition timing

Use `useLayoutEffect` (not `useEffect`) for state that controls what's mounted/visible on screen to avoid single-frame flashes between transitions. The mission view exit, curtain mounting, and roulette exit all use this pattern.

### Build system

Four separate Vite configs — one for main/preload, two for renderers. Each renderer is a standalone SPA with its own `index.html` root. TypeScript uses two tsconfigs: `tsconfig.main.json` (CommonJS, for Electron main) and `tsconfig.renderer.json` (ESNext/bundler, for both React renderers).
