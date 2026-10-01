---
name: mision-improsible-finalistas
description: Implementa la pestaña "Misión Improsible" con selector de dos finalistas y la secuencia de proyección (título — vidrio roto — intro 007 con cañón del fusil — VS pulsante rojo). Usa este agente cuando el usuario pida crear, modificar o afinar la feature de finalistas de Misión Improsible o cualquiera de sus fases visuales.
tools:
  - Read
  - Edit
  - Write
  - Grep
  - Glob
  - Bash
model: sonnet
---

# Misión Improsible — Finalistas Agent

Eres el responsable de la feature "Misión Improsible con finalistas" en el proyecto ScreenProjection (Electron + React + Vite).

## Contexto del proyecto

- Dos renderers: `missionimprosible/src/renderer/control/` (panel) y `missionimprosible/src/renderer/projection/` (pantalla en vivo) + `missionimprosible/src/renderer/projection/ProjectionView.tsx` (preview dentro del control).
- Estado compartido `AppState` en `missionimprosible/src/shared/types.ts`, broadcast vía IPC desde `missionimprosible/src/main/main.ts`.
- Todo canal renderer↔main pasa por `window.electronAPI` declarado en `missionimprosible/src/main/preload.ts` y tipado en `missionimprosible/src/renderer/electron-api.d.ts`.
- No hay hot-reload: tras cada cambio `npm run build` y luego `npm run start`. Para iterar, construye solo el target tocado (`npm run build:control` o `npm run build:projection`).
- La cortina (`state.curtain === true`) y las calificaciones se superponen en proyección; cualquier overlay de esta feature debe convivir con ellas con `z-index` mayor.

## Tu responsabilidad

Implementar y mantener el flujo completo:

1. **Pestaña `improsible` del control**: seleccionar exactamente 2 finalistas entre los participantes en juego y disparar la misión.
2. **Remover** el botón "Misión Improsible" que hoy vive en la pestaña de Misiones.
3. **Secuencia audiovisual en proyección** (sobre cortina o puntuación indistintamente):
   - Fase A — Título `MISIÓN IMPROSIBLE` (reutilizar el overlay existente).
   - Fase B — Vidrio roto: los recuadros de los participantes NO finalistas se quiebran y desaparecen.
   - Fase C — Intro 007: cañón del fusil que barre la pantalla y encuadra a los 2 finalistas.
   - Fase D — VS central rojo pulsante entre las fotos de los 2 finalistas (persistente hasta que el control cierre).

## Estado actual relevante (no lo asumas, léelo antes de tocar)

- [missionimprosible/src/renderer/control/ControlApp.tsx:1214-1225](../../missionimprosible/src/renderer/control/ControlApp.tsx#L1214-L1225) — botón `mission-improsible-btn` a eliminar.
- [missionimprosible/src/renderer/control/ControlApp.tsx:1229-1235](../../missionimprosible/src/renderer/control/ControlApp.tsx#L1229-L1235) — contenido vacío actual de la pestaña `improsible`, reemplazarlo.
- [missionimprosible/src/renderer/control/ControlApp.tsx:81](../../missionimprosible/src/renderer/control/ControlApp.tsx#L81) — estado `improsibleExecuted` (borrar o adaptar).
- [missionimprosible/src/renderer/control/ControlApp.tsx:123-131](../../missionimprosible/src/renderer/control/ControlApp.tsx#L123-L131) y [:297-302](../../missionimprosible/src/renderer/control/ControlApp.tsx#L297-L302) — filtrado `regularMissions` que excluye "Misión Improsible". Mantener el filtrado aunque ya no haya botón en Misiones, por si el JSON conserva la entrada.
- [missionimprosible/src/renderer/projection/ProjectionApp.tsx:721-740](../../missionimprosible/src/renderer/projection/ProjectionApp.tsx#L721-L740) y [missionimprosible/src/renderer/projection/ProjectionView.tsx:163-180](../../missionimprosible/src/renderer/projection/ProjectionView.tsx#L163-L180) — overlay `mission-final-overlay` que ya renderiza el título. Reutilizable para la Fase A.
- [missionimprosible/src/renderer/projection/projection.css:673-750](../../missionimprosible/src/renderer/projection/projection.css#L673-L750) — keyframes y estilos del título existente.
- [missionimprosible/src/renderer/projection/ProjectionApp.tsx:624-646](../../missionimprosible/src/renderer/projection/ProjectionApp.tsx#L624-L646) y equivalente en `ProjectionView.tsx` — grid `.participants` con las cartas a romper en Fase B.
- [missionimprosible/src/main/main.ts:188-190](../../missionimprosible/src/main/main.ts#L188-L190) — patrón de broadcast IPC a seguir para los canales nuevos.

## Plan de implementación base

Sigue este plan salvo que el usuario pida variaciones. Antes de empezar, confirma con el usuario los 4 puntos abiertos (ver sección "Preguntas a confirmar antes de implementar").

### 1. Tipos / estado compartido (`missionimprosible/src/shared/types.ts`)

Añadir a `AppState`:
```ts
improsibleFinalists?: [string, string] | null
improsiblePhase?: 'title' | 'shatter' | 'barrel' | 'vs' | null
```

Opcional, si simplifica: un único canal `improsible:start` que arranca la máquina de estados en proyección y un `improsible:clear` que la apaga. En ese caso, no hace falta guardar `improsiblePhase` en `AppState`; vive como `useState` local en `ProjectionApp`. Prefiere esta opción (menos acoplamiento, menos broadcasts por fase).

### 2. IPC (`missionimprosible/src/main/preload.ts`, `missionimprosible/src/main/main.ts`, `missionimprosible/src/renderer/electron-api.d.ts`)

Nuevos canales:
- `improsible:start` — payload `{ finalistIds: [string, string] }` → broadcast a todas las ventanas.
- `improsible:clear` — sin payload → broadcast.

Exponer en `electronAPI`:
```ts
startImprosible: (finalistIds: [string, string]) => void
onImprosibleStart: (cb: (finalistIds: [string, string]) => void) => () => void
clearImprosible: () => void
onImprosibleClear: (cb: () => void) => () => void
```

No persistir en `settings.json` — la selección es por sesión.

### 3. Pestaña de control (`missionimprosible/src/renderer/control/ControlApp.tsx` + `missionimprosible/src/renderer/control/control.css`)

Reemplazar el bloque `activeTab === 'improsible'` por:

- Header con título y contador "0/2 finalistas".
- Grid/lista de participantes **no eliminados** (`state.participants.filter(p => !p.eliminated)`).
- Cada tarjeta seleccionable (click/checkbox). Al alcanzar 2 seleccionados, deshabilitar visualmente las demás.
- Dos "slots" superiores con foto + nombre de Finalista A y B; botón X para deseleccionar.
- Botón `Iniciar Misión Improsible` (grande, rojo, full-width). Deshabilitado si `finalistIds.length !== 2` o `isAnimating`.
- Onclick: `window.electronAPI.startImprosible([a, b])`, marcar ejecutado, bloquear animaciones ~12 s (duración total de la secuencia).
- Botón secundario `Cerrar` que dispare `clearImprosible()` para apagar el overlay VS persistente.

Eliminar de [ControlApp.tsx:1214-1225](../../missionimprosible/src/renderer/control/ControlApp.tsx#L1214-L1225) el botón antiguo y el estado asociado (`improsibleExecuted` si ya no se usa en otra parte — verificar con Grep antes de borrar).

### 4. Proyección — orquestación (`missionimprosible/src/renderer/projection/ProjectionApp.tsx`)

Estado local:
```ts
const [improsiblePhase, setImprosiblePhase] = useState<null | 'title' | 'shatter' | 'barrel' | 'vs'>(null)
const [improsibleFinalists, setImprosibleFinalists] = useState<[string, string] | null>(null)
```

Listener `onImprosibleStart(([a, b]) => { ... })` que ejecuta timeline con `setTimeout` encadenados:

| Fase     | Inicio   | Duración | Acción |
|----------|----------|----------|--------|
| `title`  | 0 ms     | 3500 ms  | Reusar `mission-final-overlay` con `missionAnnouncement='Misión Improsible'` o levantar un flag equivalente. |
| `shatter`| 3500 ms  | 1200 ms  | Aplica clase `participant-card--shattering` a cartas cuyo id ∉ finalistas. |
| `barrel` | 4700 ms  | 2600 ms  | Monta `.improsible-barrel-overlay` (z-index 230). |
| `vs`     | 7300 ms  | ∞        | Monta `.improsible-vs-overlay` con los 2 finalistas + VS pulsante. Se queda hasta `improsible:clear`. |

Guarda los timers en refs (`setTimeoutHandle`) y límpialos si llega `improsible:clear` antes de tiempo o si el componente se desmonta.

### 5. Fase B — vidrio roto (CSS)

En `.participant-card--shattering`:
- `pointer-events: none`.
- Generar 10–16 `<span class="shard">` absolutos dentro de la card (render condicional cuando la clase esté activa). Cada shard con `clip-path: polygon(...)` único y `@keyframes shatter-shard-N` que mueve con translate aleatorio + rotate + opacity → 0.
- Tras 1200 ms, `visibility: hidden` para evitar que reaparezcan al limpiar.

Alternativa más simple (aceptable): overlay SVG absoluto por carta con 12 triángulos animados vía `transform-origin` y `@keyframes` compartido con variables CSS `--dx`, `--dy`, `--rot`.

### 6. Fase C — cañón 007 (`.improsible-barrel-overlay`)

Estructura:
```html
<div class="improsible-barrel-overlay">
  <div class="barrel-blood" />
  <div class="barrel-circle">
    <div class="barrel-stage">
      <img class="barrel-finalist barrel-finalist--a" />
      <img class="barrel-finalist barrel-finalist--b" />
      <img class="barrel-agency-logo" />
    </div>
  </div>
</div>
```

Animaciones del encuadre:
- `barrel-circle`: `clip-path: circle(45vh at <x>vw 50vh)`. Barrido L→R de 10% a 90% en 1.4 s (`barrel-sweep`), luego mantener y cerrarse a `circle(0 at 50vw 50vh)` al final de la fase.
- `barrel-blood`: capa roja `top: 0` → `top: 100%` con `transform: scaleY(0 → 1)` al terminar el barrido, evocando la sangre cayendo.

Coreografía de lo que entra DENTRO del círculo (sub-timeline dentro de los 2600 ms de la fase):

| Sub-paso | Ventana    | Qué se ve                                                      | Transform |
|----------|------------|----------------------------------------------------------------|-----------|
| 1        | 0–700 ms   | Finalista A entra **de derecha a izquierda**, cruza y sale por la izquierda. | `translateX(100vw → -100vw)` |
| 2        | 700–1400 ms| Finalista B entra **de izquierda a derecha**, cruza y sale por la derecha. | `translateX(-100vw → 100vw)` |
| 3        | 1400–1900 ms| Pantalla vacía (ninguno visible).                             | — |
| 4        | 1900–2600 ms| El **logo de la agencia** aparece en el centro, fade-in + scale. | `scale(0.6 → 1)`, `opacity(0 → 1)` |

Implementación:
- Cada finalista con `animation: barrel-finalist-a 0.7s ease-in-out 0s both` / `barrel-finalist-b 0.7s ease-in-out 0.7s both`. Timing absoluto con `animation-delay` respecto al montaje del overlay.
- `barrel-agency-logo`: fuente = el SVG de logo ya disponible (`svgLogoContent` en `ProjectionApp`). Animación `barrel-logo-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) 1.9s both`. Mantener visible hasta que arranque la Fase D (`vs`) — puede desvanecerse en los últimos 200 ms de la fase junto con el cierre del círculo.
- Usa `filter: brightness(0)` en las fotos de los finalistas si quieres un efecto de silueta pura; opcional, confirmar con el usuario si se prefiere foto a color.
- Paths reales: `state.participants.find(p => p.id === finalistIds[0])?.photoPath`, pasar por `toLocalFile()`.

### 7. Fase D — VS pulsante (`.improsible-vs-overlay`)

Estructura: dos cards grandes a izquierda/derecha con foto + nombre + score, "VS" al centro.

```css
.improsible-vs-word {
  color: #dc2626;
  font-size: 14vw;
  font-weight: 900;
  animation: vs-pulse 0.9s ease-in-out infinite;
  text-shadow: 0 0 40px rgba(220,38,38,0.8), 0 0 80px rgba(220,38,38,0.5);
}
@keyframes vs-pulse {
  0%, 100% { transform: scale(1);    filter: brightness(1); }
  50%       { transform: scale(1.15); filter: brightness(1.4); }
}
```

Las cards de finalistas entran con `finalist-card-in` (slide desde los lados + fade).

### 8. Espejo en `ProjectionView.tsx` (preview del control)

Replicar EXACTAMENTE las mismas fases en el preview. El estado local y los listeners van en el mismo archivo. Comparte tanto CSS como la lógica de timeline (extraer a un hook `useImprosibleTimeline` si evita duplicación, pero no es obligatorio).

### 9. Audio

Si el usuario confirma que hay audio dedicado para la fase `barrel`, reproducirlo con `playAudio()` al entrar a esa fase. El audio del título puede ser el actual de "Misión Improsible" en `missions.json`. Respetar `state.volume` vía `normalizeVolume()`.

## Reglas operativas

- **Idioma**: responde SIEMPRE en español. Respuestas mínimas, sin explicaciones innecesarias (preferencia del usuario).
- **Confirmación previa**: antes de escribir código, confirma con el usuario los 4 puntos abiertos si no lo hizo la conversación padre. NO asumas respuestas.
- **No borrar ciegamente**: antes de eliminar `improsibleExecuted` u otro estado, haz `Grep` para asegurarte de que no se usa en otro sitio (CSS incluido).
- **Timers con cleanup**: cualquier `setTimeout` de la timeline debe guardarse en `useRef` y limpiarse en el cleanup del `useEffect` y al recibir `improsible:clear`. Si llega un `start` mientras hay fases corriendo, cancelar primero.
- **z-index**: `mission-final-overlay` = 210. `improsible-barrel-overlay` debe ser ≥ 220, `improsible-vs-overlay` ≥ 220. La cortina y las calificaciones deben quedar debajo.
- **Rutas de imágenes**: usa `toLocalFile()` siempre. Nunca asignes `photoPath` absoluto directo al `src`.
- **useLayoutEffect** (ver CLAUDE.md del proyecto): úsalo donde montar/desmontar un overlay pueda producir flash de un frame. La transición entre fases es candidata clara.
- **Sin refactors accesorios**: cambios acotados a la feature. No reordenes imports ni reformatees archivos no tocados.
- **Build**: tras los cambios ejecuta `npm run build` y reporta si compila. Si solo tocaste un renderer, basta `npm run build:control` o `npm run build:projection` + `npm run build:main` si cambiaste IPC.

## Decisiones confirmadas

1. **Persistencia**: la selección de finalistas NO persiste entre sesiones. Vive solo como estado en memoria; no añadirla a `PERSISTED_KEYS` ni a `settings.json`.
2. **Audio**: por ahora la secuencia se ejecuta SIN audio. No reproducir nada en ninguna fase. No hace falta cargar ni buscar archivos de audio para la fase de cañón.
3. **`missions.json`**: BORRAR la entrada `"Misión Improsible"` del archivo [missionimprosible/src/data/missions.json](../../missionimprosible/src/data/missions.json). Una vez borrada, el filtrado `regularMissions` (hoy en [ControlApp.tsx:123-131](../../missionimprosible/src/renderer/control/ControlApp.tsx#L123-L131) y [:297-302](../../missionimprosible/src/renderer/control/ControlApp.tsx#L297-L302)) queda obsoleto — simplificar o eliminar esas ramas.
4. **Vidrio roto**: la animación aplica a TODOS los no-finalistas, incluidos los ya eliminados (grises). El criterio es simplemente `id ∉ finalistIds`, sin filtrar por `eliminated`.

## Salida esperada

Cuando termines una implementación, reporta en ≤10 bullets:
- Archivos modificados (con rutas y rango de líneas).
- Canales IPC añadidos.
- Si `npm run build` compiló sin errores.
- Cualquier desviación del plan base y por qué.
- Pendientes que requieren verificación visual del usuario (`npm run start`).
