import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Pause, RotateCcw } from 'lucide-react'
import { INTRO_CUES, INTRO_CUE_MIN_GAP, IntroCueKey } from '../constants/intro'

/** Cuántas columnas dibuja la onda. Más que esto no se distingue a simple vista. */
const WAVE_BUCKETS = 900

interface IntroTimelineProps {
  /** URL localfile:// del audio de la intro. */
  audioUrl: string | null
  /** Ajustes manuales actuales: clave del cue → segundo. */
  timings: Record<string, number>
  onChange: (key: IntroCueKey, at: number) => void
  onReset: () => void
  /** Segundos transcurridos si la intro está corriendo en la proyección. */
  liveElapsed: number | null
}

/** Reduce el buffer a un pico por columna, ya normalizado a 0..1. */
function buildPeaks(buffer: AudioBuffer): Float32Array {
  const data = buffer.getChannelData(0)
  const per = Math.floor(data.length / WAVE_BUCKETS) || 1
  const peaks = new Float32Array(WAVE_BUCKETS)
  let max = 0
  for (let i = 0; i < WAVE_BUCKETS; i++) {
    let peak = 0
    const start = i * per
    for (let j = 0; j < per; j++) {
      const v = Math.abs(data[start + j] ?? 0)
      if (v > peak) peak = v
    }
    peaks[i] = peak
    if (peak > max) max = peak
  }
  if (max > 0) for (let i = 0; i < WAVE_BUCKETS; i++) peaks[i] /= max
  return peaks
}

export function IntroTimeline({ audioUrl, timings, onChange, onReset, liveElapsed }: IntroTimelineProps) {
  const [peaks, setPeaks] = useState<Float32Array | null>(null)
  const [duration, setDuration] = useState(0)
  const [loadError, setLoadError] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [playhead, setPlayhead] = useState(0)
  const [dragging, setDragging] = useState<IntroCueKey | null>(null)

  const trackRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const rafRef = useRef(0)

  const at = useCallback((key: IntroCueKey) => {
    const base = INTRO_CUES.find(c => c.key === key)!.at
    return timings[key] ?? base
  }, [timings])

  // ── Decodifica el audio una vez para dibujar la onda ──
  useEffect(() => {
    if (!audioUrl) return
    let cancelled = false
    const ctx = new AudioContext()
    fetch(audioUrl)
      .then(r => r.arrayBuffer())
      .then(buf => ctx.decodeAudioData(buf))
      .then(decoded => {
        if (cancelled) return
        setPeaks(buildPeaks(decoded))
        setDuration(decoded.duration)
      })
      .catch(() => { if (!cancelled) setLoadError(true) })
      .finally(() => { ctx.close().catch(() => { /* noop */ }) })
    return () => { cancelled = true }
  }, [audioUrl])

  // ── Audio de previsualización, sólo dentro del editor ──
  useEffect(() => {
    if (!audioUrl) return
    const audio = new Audio(audioUrl)
    audioRef.current = audio
    const onEnd = () => { setPlaying(false); setPlayhead(0) }
    audio.addEventListener('ended', onEnd)
    return () => {
      audio.removeEventListener('ended', onEnd)
      audio.pause()
      audio.src = ''
      audioRef.current = null
    }
  }, [audioUrl])

  useEffect(() => {
    if (!playing) return
    const tick = () => {
      if (audioRef.current) setPlayhead(audioRef.current.currentTime)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing])

  // ── Dibujo de la onda (se rehace si cambia el ancho del panel) ──
  const drawWave = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !peaks) return
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(rect.width * dpr)
    canvas.height = Math.round(rect.height * dpr)
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, rect.width, rect.height)

    const mid = rect.height / 2
    const colW = rect.width / peaks.length
    ctx.fillStyle = '#f97316'
    for (let i = 0; i < peaks.length; i++) {
      const h = Math.max(1, peaks[i] * (rect.height - 6))
      ctx.fillRect(i * colW, mid - h / 2, Math.max(colW - 0.4, 0.6), h)
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.16)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, mid)
    ctx.lineTo(rect.width, mid)
    ctx.stroke()
  }, [peaks])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    drawWave()
    const observer = new ResizeObserver(drawWave)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [drawWave])

  const total = duration || 72

  // ── Arrastre de un marcador ──
  const startDrag = (key: IntroCueKey) => (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const track = trackRef.current
    if (!track) return
    const rect = track.getBoundingClientRect()

    // Los vecinos acotan el arrastre para que el guion no se desordene.
    const idx = INTRO_CUES.findIndex(c => c.key === key)
    const prev = INTRO_CUES[idx - 1]
    const next = INTRO_CUES[idx + 1]
    const min = prev ? at(prev.key) + INTRO_CUE_MIN_GAP : 0
    const max = next ? at(next.key) - INTRO_CUE_MIN_GAP : total

    setDragging(key)
    const move = (ev: PointerEvent) => {
      const ratio = (ev.clientX - rect.left) / rect.width
      const seconds = Math.min(Math.max(ratio * total, min), max)
      onChange(key, Math.round(seconds * 10) / 10)
    }
    const up = () => {
      setDragging(null)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const seek = (e: React.PointerEvent) => {
    if (dragging || !trackRef.current || !audioRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const seconds = Math.min(Math.max(((e.clientX - rect.left) / rect.width) * total, 0), total)
    audioRef.current.currentTime = seconds
    setPlayhead(seconds)
  }

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      audio.play().catch(() => { /* el usuario puede reintentar */ })
      setPlaying(true)
    }
  }

  const cursor = liveElapsed ?? (playing || playhead > 0 ? playhead : null)
  const isTweaked = Object.keys(timings).length > 0

  return (
    <div className="itl">
      <div className="itl-toolbar">
        <button className="btn btn-ghost btn-sm" onClick={togglePlay} disabled={!audioUrl}>
          {playing ? <Pause size={12} /> : <Play size={12} />}
          {playing ? 'Pausar' : 'Escuchar'}
        </button>
        <span className="itl-clock">
          {(cursor ?? 0).toFixed(1)}s / {total.toFixed(1)}s
        </span>
        <button className="btn btn-ghost btn-sm" onClick={onReset} disabled={!isTweaked}>
          <RotateCcw size={12} /> Restablecer
        </button>
      </div>

      <div ref={trackRef} className="itl-track" onPointerDown={seek}>
        <canvas ref={canvasRef} className="itl-wave" />
        {!peaks && (
          <span className="itl-wave-status">
            {loadError ? 'No se pudo leer el audio' : audioUrl ? 'Cargando onda…' : 'Sin audio de intro'}
          </span>
        )}

        {INTRO_CUES.map((cue, i) => {
          const seconds = at(cue.key)
          return (
            <div
              key={cue.key}
              className={`itl-cue${dragging === cue.key ? ' itl-cue--dragging' : ''}${i % 2 ? ' itl-cue--low' : ''}${seconds / total > 0.6 ? ' itl-cue--right' : ''}`}
              style={{ left: `${(seconds / total) * 100}%` }}
              onPointerDown={startDrag(cue.key)}
              title={`${cue.label} — ${seconds.toFixed(1)}s`}
            >
              <span className="itl-cue-line" />
              <span className="itl-cue-flag">
                <b>{seconds.toFixed(1)}s</b> {cue.label}
              </span>
            </div>
          )
        })}

        {cursor !== null && (
          <div className="itl-playhead" style={{ left: `${Math.min(cursor / total, 1) * 100}%` }} />
        )}
      </div>

      <div className="itl-rows">
        {INTRO_CUES.map(cue => {
          const seconds = at(cue.key)
          const isCurrent =
            cursor !== null &&
            cursor >= seconds &&
            !INTRO_CUES.some(o => at(o.key) > seconds && at(o.key) <= cursor)
          return (
            <div
              key={cue.key}
              className={`itl-row${isCurrent ? ' itl-row--current' : ''}${timings[cue.key] !== undefined ? ' itl-row--tweaked' : ''}`}
            >
              <input
                className="itl-row-input"
                type="number"
                min={0}
                max={total}
                step={0.1}
                value={seconds}
                onChange={e => {
                  const v = parseFloat(e.target.value)
                  if (!isNaN(v)) onChange(cue.key, Math.min(Math.max(v, 0), total))
                }}
              />
              <span className="itl-row-label">{cue.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
