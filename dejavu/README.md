# DejaVu

Temporizador de proyección: una cuenta atrás a pantalla completa que, al llegar a cero, rebobina
el tiempo hasta el inicio y vuelve a empezar.

Es una de las apps del workspace (ver el README de la raíz). Se abre desde **Falso Vacío Hub** o
directamente:

```bash
npm install
npm run start
```

## Ventanas

- **Panel** — vista previa del tiempo restante, transporte y toda la configuración.
- **Proyección** — pantalla completa, fondo negro y dígitos blancos. Se abre desde el panel,
  eligiendo el monitor.

## Controles

| Ajuste | Qué hace |
|--------|----------|
| Duración | Cuenta atrás inicial (h / min / seg, con atajos de 1 a 30 min) |
| Rebobinado | Cuánto tarda el reloj en volver del cero a la duración completa |
| Bucle | Al terminar el rebobinado arranca otra cuenta atrás |
| Décimas de segundo | Añade un dígito decimal |
| Tamaño de los dígitos | Escala del número en proyección (40 % – 160 %) |
| Milisegundos al final | En los últimos 10 s el reloj añade milisegundos, en un cuerpo más pequeño |
| Teñir los dígitos | A partir del resto que fijes, pasan de blanco a naranja y a rojo |
| Hacer latir los dígitos | Latido que se acelera al acercarse al cero |
| Aviso de tiempo | El resto a partir del cual arrancan los dos anteriores. Se activan por separado |
| Punto de vista | Rótulo opcional bajo el reloj: `Punto de vista: <texto>`. El prefijo es fijo; sólo se edita el texto, y si queda vacío la línea no aparece |

Atajos en el panel: **Espacio** inicia o pausa, **R** rebobina en cualquier momento.

## Notas de implementación

- El reloj vive en el proceso main (`src/main/timer.ts`) y difunde ticks cada 100 ms, así que el
  panel y la proyección muestran siempre el mismo número.
- Cada tick lleva un ancla (`anchorAt`, `rate`) con la que los renderers interpolan por
  fotograma (`src/renderer/useSmoothRemaining.ts`); por eso los milisegundos corren fluidos sin
  difundir a 60 Hz.
- Las reglas de presentación — decimales, color del aviso, ritmo del latido — viven en
  `src/shared/display.ts`, compartidas por la proyección y la vista previa.
- Cada tick se calcula desde un ancla en `Date.now()`, no acumulando intervalos, para que no
  derive con el tiempo.
- El rebobinado interpola desde el valor actual hasta la duración completa, así que **Rebobinar**
  funciona también a mitad de cuenta, no sólo en el cero.
- La configuración se guarda en `userData/settings.json`.
