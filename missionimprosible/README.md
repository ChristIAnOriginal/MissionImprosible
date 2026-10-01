# Misión Improsible

Panel de control y proyección para la dinámica **Misión Improsible**, construido con Electron, React y TypeScript.

## Características

- Pantalla de proyección con tabla de participantes y puntajes en tiempo real
- Panel de control para gestionar participantes, misiones, desafíos y objetivos
- Ruleta animada para selección de desafíos
- Reproducción de cinemáticas y audio sincronizado
- Cortina con animación de desvanecimiento
- Configuración de volumen, opacidad y tono del beep de la ruleta (persistente)

## Requisitos

- Node.js 18+
- npm

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Estructura

```
src/
├── main/          # Proceso principal de Electron (IPC, store, preload)
├── renderer/
│   ├── control/   # Ventana del panel de control
│   ├── projection/ # Ventana de proyección
│   └── utils/     # Utilidades compartidas del renderer
├── shared/        # Tipos TypeScript compartidos
└── data/          # Datos JSON (misiones, objetivos, desafíos, sonidos)
```
