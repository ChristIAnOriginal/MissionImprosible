# Había una vez

Gestor de animaciones para proyección. El panel elige la animación y toca sus parámetros en
vivo; la proyección la pinta a pantalla completa.

Es una de las apps del workspace (ver el README de la raíz). Se abre desde **Falso Vacío Hub** o
directamente:

```bash
npm install
npm run start
```

## Línea gráfica

Todas las animaciones siguen `assets/referencia-linea-grafica.jpeg`: diseño plano, chapa gris
clara con tornillos, carcasas y pantallas casi negras, retícula verde azulada y una paleta corta
de acentos saturados. El volumen se hace con tonos, nunca con degradados ni blur.

El tema es una nave vista **desde dentro de la cabina, de frente al espacio**, con planetas y
fondos. Vive en `src/shared/palette.ts` (colores y medidas) y en `src/renderer/scene/` (las
piezas).

### La cabina

La referencia de encuadre es `referencia/image.png`. El punto de vista es el de alguien **detrás
de los dos asientos**, y la cabina se construye como una **caja en perspectiva de un punto**
(`src/renderer/scene/perspective.ts`): el encuadre completo es su boca y un rectángulo menor,
escalado hacia el punto de fuga, es el mamparo del fondo. Techo, suelo y paredes son los cuatro
trapecios que los unen y todos convergen al mismo punto.

Sobre esa caja van:

1. **Parabrisas envolvente**: seis lunas, cada una a su propia profundidad. La central está en
   el fondo y las de los lados se acercan al espectador, así que se ven más altas y sus montantes
   más gruesos — es lo que lo hace parecer una cabina y no una ventana recortada. El perfil está
   en `GLASS_RIBS`; la visera y el salpicadero siguen esa misma curva.
2. **Ventanillas laterales** abiertas en las paredes, en fuga. Lo de fuera se pinta una vez y se
   recorta a los tres huecos, así que el campo de estrellas es continuo entre ellos.
3. **Panel superior** con tres filas de mandos que encogen con la profundidad.
4. **Visera y salpicadero**: banda alta visible por encima de los respaldos y bloque central
   visible entre ellos.
5. **Pedestal** con las palancas, cuyos bordes convergen al punto de fuga.
6. **Asientos vacíos centrados**, flanqueando el pedestal y recortados por abajo.

Las alturas están en `LAYOUT`, al principio de `CabinFrame.tsx`; `WINDOW` es la caja del cristal
y es lo que usan las escenas para colocar lo que se ve fuera.

Cualquier pieza pegada a una pared, al techo o al suelo se coloca con `wallPoint()`,
`ceilingPoint()` o `floorPoint()`, nunca a ojo: es lo que mantiene la fuga coherente.

`CabinFrame` acepta `dim` (0 = iluminada, 1 = a oscuras). El velo lleva una máscara que deja
fuera los huecos al exterior — por una ventana se sigue viendo lo de fuera aunque dentro no haya
luz — pero vuelve a meter la silueta de montantes y marcos, que son estructura y se apagan con
el resto.

## Arquitectura

```
src/
├── shared/         palette · types (ParamSpec, AnimationMeta) · animations (fichas) · ipc
├── main/           ventanas, IPC y persistencia del estado del espectáculo
├── animations/     una carpeta por animación: meta.ts (datos) + Scene.tsx (dibujo)
└── renderer/
    ├── scene/      el kit: CabinFrame, instruments, space, contract
    ├── control/    panel: lista, mandos generados y vista previa
    └── projection/ pantalla completa
```

Decisiones que sostienen el resto:

- **El registro está partido en dos.** Las fichas (`shared/animations.ts`) son datos puros, así
  que el proceso main puede validar y persistir los valores; los componentes
  (`renderer/animations.tsx`) son JSX y sólo existen en los renderers. Añadir una animación son
  dos registros de una línea.
- **Los mandos se generan solos** a partir de `meta.params`. Ninguna animación escribe interfaz
  de control, y por eso todas se manejan igual.
- **La escena es función pura de `values` y `time`.** El reloj lo lleva
  `renderer/useShowClock.ts` y ya viene con la velocidad aplicada, parado si está en pausa y a
  cero tras un reinicio. Una animación que se moviera por su cuenta rompería pausa y velocidad.
- **Un solo lienzo de diseño (1920×1080).** El panel y la proyección montan el mismo `Stage`, así
  que la vista previa no es una aproximación: es la misma escena.
- **Los valores se guardan por animación**, en `userData/show.json`, y se revalidan contra la
  ficha al cargar: un parámetro retirado o fuera de rango cae a su valor por defecto.

La proyección y la vista previa llevan cada una su reloj; coinciden al reiniciar, no fotograma a
fotograma. Es deliberado: son vistas independientes y sólo la proyección se ve en sala.

## Transiciones

Una **transición** es una escena con principio y fin que enlaza dos animaciones. Lo importante:
**el cambio de animación ocurre al terminar la transición, nunca al lanzarla**. Mientras corre,
es ella la que se proyecta.

El reloj de la transición vive en el proceso main, no en los renderers: hay dos ventanas y sólo
puede haber una fuente de verdad sobre cuándo termina. Corren a tiempo real, al margen del
multiplicador de velocidad, porque su ritmo ya lo fija su propio parámetro de duración. La pausa
también las congela, y al reanudar se re-programa el final con lo que quedaba.

Arriba del panel está la **secuencia**: *En curso → Transición → Siguiente*. Debajo, dos listas
—animaciones y transiciones— cuyas tarjetas se **arrastran** a los huecos; cada hueco sólo acepta
su tipo y se ilumina al pasar por encima algo que encaja.

- Soltar una animación en **En curso** corta a ella al instante.
- Soltar una transición en el medio la deja en cola; si **Siguiente** está vacío, se rellena con
  el destino sugerido de la ficha (`to`).
- El **play** del hueco central la ejecuta; mientras corre pasa a cancelar y la barra marca el
  avance. Al terminar, la siguiente pasa a estar en curso y la cola se vacía.

La cola (`ShowState.cue`) vive en el main y se persiste. Una transición puede lanzarse hacia
cualquier animación; `from` y `to` son sólo sugerencias, y si la animación en curso no es la
`from`, el panel lo avisa sin impedirlo. Pinchar una tarjeta o un hueco la selecciona y sus
parámetros aparecen a la derecha, bajo el preview.

Las miniaturas viven en `src/renderer/thumbs.tsx` (`THUMBS` y `TRANSITION_THUMBS`): iconos
planos de 24×24, no la escena en pequeño — montarla entera por tarjeta sería carísimo.

### Añadir una transición

1. `src/transitions/<id>/meta.ts` con el `TransitionMeta` (`from`, `to` y un parámetro numérico
   con la clave `durationMs`, que es lo que el main usa para saber cuándo termina).
2. `src/transitions/<id>/Scene.tsx` con el componente `(props: TransitionSceneProps)`.
3. Registrar la ficha en `src/shared/animations.ts` y el componente en
   `src/renderer/transitions.tsx`.
4. Su miniatura en `TRANSITION_THUMBS` (`src/renderer/thumbs.tsx`).

**Audio.** Los archivos van en `assets/audio/` y se asocian en `TRANSITION_AUDIO`
(`src/renderer/transitions.tsx`). Suena sólo en el panel, colocado según el reloj del main, así
que pausa, reinicio y cancelar lo siguen solos. Un parámetro `volume` (0–1) lo regula.

**Destello de salida.** Una transición que termina en un color (p. ej. el despegue, en blanco)
declara `exitFlash` en su ficha; la animación de destino arranca disolviéndose desde ese color
durante `flashOutMs`. Así el corte entre escenas queda tapado por los dos lados.

**Reloj.** La escena de una transición recibe `time` y `progress` calculados con el mismo ancla
que el main (`startedAt`/`elapsedMs`), no con el reloj por fotogramas: así nunca se atrasa
respecto al audio ni al cambio de animación.

La escena recibe `progress` de 0 a 1 además de `time`: se escribe contra el avance, no contra
los segundos, así cambiar la duración no obliga a retocar nada.

`transitions/encendido/` es la plantilla. Enciende la cabina por zonas — centro, laterales y
techo — con `CabinFrame`, que acepta `power` por zona además de `dim`.

## Añadir una animación

Hay un agente para esto: **`habiaunavez-animaciones`**. Conoce la línea gráfica, el kit y el
contrato.

A mano son cuatro pasos:

1. `src/animations/<id>/meta.ts` con el `AnimationMeta` (sin JSX: lo importa el main).
2. `src/animations/<id>/Scene.tsx` con el componente `(props: SceneProps)`.
3. Registrar la ficha en `src/shared/animations.ts`.
4. Registrar el componente en `src/renderer/animations.tsx`.

`animations/cabina-deriva/` es la plantilla.

## Tipos de parámetro

| Tipo | Mando en el panel |
|------|-------------------|
| `number` | Deslizador con valor y unidad |
| `boolean` | Interruptor |
| `color` | Muestras de la paleta + selector libre |
| `select` | Fila de chips |
| `text` | Campo de texto |

`group` reparte los mandos en tarjetas; `hint` añade una línea de ayuda. `showIf` sólo muestra un
mando cuando otro tiene cierto valor, y `quick: true` lo saca de la lista y lo pone justo bajo la
vista previa, para la animación en pantalla: es para lo que se toca en pleno show (el ciclo o el
cambio manual del farol).

La cabina no lleva ningún texto: los rótulos se quitaron a propósito. `PlateLabel` y `LabelBar`
siguen en el kit por si una escena futura los necesita.

## Configuraciones guardadas

Encima de los parámetros de la escena seleccionada (animación o transición) está **Configuraciones
guardadas**: se escribe un nombre y **Guardar** almacena todos sus parámetros y, si la escena tiene
varios estilos, el estilo. Un clic sobre una la aplica; también se pueden sobrescribir con los
valores actuales, renombrar y borrar (con confirmación). La que coincide con lo que se ve ahora se
marca como *En uso*.

Viven en `ShowState.presets` (por escena) y se guardan con el resto del estado en
`userData/show.json`. Al cargar y al aplicar se revalidan contra la ficha actual: un parámetro que
cambió o ya no existe cae a su valor por defecto, y las de escenas eliminadas se descartan.

## Guiones

Un **guion** es una secuencia fija de pasos. Cada paso es una animación con una configuración
guardada (o *Valores actuales*) y la transición con la que se llega a ella, también con su
configuración; sin transición se usa la genérica, **Fundido a negro** (`GENERIC_TRANSITION_ID`).

- Se crean con **+** en la placa *Guion*; el primer paso es lo que está en pantalla.
- Una animación soltada en *Arrastrá una animación…* añade un paso; soltada sobre un paso, lo cambia.
  Una transición soltada sobre un paso fija con cuál se llega a él. Las flechas reordenan.
- **Iniciar guion** corta al primer paso y activa el modo guion: la cola de la secuencia la arma el
  guion (los huecos no aceptan fichas) y **Siguiente**, `→` o `AvPág` lanzan la transición al paso
  siguiente. El número de un paso salta directamente a él. **Detener** vuelve al modo libre, y
  también cortar a mano a otra animación.

La configuración del destino viaja en `RunningTransition.toValues`/`toLook` y se aplica al terminar,
así un paso puede repetir la animación en curso con otra configuración sin cambiarla antes de tiempo.
Viven en `ShowState.guiones`; `ShowState.guion` guarda cuál se edita y el paso en curso.

Una transición con `showsScenes` en su ficha recibe dibujadas la animación de salida (en marcha) y
la de destino (quieta en su primer fotograma) como `from` y `to`: así se hace el fundido. Una ficha
sin `from`/`to` es genérica.

## Estilos: plano, realista y diorama

Debajo de los controles de reproducción, **Estilo** alterna entre *Plano* (la línea gráfica de la
referencia), *Realista* y *Diorama*. Es global, se guarda y lo ven igual el preview y la proyección.
**Realista es el estilo final del show y el que trae una instalación nueva.**

No hay dos versiones de cada fondo: es la misma escena con capas de acabado encima, así que la
composición coincide siempre. Las piezas están en `src/renderer/scene/realism.tsx`:

- `Shaded`: repite una forma con un sombreado translúcido (cilindro, esfera, desvanecido, brillo,
  papel envejecido). Como es blanco/negro transparente, sirve para cualquier color.
- `SoftGlow`, `ContactShadow`, `beamFill`: resplandores, sombras bajo lo que apoya y haces de luz
  que se apagan al llegar al suelo.
- `Vignette`: oscurece los bordes del encuadre.

Sólo degradados, nunca `filter` ni `blur`: la escena se repinta cada fotograma.

**Diorama** es otra cosa: el escenario **reimaginado** como un decorado de capas recortadas, dentro
de la línea gráfica (planos, sin contornos). Busca profundidad con capas a distintas distancias que
se desplazan con una deriva lenta de cámara, bruma entre ellas y siluetas en primer plano; y luz con
rayos de bordes duros, sombras largas, cantos iluminados y charcos de luz. Es un componente aparte
(`src/animations/<id>/Diorama.tsx`, registrado en `DIORAMA_SCENES`) que usa **la misma ficha y los
mismos parámetros** que el plano. Las piezas están en `src/renderer/scene/diorama.tsx`: `Layer`,
`Haze`, `Cut`, `Rays`, `LightPool`, `Halo`, `HangingStar`.

- Cartógrafo: sale al exterior del planeta, con torres de libros gigantes, un mapa colgado entre
  postes, un libro abierto como tarima, telescopio y farolillo bajo estrellas de papel.
- Trono: arcos que se alejan hacia un rosetón a contraluz; el trono en silueta y rayos hasta el suelo.
- Farol: el planeta visto entero, flotando, con el sol y la luna girando a su alrededor.

Cada ficha —de animación o de transición— declara en `looks` los estilos que tiene además del
plano; si el elegido no está, se ve plana y el panel lo avisa. Hoy:

- los tres fondos: `['realista', 'diorama']`;
- la cabina (deriva estelar, nave apagada, nave encendida) y sus transiciones (encendido,
  despegue, aceleración): `['realista']`. El acabado vive en las piezas compartidas —
  `CabinFrame`, `instruments`, `space`, `worlds`—, así que cualquier escena nueva de cabina lo
  hereda: chapa y asientos con volumen, cristal con reflejo, pilotos y botones que irradian su
  color (`ColorGlow`), astros con halo y viñeteado;
- Fundido y Mezcla dibujan las escenas que enlazan, cada una en su estilo;
- Boa y Elefante son imágenes fijas que ya fuerzan su propio acabado;
- Blackout no tiene nada que estilizar.

## Vídeos de ejemplo

```bash
npm run render:ejemplos          # todos
npm run render:ejemplos -- farol  # sólo los que contengan "farol"
npm run render:ejemplos -- diorama --still=6 --set=light=noche  # una imagen fija en ejemplos/fijas/
```

Graba fotograma a fotograma (1920×1080, 30 fps) en `ejemplos/`, cada fondo en los dos estilos
(`<id>.mp4`, `<id>-realista.mp4` y `<id>-diorama.mp4`), que no se sube a git. Como las
escenas son funciones puras del tiempo, el vídeo es exactamente lo que se proyecta aunque el equipo
vaya lento. Qué se graba, cuánto dura y con qué valores está en `JOBS`
(`scripts/render/record.cjs`). Necesita `ffmpeg` en el PATH.
