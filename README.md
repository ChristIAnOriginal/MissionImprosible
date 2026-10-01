# ScreenProjection

Workspace de apps de escritorio con **Falso Vacío Hub**, un lanzador que las agrupa.

```
ScreenProjection/
├── dashboard/          Falso Vacío Hub: rejilla de islas, una por app
├── missionimprosible/  Panel de control + proyección del show
├── dejavu/             Temporizador con rebobinado
├── habiaunavez/        Gestor de animaciones (cabina de nave, planetas, fondos)
└── app4/               (cada app nueva es una carpeta hermana)
```

Cada app es independiente: su propio `package.json`, sus dependencias, su build y su estado.
El dashboard no comparte código ni datos con ellas; las abre como procesos externos, usando el
ejecutable portable si ya está compilado o su comando de desarrollo si no.

## Puesta en marcha

```bash
npm run install:all   # instala dependencias de todas las carpetas
npm run dashboard     # compila y abre el lanzador
```

## Otros scripts

| Script | Qué hace |
|--------|----------|
| `npm run build:all` | Compila el dashboard y todas las apps |
| `npm run package:all` | Genera los `.exe` portables de cada carpeta |
| `npm run bundle` | Ensambla `dist-portable/` con el hub y las apps juntos |
| `npm run bundle:zip` | Igual, y además comprime el resultado |
| `npm run dist` | `package:all` + `bundle:zip` de una pasada |

## Distribución portable

`npm run dist` deja una carpeta autocontenida que no necesita instalación ni Node:

```
dist-portable/FalsoVacioHub/
├── FalsoVacioHub.exe
├── missionimprosible/
│   ├── app.manifest.json
│   └── release/Mision Improsible.exe
└── dejavu/
    ├── app.manifest.json
    └── release/DejaVu.exe
```

El hub descubre las apps por las carpetas que tiene al lado, así que **la carpeta se mueve
entera**: el `.exe` suelto no encuentra nada. Los manifiestos del bundle van recortados (sin
`dev`/`build`/`package`), porque ahí no hay código fuente que compilar.

## Desde el dashboard

- **Abrir**: arranca la app (ejecutable si existe, si no modo desarrollo).
- **Detener**: mata el árbol de procesos de la app.
- Al seleccionar una isla se abre el panel lateral con la salida en vivo y los botones
  Ejecutable / Desarrollo / Compilar / Empaquetar / Carpeta.

## Añadir una app

1. Crear una carpeta hermana de `dashboard/`.
2. Añadir un `app.manifest.json` en su raíz.
3. Pulsar **Actualizar** en el dashboard.

Ver [CLAUDE.md](CLAUDE.md) para el esquema del manifiesto.
