/// <reference path="../electron-api.d.ts" />
import { useEffect, useRef, useState } from 'react'
import {
  resolveIntroCues,
  INTRO_DESTRUCT_FROM,
  INTRO_TITLE,
  INTRO_SUBTITLE,
  INTRO_TAG,
  INTRO_PROTOCOL_LABEL,
  INTRO_PROTOCOL,
  IntroSceneId,
} from '../constants/intro'
import { playAudio } from '../utils/audio'

/**
 * Audio de la intro que sigue sonando tras el cue `end`. El guion puede cerrar
 * el overlay antes de que termine la pista (la explosión final), así que al
 * terminar de forma natural el audio no se corta: se suelta aquí y acaba solo.
 */
let lingeringAudio: HTMLAudioElement | null = null

/** Corta en seco el audio de la intro que quede sonando (parada manual o nueva ejecución). */
export function stopIntroAudio(): void {
  if (!lingeringAudio) return
  lingeringAudio.pause()
  lingeringAudio.src = ''
  lingeringAudio = null
}

/** Atajo para pasar custom properties tipadas en `style`. */
function vars(v: Record<string, string | number>): React.CSSProperties {
  return v as React.CSSProperties
}

interface IntroOverlayProps {
  /** URL localfile:// del audio de la intro. Si es null la secuencia corre muda. */
  audioUrl: string | null
  /** Texto del punto señalado en el mapa (parámetro reemplazable desde el control). */
  locationText: string
  /** Ajustes manuales del guion: clave del cue → segundo. */
  timings: Record<string, number> | undefined
  volume: number
  exiting: boolean
  /** Se llama en el cue `curtain` (abrir) y al terminar (cerrar) la cortinilla. */
  onCurtainOpen: (open: boolean) => void
  onFinish: () => void
}

export function IntroOverlay({
  audioUrl,
  locationText,
  timings,
  volume,
  exiting,
  onCurtainOpen,
  onFinish,
}: IntroOverlayProps) {
  const [scene, setScene] = useState<IntroSceneId>('idle')
  const [subtitleVisible, setSubtitleVisible] = useState(false)
  const [codeTyping, setCodeTyping] = useState(false)
  const [protocolStep, setProtocolStep] = useState(0)
  const [tagHandleVisible, setTagHandleVisible] = useState(false)
  const [destructCounting, setDestructCounting] = useState(false)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const finishedRef = useRef(false)

  // Refs para no reprogramar la línea de tiempo si cambian los callbacks.
  const onCurtainOpenRef = useRef(onCurtainOpen)
  const onFinishRef = useRef(onFinish)
  onCurtainOpenRef.current = onCurtainOpen
  onFinishRef.current = onFinish

  useEffect(() => {
    // El reloj arranca junto con el audio; la cortinilla ya está quieta porque
    // el proceso principal apagó flip/pulse/wobble antes de emitir 'intro:start'.
    for (const cue of resolveIntroCues(timings)) {
      timersRef.current.push(setTimeout(() => {
        if (cue.scene) setScene(cue.scene)
        switch (cue.key) {
          case 'curtain': onCurtainOpenRef.current(true); break
          case 'subtitle': setSubtitleVisible(true); break
          case 'protocol': setProtocolStep(0); break
          case 'protocol-observe': setProtocolStep(1); break
          case 'protocol-evaluate': setProtocolStep(2); break
          case 'protocol-decide': setProtocolStep(3); break
          case 'code-empty': setCodeTyping(false); break
          case 'code-type': setCodeTyping(true); break
          case 'tag-handle': setTagHandleVisible(true); break
          case 'destruct-count': setDestructCounting(true); break
          case 'end': finishedRef.current = true; onFinishRef.current(); break
        }
      }, Math.max(cue.at, 0) * 1000))
    }

    stopIntroAudio()
    if (audioUrl) {
      const audio = playAudio(audioUrl, volume)
      lingeringAudio = audio
      audio.addEventListener('ended', () => {
        if (lingeringAudio === audio) lingeringAudio = null
      })
    }

    const timers = timersRef.current
    return () => {
      timers.forEach(clearTimeout)
      timersRef.current = []
      // Si la intro terminó sola, el audio sigue hasta el final de la pista;
      // si se interrumpió antes del cue `end`, se corta ya.
      if (!finishedRef.current) stopIntroAudio()
    }
    // Se monta una sola vez por ejecución de la intro (la key la fija el padre).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className={`intro-overlay${exiting ? ' intro-overlay--exiting' : ''}`} data-scene={scene}>
      <div className="intro-grid" />
      <div className="intro-scanlines" />
      <div className="intro-vignette" />

      {scene !== 'idle' && (
        <>
          <div className="intro-hud intro-hud--tl">A.I.S // EXPEDIENTE ABIERTO</div>
          <div className="intro-hud intro-hud--br">NIVEL DE ACCESO — MÁXIMO</div>
        </>
      )}

      <div className="intro-stage-slot">
        {scene === 'brand' && <BrandScene subtitleVisible={subtitleVisible} />}
        {scene === 'jury' && <JuryScene />}
        {scene === 'map' && <MapScene locationText={locationText} />}
        {scene === 'silence' && <SilenceScene />}
        {scene === 'classified' && <ClassifiedScene />}
        {scene === 'tag' && <TagScene handleVisible={tagHandleVisible} />}
        {scene === 'doors' && <DoorsScene />}
        {scene === 'protocol' && <ProtocolScene step={protocolStep} />}
        {scene === 'code' && <CodeScene typing={codeTyping} />}
        {scene === 'alarm' && <AlarmScene />}
        {scene === 'destruct' && <DestructScene counting={destructCounting} />}
      </div>
    </div>
  )
}

/* ── Cue `curtain`: A.I.S (cue `subtitle`: la bajada) ───────────────────── */

function BrandScene({ subtitleVisible }: { subtitleVisible: boolean }) {
  return (
    <div className="intro-stage intro-stage--brand">
      <div className="intro-rule" />
      <div className="intro-brand-title">
        {INTRO_TITLE.split('').map((ch, i) => (
          <span key={i} className="intro-brand-char" style={vars({ '--i': i })}>
            {ch}
          </span>
        ))}
      </div>
      <div className="intro-rule intro-rule--2" />
      <div className={`intro-brand-subtitle${subtitleVisible ? ' is-visible' : ''}`}>
        {INTRO_SUBTITLE}
      </div>
    </div>
  )
}

/* ── Cue `jury`: votación del jurado ────────────────────────────────────── */

const JURY_PADDLES = ['var(--color-success)', 'var(--color-warning)', 'var(--color-danger-soft)']

function JuryScene() {
  return (
    <div className="intro-stage intro-stage--jury">
      <div className="intro-caption">El jurado emite su voto</div>
      <div className="intro-jury-row">
        {JURY_PADDLES.map((color, i) => (
          <div key={i} className="intro-juror" style={vars({ '--i': i })}>
            <div className="intro-juror-paddle" style={vars({ '--paddle': color })} />
            <svg className="intro-juror-body" viewBox="0 0 100 90" aria-hidden="true">
              <circle cx="50" cy="26" r="20" />
              <path d="M8 90c0-24 19-40 42-40s42 16 42 40z" />
            </svg>
          </div>
        ))}
      </div>
      <div className="intro-jury-desk" />
    </div>
  )
}

/* ── Cue `map`: mapa señalando un punto ─────────────────────────────────── */

function MapScene({ locationText }: { locationText: string }) {
  return (
    <div className="intro-stage intro-stage--map">
      <div className="intro-caption">Ubicación de la operación</div>
      <div className="intro-map">
        <svg className="intro-map-svg" viewBox="0 0 400 240" preserveAspectRatio="none" aria-hidden="true">
          <g className="intro-map-grid-lines">
            {Array.from({ length: 15 }, (_, i) => (
              <line key={`v${i}`} x1={i * 28} y1="0" x2={i * 28} y2="240" />
            ))}
            {Array.from({ length: 9 }, (_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 30} x2="400" y2={i * 30} />
            ))}
          </g>
          <g className="intro-map-land">
            <path d="M28 168 L74 120 L120 138 L150 96 L206 108 L232 72 L292 88 L340 62 L372 96 L358 168 L286 190 L214 176 L146 196 L82 188 Z" />
            <path d="M56 44 L104 24 L156 40 L142 70 L92 78 Z" />
            <path d="M262 196 L318 206 L306 230 L258 224 Z" />
          </g>
        </svg>
        <div className="intro-map-cross intro-map-cross--h" />
        <div className="intro-map-cross intro-map-cross--v" />
        <div className="intro-map-pin">
          <span className="intro-map-ping" />
          <span className="intro-map-ping intro-map-ping--2" />
          <svg viewBox="0 0 24 34" aria-hidden="true">
            <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 22 12 22s12-13 12-22c0-6.6-5.4-12-12-12z" />
            <circle className="intro-map-pin-dot" cx="12" cy="12" r="4.5" />
          </svg>
        </div>
      </div>
      <div className="intro-map-label">{locationText}</div>
    </div>
  )
}

/* ── Cue `silence`: celular en modo silencio ────────────────────────────── */

function SilenceScene() {
  return (
    <div className="intro-stage intro-stage--silence">
      <div className="intro-phone">
        <span className="intro-phone-notch" />
        <div className="intro-phone-screen">
          <svg className="intro-phone-bell" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M24 4a3 3 0 0 1 3 3v1.6a12 12 0 0 1 9 11.6v7l3.4 5.1a1.5 1.5 0 0 1-1.3 2.3H9.9a1.5 1.5 0 0 1-1.3-2.3L12 27.2v-7A12 12 0 0 1 21 8.6V7a3 3 0 0 1 3-3z" />
            <path d="M19 37h10a5 5 0 0 1-10 0z" />
            <line className="intro-phone-slash" x1="7" y1="7" x2="41" y2="41" />
          </svg>
          <div className="intro-phone-text">MODO SILENCIO</div>
        </div>
      </div>
      <div className="intro-caption">Silencien sus celulares</div>
    </div>
  )
}

/* ── Cue `classified`: información clasificada ──────────────────────────── */

const REDACTED_WIDTHS = ['82%', '64%', '91%', '48%', '76%', '58%']

function ClassifiedScene() {
  return (
    <div className="intro-stage intro-stage--classified">
      <div className="intro-doc">
        <div className="intro-doc-header">EXPEDIENTE A.I.S — 11/09/25</div>
        {REDACTED_WIDTHS.map((w, i) => (
          <span key={i} className="intro-doc-bar" style={vars({ '--w': w, '--i': i })} />
        ))}
      </div>
      <div className="intro-stamp">CLASIFICADO</div>
      <div className="intro-caption">Información clasificada y confidencial</div>
    </div>
  )
}

/* ── Cue `tag`: la agencia alienta compartir (cue `tag-handle`: @falso_vacio) ── */

function TagScene({ handleVisible }: { handleVisible: boolean }) {
  return (
    <div className="intro-stage intro-stage--tag">
      <div className="intro-caption">La agencia autoriza y alienta compartir esta misión</div>
      <div key={handleVisible ? 'handle' : 'share'} className="intro-tag-plate">
        <span className="intro-tag-sweep" />
        <span className="intro-tag-handle">{handleVisible ? INTRO_TAG : 'Redes sociales'}</span>
      </div>
      <div className="intro-tag-hint">
        {handleVisible ? 'Queremos ver cómo se vivió la misión' : 'Compartan sus reportes'}
      </div>
    </div>
  )
}

/* ── Cue `doors`: puertas que se cierran y se sellan ────────────────────── */

function DoorsScene() {
  return (
    <div className="intro-stage intro-stage--doors">
      <div className="intro-doors">
        <div className="intro-door intro-door--l" />
        <div className="intro-door intro-door--r" />
        <div className="intro-door-seal">
          <svg viewBox="0 0 32 32" aria-hidden="true">
            <path d="M9 14v-3a7 7 0 0 1 14 0v3" />
            <rect x="6" y="14" width="20" height="15" rx="2.5" />
          </svg>
          <span>SELLADO</span>
        </div>
      </div>
      <div className="intro-caption">Nadie entra, nadie sale</div>
    </div>
  )
}

/* ── Cues `protocol` + `protocol-*` ────────────────────────────────────────
   El caption entra solo y cada paso se descubre en su propio cue. Los tres
   huecos se reservan desde el principio para que nada salte al aparecer. */

const PROTOCOL_STEPS = [
  {
    label: 'Observar',
    path: (
      <>
        <path d="M2 24c7-11 14-16 22-16s15 5 22 16c-7 11-14 16-22 16S9 35 2 24z" />
        <circle cx="24" cy="24" r="7" />
      </>
    ),
  },
  {
    label: 'Evaluar',
    path: (
      <>
        <path d="M24 6v34" />
        <path d="M10 14h28" />
        <path d="M14 14 6 30h16z" />
        <path d="M34 14l8 16H26z" />
      </>
    ),
  },
  {
    label: 'Decidir',
    path: (
      <>
        <circle cx="24" cy="24" r="18" />
        <path d="M15 24.5l6.5 6.5L34 18.5" />
      </>
    ),
  },
]

function ProtocolScene({ step }: { step: number }) {
  return (
    <div className="intro-stage intro-stage--protocol">
      <div className="intro-caption">Su misión es</div>
      <div className="intro-protocol-row">
        {PROTOCOL_STEPS.map((s, i) => (
          <div key={s.label} className={`intro-protocol-step${i < step ? ' is-visible' : ''}`}>
            <svg className="intro-protocol-icon" viewBox="0 0 48 48" aria-hidden="true">
              {s.path}
            </svg>
            <span className="intro-protocol-label">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Cues `code-empty` / `code-type` ────────────────────────────────────────
   El terminal entra vacío con el cursor parpadeando («Damos inicio a la
   evaluación»); el nombre del protocolo se teclea en `code-type`, cuando la
   voz lo dice, así que su animación arranca en ese cue. */

function CodeScene({ typing }: { typing: boolean }) {
  return (
    <div className="intro-stage intro-stage--code">
      <div className="intro-caption">Iniciando evaluación</div>
      <div className="intro-terminal">
        <div className="intro-terminal-protocol">{INTRO_PROTOCOL_LABEL}</div>
        <div className="intro-code intro-code--word">
          {typing &&
            INTRO_PROTOCOL.toUpperCase().split('').map((ch, i) => (
              <span key={i} className="intro-code-char" style={vars({ '--i': i })}>
                {ch === ' ' ? '\u00a0' : ch}
              </span>
            ))}
          <span className="intro-code-caret" />
        </div>
        {typing ? (
          <div className="intro-terminal-status">ACCESO CONCEDIDO</div>
        ) : (
          <div className="intro-terminal-status intro-terminal-status--waiting">ESPERANDO AUTORIZACIÓN</div>
        )}
      </div>
    </div>
  )
}

/* ── Cue `alarm`: alarma ────────────────────────────────────────────────── */

function AlarmScene() {
  return (
    <div className="intro-stage intro-stage--alarm">
      <div className="intro-alarm-flash" />
      <div className="intro-beacon">
        <span className="intro-beacon-sweep" />
        <span className="intro-beacon-lamp" />
        <span className="intro-beacon-base" />
      </div>
      <div className="intro-alarm-word">ALERTA</div>
      <div className="intro-caption intro-caption--danger">Evaluación en curso</div>
    </div>
  )
}

/* ── Cue `destruct`: autodestrucción ────────────────────────────────────── */

function DestructScene({ counting }: { counting: boolean }) {
  const [count, setCount] = useState(INTRO_DESTRUCT_FROM)

  // El texto entra con «Este mensaje…»; los números, la barra y el destello
  // arrancan en el cue `destruct-count`, con el «tres» de la locución.
  useEffect(() => {
    if (!counting) return
    const id = setInterval(() => setCount(c => (c > 0 ? c - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [counting])

  return (
    <div
      className="intro-stage intro-stage--destruct"
      style={vars({ '--destruct-duration': `${INTRO_DESTRUCT_FROM}s` })}
    >
      <div className="intro-destruct-text">Este mensaje se autodestruirá en</div>
      {counting ? (
        <>
          <div key={count} className="intro-destruct-count">{count}</div>
          <div className="intro-destruct-bar">
            <span />
          </div>
          <div className="intro-destruct-flash" />
        </>
      ) : (
        // Reserva el hueco del número y la barra para que el texto no salte.
        <div aria-hidden="true" style={{ visibility: 'hidden' }}>
          <div className="intro-destruct-count">{INTRO_DESTRUCT_FROM}</div>
          <div className="intro-destruct-bar" />
        </div>
      )}
    </div>
  )
}
