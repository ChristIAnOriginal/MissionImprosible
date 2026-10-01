import React from 'react'
import { ACCENT, PANEL, SPACE, shade } from '../shared/palette'

/**
 * Miniaturas de las listas y de la secuencia: un icono plano por animación y
 * por transición, dibujado en un lienzo de 24×24.
 *
 * No son la escena en pequeño — montarla entera por tarjeta sería carísimo —,
 * sino un resumen de lo que la distingue, en la misma línea gráfica.
 */

const GLASS = { x: 1.5, y: 4, width: 21, height: 16, rx: 2.6 }

/** El marco común: la ventana de la cabina. */
function Window({ children }: { children: React.ReactNode }) {
  return (
    <>
      <rect {...GLASS} fill={SPACE.deep} />
      <g clipPath="url(#thumb-glass)">{children}</g>
      <rect {...GLASS} fill="none" stroke={shade(SPACE.deep, 0.35)} strokeWidth={1.2} />
    </>
  )
}

export const THUMB_CLIP = (
  <clipPath id="thumb-glass">
    <rect {...GLASS} />
  </clipPath>
)

export const THUMBS: Record<string, React.ReactElement> = {
  // El «sombrero»: la boa cerrada, en gris sobre blanco.
  boa: (
    <>
      <rect x={1.5} y={4} width={21} height={16} rx={2.6} fill="#ffffff" />
      <path d="M 2.6 15.6 C 5 15.4 6.6 15.2 7.4 13.6 C 8.2 11.6 8.6 8.8 10.8 8.6 C 12.6 8.4 13.2 10.2 14.6 10.4 C 16.2 10.6 17 10 17.4 11 C 17.8 12.6 17.8 14.8 19.4 15.2 C 20.4 15.4 21.4 15.3 21.6 15.8 L 21.4 16.4 L 2.8 16.4 Z" fill="#5c5c5c" />
    </>
  ),
  // La boa abierta, con el elefante dentro.
  elefante: (
    <>
      <rect x={1.5} y={4} width={21} height={16} rx={2.6} fill="#ffffff" />
      <path d="M 2.6 15.6 C 5 15.4 6.6 15.2 7.4 13.6 C 8.2 11.6 8.6 8.8 10.8 8.6 C 12.6 8.4 13.2 10.2 14.6 10.4 C 16.2 10.6 17 10 17.4 11 C 17.8 12.6 17.8 14.8 19.4 15.2 C 20.4 15.4 21.4 15.3 21.6 15.8 L 21.4 16.4 L 2.8 16.4 Z" fill="#5c5c5c" />
      <path d="M 7.6 15.4 C 8.4 13 8.8 10 10.8 9.6 C 12.4 9.4 13 10.9 14.6 11.2 C 16 11.4 16.6 11.2 16.8 11.9 C 17.1 13.2 17.2 14.6 17.8 15.4 Z" fill="#262626" />
      <circle cx={10.4} cy={11.6} r={1.5} fill="#8a8a8a" />
      <rect x={10.6} y={11.2} width={5.6} height={2.6} rx={1.2} fill="#8a8a8a" />
      <rect x={11.2} y={13.4} width={1} height={1.8} fill="#8a8a8a" />
      <rect x={15} y={13.4} width={1} height={1.8} fill="#8a8a8a" />
    </>
  ),
  blackout: <rect x={1.5} y={4} width={21} height={16} rx={2.6} fill="#000000" />,

  'cabina-deriva': (
    <Window>
      <circle cx={16.5} cy={10.5} r={4.2} fill={ACCENT.orange} />
      <ellipse
        cx={16.5}
        cy={10.5}
        rx={6.8}
        ry={1.7}
        fill="none"
        stroke={shade(ACCENT.orange, 0.32)}
        strokeWidth={1}
        transform="rotate(-18 16.5 10.5)"
      />
      {/* Estelas: lo que distingue a esta escena es que las estrellas corren. */}
      <g stroke={SPACE.star} strokeWidth={1.1} strokeLinecap="round">
        <line x1={3.2} y1={7.4} x2={6.4} y2={6.6} />
        <line x1={4.6} y1={16.2} x2={8.4} y2={15.2} />
        <line x1={8.2} y1={11.4} x2={10.8} y2={11} />
      </g>
    </Window>
  ),

  'nave-apagada': (
    <Window>
      <circle cx={15.8} cy={10.4} r={4} fill="#dfe5ea" />
      {/* La mordida de la fase sale del color del cielo, como en la escena. */}
      <circle cx={19.4} cy={9.4} r={4} fill={shade(SPACE.deep, 0.1)} />
      <g fill={SPACE.star}>
        <circle cx={5} cy={7.6} r={0.8} />
        <circle cx={8.4} cy={14.6} r={0.7} />
        <circle cx={4.4} cy={16.4} r={0.6} />
      </g>
    </Window>
  ),

  // El cielo de la apagada, con la consola ya en marcha.
  'nave-encendida': (
    <Window>
      <circle cx={15.8} cy={9.6} r={3.6} fill="#dfe5ea" />
      <circle cx={19} cy={8.7} r={3.6} fill={shade(SPACE.deep, 0.1)} />
      <g fill={SPACE.star}>
        <circle cx={5} cy={7.4} r={0.8} />
        <circle cx={8.6} cy={12} r={0.7} />
      </g>
      <rect x={1.5} y={15.4} width={21} height={4.6} fill={shade(SPACE.deep, 0.3)} />
      <g fill={ACCENT.amber}>
        <rect x={4} y={16.8} width={3} height={1.8} rx={0.6} />
        <rect x={10.5} y={16.8} width={3} height={1.8} rx={0.6} />
        <rect x={17} y={16.8} width={3} height={1.8} rx={0.6} />
      </g>
    </Window>
  ),

  // No es una ventana al espacio: el salón claro con el trono en el centro.
  'trono-rey': (
    <>
      <rect x={1.5} y={4} width={21} height={16} rx={2.6} fill={PANEL.plateLight} />
      <polygon points="1.5,20 22.5,20 16,15.6 8,15.6" fill={PANEL.plateEdge} />
      <polygon points="10.2,20 13.8,20 12.9,15.6 11.1,15.6" fill={ACCENT.red} />
      <path d="M 9 15.6 L 9 8.6 L 10.4 7.4 L 12 5.4 L 13.6 7.4 L 15 8.6 L 15 15.6 Z" fill={ACCENT.amber} />
      <path d="M 10.1 13 L 10.1 9.2 L 12 7 L 13.9 9.2 L 13.9 13 Z" fill={ACCENT.red} />
      <rect x={8.4} y={12.6} width={7.2} height={1.6} rx={0.5} fill={ACCENT.amber} />
      <rect x={1.5} y={4} width={21} height={16} rx={2.6} fill="none" stroke={PANEL.plateEdge} strokeWidth={1.2} />
    </>
  ),

  // Un mapa de pergamino con su ruta y la cruz del destino.
  'biblioteca-cartografo': (
    <>
      <rect x={1.5} y={4} width={21} height={16} rx={2.6} fill={shade(ACCENT.orange, -0.55)} />
      <rect x={3.4} y={5.8} width={17.2} height={12.4} rx={1} fill={shade(ACCENT.amber, 0.72)} />
      <path d="M 5 9 Q 7 6.8 9.4 7.8 Q 10.4 10.6 8.6 12.4 Q 9 15.4 7 16 Q 5.2 13 5 9 Z" fill={shade(ACCENT.orange, 0.42)} />
      <path d="M 12.6 8 Q 15.8 6.6 18.6 8.4 Q 18.4 11 16 11.6 Q 14 13.2 13 11 Q 12 9.6 12.6 8 Z" fill={shade(ACCENT.orange, 0.42)} />
      <polyline points="8,10.6 11,11.8 14,11.2 15.4,14.4" fill="none" stroke={shade(ACCENT.orange, -0.6)} strokeWidth={0.7} strokeDasharray="1 0.8" />
      <g stroke={ACCENT.red} strokeWidth={0.9} strokeLinecap="round">
        <line x1={14.6} y1={13.6} x2={16.2} y2={15.2} />
        <line x1={14.6} y1={15.2} x2={16.2} y2={13.6} />
      </g>
    </>
  ),

  // Mitad día, mitad noche sobre el planeta diminuto, con el farol en medio.
  'farol-enano': (
    <>
      <defs>
        <clipPath id="thumb-farol">
          <rect x={1.5} y={4} width={21} height={16} rx={2.6} />
        </clipPath>
      </defs>
      <g clipPath="url(#thumb-farol)">
        <rect x={1.5} y={4} width={10.5} height={16} fill={shade(ACCENT.blue, 0.45)} />
        <rect x={12} y={4} width={10.5} height={16} fill={SPACE.deep} />
        <circle cx={5.6} cy={8.2} r={2.2} fill={ACCENT.amber} />
        <circle cx={18.6} cy={7.6} r={1.8} fill="#dfe5ea" />
        <circle cx={15.4} cy={6.2} r={0.5} fill={SPACE.star} />
        <circle cx={12} cy={40} r={25} fill={shade(ACCENT.orange, 0.5)} />
        <polygon points="11.3,11 12.7,11 16,15.6 8,15.6" fill={ACCENT.amber} opacity={0.3} />
      </g>
      <rect x={11.6} y={10.4} width={0.8} height={5.4} rx={0.4} fill={PANEL.bezel} />
      <polygon points="11.2,10.6 12.8,10.6 13.3,8.4 10.7,8.4" fill={shade(ACCENT.amber, 0.35)} />
      <path d="M 10.4 8.6 L 13.6 8.6 L 12.8 7.6 L 11.2 7.6 Z" fill={PANEL.bezel} />
    </>
  ),
}

/**
 * Transiciones: la misma ventana, con lo que cambia durante el paso. El
 * encendido enseña sus tres tandas de luz — centro, laterales, techo — en el
 * orden en que se prenden.
 */
export const TRANSITION_THUMBS: Record<string, React.ReactElement> = {
  // Dos imágenes que se funden: la de destino aparece encima, translúcida.
  mezcla: (
    <>
      <rect x={1.5} y={4} width={21} height={16} rx={2.6} fill={shade(ACCENT.orange, 0.42)} />
      <circle cx={8} cy={10} r={3.2} fill={ACCENT.amber} />
      <rect x={1.5} y={15} width={21} height={5} fill={shade(ACCENT.amber, 0.3)} />
      <rect x={1.5} y={4} width={21} height={16} rx={2.6} fill={SPACE.deep} opacity={0.55} />
      <circle cx={16.6} cy={9.4} r={2.8} fill="#dfe5ea" opacity={0.9} />
      <circle cx={18} cy={8.8} r={2.4} fill={SPACE.deep} opacity={0.6} />
      <rect x={1.5} y={4} width={21} height={16} rx={2.6} fill="none" stroke={PANEL.bezel} strokeWidth={1.2} />
    </>
  ),
  // Una imagen que se hunde en negro de izquierda a derecha.
  fundido: (
    <>
      <defs>
        <linearGradient id="thumb-fundido" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={shade(ACCENT.blue, 0.35)} />
          <stop offset="0.75" stopColor="#000000" />
        </linearGradient>
      </defs>
      <rect x={1.5} y={4} width={21} height={16} rx={2.6} fill="url(#thumb-fundido)" />
      <circle cx={6.4} cy={9.4} r={2.2} fill={ACCENT.amber} opacity={0.85} />
      <rect x={1.5} y={4} width={21} height={16} rx={2.6} fill="none" stroke={PANEL.bezel} strokeWidth={1.2} />
    </>
  ),

  encendido: (
    <>
      <rect x={1.5} y={4} width={21} height={16} rx={2.6} fill={shade(SPACE.deep, -0.2)} />
      <circle cx={16.6} cy={9.6} r={2.6} fill="#dfe5ea" opacity={0.5} />
      <rect x={4} y={5.6} width={16} height={1.8} rx={0.9} fill={ACCENT.amber} opacity={0.35} />
      <rect x={3.4} y={10} width={2} height={5.6} rx={1} fill={ACCENT.amber} opacity={0.65} />
      <rect x={18.6} y={10} width={2} height={5.6} rx={1} fill={ACCENT.amber} opacity={0.65} />
      <rect x={8} y={15.2} width={8} height={2.6} rx={1.2} fill={ACCENT.amber} />
      <rect
        x={1.5}
        y={4}
        width={21}
        height={16}
        rx={2.6}
        fill="none"
        stroke={shade(SPACE.deep, 0.35)}
        strokeWidth={1.2}
      />
    </>
  ),

  // El despegue: estrellas estiradas hacia el punto de fuga y el blanco final.
  despegue: (
    <Window>
      <g stroke={SPACE.star} strokeWidth={1.2} strokeLinecap="round">
        <line x1={9} y1={10} x2={3.4} y2={6.6} />
        <line x1={15} y1={10} x2={20.6} y2={6.4} />
        <line x1={9.4} y1={14} x2={3.6} y2={18.2} />
        <line x1={14.6} y1={14} x2={20.4} y2={18.4} />
        <line x1={12} y1={9} x2={12} y2={5} />
      </g>
      <circle cx={12} cy={12} r={3.6} fill="#dcebff" opacity={0.5} />
      <circle cx={12} cy={12} r={2} fill="#ffffff" />
    </Window>
  ),

  // La aceleración: estelas largas y el planeta que asoma al fondo.
  aceleracion: (
    <Window>
      <g stroke={SPACE.star} strokeWidth={1.1} strokeLinecap="round">
        <line x1={8.4} y1={9.6} x2={2.6} y2={5.6} />
        <line x1={8.2} y1={14.4} x2={2.6} y2={18.4} />
        <line x1={17.8} y1={17} x2={21.4} y2={19.2} />
        <line x1={9.6} y1={12} x2={3} y2={12} />
      </g>
      <circle cx={15} cy={11.4} r={4.6} fill={ACCENT.blue} />
      <path d="M 12 10 Q 13.4 8.2 15.4 9.4 Q 14.8 11.4 12.8 11.8 Z" fill={ACCENT.green} />
      <path d="M 15.6 12.6 Q 17.8 11.8 18.6 13.4 Q 17 15.2 15.8 14.2 Z" fill={ACCENT.green} />
    </Window>
  ),
}

/** Miniatura suelta, para usarla en HTML. */
export function Thumb({ id, kind }: { id: string; kind: 'animation' | 'transition' }) {
  const art = (kind === 'animation' ? THUMBS : TRANSITION_THUMBS)[id]
  return (
    <svg viewBox="0 0 24 24" className="thumb" aria-hidden>
      <defs>{THUMB_CLIP}</defs>
      {art ?? <rect x={1.5} y={4} width={21} height={16} rx={2.6} fill={SPACE.deep} />}
    </svg>
  )
}
