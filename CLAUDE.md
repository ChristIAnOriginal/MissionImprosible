# CLAUDE.md

Guía para Claude Code (claude.ai/code) al trabajar en este repositorio.

## Qué es esto

Un workspace de apps de escritorio independientes más un lanzador que las agrupa.

```
ScreenProjection/
├── dashboard/          Falso Vacío Hub: lanzador que descubre las apps y las arranca
├── missionimprosible/  App: panel de control + proyección del show
├── dejavu/             App: temporizador de proyección con rebobinado
├── habiaunavez/        App: gestor de animaciones (agente: habiaunavez-animaciones)
├── app4/               (futuras apps: una carpeta cada una)
└── package.json        Scripts que delegan en cada sub-app
```

**Cada app es autónoma**: su propio `package.json`, su propio `node_modules`, su propio build
y su propio estado persistido. No hay código compartido entre apps ni `AppState` común. El
dashboard nunca importa código de una app: la lanza como **proceso externo**.

## Comandos

Desde la raíz:

```bash
npm run install:all   # npm install en dashboard/ y en cada app
npm run dashboard     # compila y abre el lanzador
npm run build:all     # compila todo
npm run package:all   # genera los .exe portables de cada carpeta
npm run dist          # package:all + ensamblado portable comprimido
```

`scripts/bundle-portable.mjs` toma el `.exe` más reciente de cada `release/` y arma
`dist-portable/FalsoVacioHub/` con la estructura que el hub espera descubrir: el ejecutable del
hub arriba y una carpeta por app con su `release/<app>.exe`, su icono en la misma ruta relativa
que declara el manifiesto, y un `app.manifest.json` recortado a los campos de ejecución
(`id`, `name`, `description`, `icon`, `accent`, `portableDir`). Sin fuentes no hay
`dev`/`build`/`package`, y el panel de detalle deja esos botones desactivados.

Dentro de una app, se usan sus propios scripts (ver el CLAUDE.md de cada carpeta).

## Añadir una app nueva

1. Crear una carpeta hermana de `dashboard/` con su propio proyecto.
2. Añadir `app.manifest.json` en su raíz (ver esquema abajo).
3. Pulsar **Actualizar** en el dashboard.

No hay que tocar el código del dashboard: el descubrimiento es por sistema de archivos.

### `app.manifest.json`

```json
{
  "id": "missionimprosible",
  "name": "Misión Improsible",
  "description": "Texto de la tarjeta.",
  "icon": "src/data/img/logo.png",
  "accent": "#f97316",
  "dev": { "command": "npm", "args": ["run", "start"] },
  "build": { "command": "npm", "args": ["run", "build"] },
  "package": { "command": "npm", "args": ["run", "package:portable"] },
  "portableDir": "release"
}
```

Todos los campos salvo `name` son opcionales. Si falta el manifiesto, el dashboard sintetiza uno
desde el `package.json` de la carpeta (`start`/`dev` → dev, `build` → build,
`package:portable`/`package` → package). `portableDir` es la carpeta de salida de
electron-builder; el dashboard toma de ahí el `.exe` más reciente.

## Cómo arranca las apps el dashboard

- **Ejecutable**: `spawn` directo del `.exe` portable encontrado en `portableDir`.
- **Desarrollo**: `spawn` del comando `dev` con `shell: true` y `cwd` en la carpeta de la app;
  stdout/stderr se vuelcan al panel de logs.

En Windows `shell: true` crea un `cmd.exe` intermedio, así que detener una app usa
`taskkill /T /F` sobre el árbol de procesos. Al cerrar el dashboard se matan todos los hijos
(`before-quit` → `stopAll()`).

## Raíz del workspace

`resolveWorkspaceRoot()` en `dashboard/src/main/main.ts`:

- `APPS_ROOT` si está definida (útil para pruebas),
- empaquetado: `PORTABLE_EXECUTABLE_DIR` (o la carpeta del ejecutable),
- en desarrollo: `../../..` desde `dashboard/dist/main/`.

Es decir: el `.exe` del dashboard debe quedar **junto a las carpetas de las apps** para
descubrirlas.
