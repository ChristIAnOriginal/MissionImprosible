/// <reference path="../electron-api.d.ts" />
import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react'
import { AppState } from '../../shared/types'
import { RATING_LABELS, RATING_COLORS } from '../constants/ratings'
import { CHALLENGES } from '../constants/challenges'
import { playAudio, playAudioTimed, normalizeVolume } from '../utils/audio'


function addModificableClass(svgContent: string): string {
  return svgContent.replace(/\bclass="([^"]*)"/g, (match, classes) => {
    const list = classes.split(/\s+/)
    const hasFill = list.some((c: string) => c === 'st1' || c === 'st4')
    const hasStroke = list.includes('st3')
    if (hasFill && !list.includes('modificable')) {
      return `class="${classes} modificable"`
    }
    if (hasStroke && !list.includes('modificable-stroke')) {
      return `class="${classes} modificable-stroke"`
    }
    return match
  })
}

function toLocalFile(absPath: string | null): string | null {
  if (!absPath) return null
  const normalized = absPath.replace(/\\/g, '/')
  const encoded = normalized.split('/').map((seg, i) =>
    i === 0 && /^[A-Za-z]:$/.test(seg) ? seg : encodeURIComponent(seg)
  ).join('/')
  return `localfile:///${encoded}`
}

function toVideoSrc(absPath: string | null): string | null {
  if (!absPath) return null
  const normalized = absPath.replace(/\\/g, '/')
  const encoded = normalized.split('/').map((seg, i) =>
    i === 0 && /^[A-Za-z]:$/.test(seg) ? seg : encodeURIComponent(seg)
  ).join('/')
  return `file:///${encoded}`
}



export function ProjectionApp() {
  const [state, setState] = useState<AppState | null>(null)
  const [announcement, setAnnouncement] = useState<string | null>(null)
  const [missionAnnouncement, setMissionAnnouncement] = useState<string | null>(null)
  const [missionAnnouncingOut, setMissionAnnouncingOut] = useState(false)
  const [scoreFlash, setScoreFlash] = useState<Record<string, number>>({})
  const prevScoresRef = useRef<Record<string, number>>({})
  const [missionExiting, setMissionExiting] = useState(false)
  const lastMissionRef = useRef<NonNullable<AppState['missionView']> | null>(null)
  const volumeRef = useRef<number>(100)
  const [activeRatings, setActiveRatings] = useState<Record<string, string> | null>(null)
  const [ratingsExiting, setRatingsExiting] = useState(false)
  const [rouletteVisible, setRouletteVisible] = useState(false)
  const [rouletteExiting, setRouletteExiting] = useState(false)
  const [rouletteWinner, setRouletteWinner] = useState<number | null>(null)
  const [rouletteRevealed, setRouletteRevealed] = useState(false)
  const rouletteCanvasRef = useRef<HTMLCanvasElement>(null)
  const rouletteAnimRef = useRef<number>(0)
  const rouletteTargetRef = useRef<number>(0)
  const rouletteAudioCtxRef = useRef<AudioContext | null>(null)
  const roulettePrevSegRef = useRef<number>(-1)
  const missionSfxMapRef = useRef<Record<string, string>>({})
  const challengeSfxMapRef = useRef<Record<string, string>>({})
  const challengeNamesRef = useRef<string[]>(CHALLENGES)
  const rouletteNamesRef = useRef<string[]>([])
  const soundObjetivoRef = useRef<string | null>(null)
  const soundPuntajeRef = useRef<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [svgLogoContent, setSvgLogoContent] = useState<string | null>(null)
  const [svgLogoOrangeContent, setSvgLogoOrangeContent] = useState<string | null>(null)
  const [curtainMounted, setCurtainMounted] = useState(true)
  const [curtainVisible, setCurtainVisible] = useState(true)
  const prevCurtainRef = useRef<boolean>(true)
  const prevCinematicRef = useRef<string | null | undefined>(null)
  const curtainTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [audioWobbleActive, setAudioWobbleActive] = useState(false)
  const curtainOverlayRef = useRef<HTMLDivElement>(null)

  // Improsible finale state
  const [improsiblePhase, setImprosiblePhase] = useState<null | 'title' | 'barrel' | 'vs' | 'final'>(null)
  const [improsibleFinalists, setImprosibleFinalists] = useState<[string, string] | null>(null)
  const [improsibleWinnerId, setImprosibleWinnerId] = useState<string | null>(null)
  const improsibleTimers = useRef<ReturnType<typeof setTimeout>[]>([])

  useLayoutEffect(() => {
    if (!state) return
    const curr = state.curtain ?? false
    const prev = prevCurtainRef.current
    const cinemaJustEnded = !!prevCinematicRef.current && !state.activeCinematic
    prevCurtainRef.current = curr
    prevCinematicRef.current = state.activeCinematic
    if (curr === prev) return
    if (curr) {
      if (curtainTimerRef.current) clearTimeout(curtainTimerRef.current)
      setCurtainMounted(true)
      if (cinemaJustEnded) {
        setCurtainVisible(true)
      } else {
        requestAnimationFrame(() => requestAnimationFrame(() => setCurtainVisible(true)))
      }
    } else {
      setCurtainVisible(false)
      curtainTimerRef.current = setTimeout(() => setCurtainMounted(false), 600)
    }
  }, [state?.curtain, state?.activeCinematic])

  useEffect(() => {
    const unsub = window.electronAPI.onStateUpdate((s) => {
      setState(s)
      volumeRef.current = s.volume ?? 100
    })
    window.electronAPI.getState()
    return unsub
  }, [])

  useEffect(() => {
    ;window.electronAPI.getMissions().then((missions: { name: string; audioPath: string | null }[]) => {
      const map: Record<string, string> = {}
      for (const m of missions) {
        if (m.audioPath) map[m.name] = toLocalFile(m.audioPath)!
      }
      missionSfxMapRef.current = map
      console.log('[mission] sfxMap built:', map)
    })
    ;window.electronAPI.getChallenges().then((challenges: { name: string; audioPath: string | null }[]) => {
      const sfx: Record<string, string> = {}
      const names: string[] = []
      for (const c of challenges) {
        names.push(c.name)
        if (c.audioPath) sfx[c.name] = toLocalFile(c.audioPath)!
      }
      challengeSfxMapRef.current = sfx
      challengeNamesRef.current = names
    })
    ;window.electronAPI.getSounds().then((sounds: Record<string, string | null>) => {
      soundObjetivoRef.current = toLocalFile(sounds.objetivo ?? null)
      soundPuntajeRef.current = toLocalFile(sounds.puntaje ?? null)
    })
    ;window.electronAPI.getLogoPath().then((p: string | null) => {
      setLogoUrl(toLocalFile(p))
    })
    ;window.electronAPI.getSvgLogoContent().then(c => setSvgLogoContent(addModificableClass(c)))
    ;window.electronAPI.getSvgLogoOrangeContent().then(c => setSvgLogoOrangeContent(addModificableClass(c)))
  }, [])

  useEffect(() => {
    if (!state?.logoVersion) return
    ;window.electronAPI.getLogoPath().then((p: string | null) => {
      setLogoUrl(p ? toLocalFile(p) + '?v=' + state.logoVersion : null)
    })
  }, [state?.logoVersion])

  useEffect(() => {
    const path = state?.activeCinematicAudio
    if (!path) return
    const url = toLocalFile(path)
    if (!url) return

    const audio = new Audio(url)
    audio.crossOrigin = 'anonymous'
    audio.volume = normalizeVolume(volumeRef.current)

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()
    const source = ctx.createMediaElementSource(audio)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 1024
    analyser.smoothingTimeConstant = 0.3
    source.connect(analyser)
    analyser.connect(ctx.destination)

    const timeBuf = new Uint8Array(analyser.fftSize)
    const freqBuf = new Uint8Array(analyser.frequencyBinCount)
    let smoothed = 0
    let rafId = 0

    const tick = () => {
      analyser.getByteTimeDomainData(timeBuf)
      analyser.getByteFrequencyData(freqBuf)

      let sumSq = 0
      for (let i = 0; i < timeBuf.length; i++) {
        const v = (timeBuf[i] - 128) / 128
        sumSq += v * v
      }
      const rms = Math.min(1, Math.sqrt(sumSq / timeBuf.length) * 2.5)

      let weighted = 0
      let total = 0
      for (let i = 0; i < freqBuf.length; i++) {
        weighted += i * freqBuf[i]
        total += freqBuf[i]
      }
      const centroid = total > 0 ? (weighted / total) / freqBuf.length : 0

      const intensity = 0.6 * rms + 0.4 * centroid
      smoothed = smoothed + 0.25 * (intensity - smoothed)

      const duration = 2.0 - smoothed * (2.0 - 0.12)
      const amp = 0.3 + smoothed * (1.8 - 0.3)

      const el = curtainOverlayRef.current
      if (el) {
        el.style.setProperty('--wobble-duration', `${duration.toFixed(3)}s`)
        el.style.setProperty('--wobble-amp', amp.toFixed(3))
      }

      rafId = requestAnimationFrame(tick)
    }

    const handleEnded = () => {
      window.electronAPI.updateAppState({
        activeCinematicAudio: null,
        activeCinematicAudioName: null,
      })
    }
    audio.addEventListener('ended', handleEnded)

    setAudioWobbleActive(true)
    const startPlayback = () => {
      audio.play().catch(err => console.warn('[cinematic-audio] play failed', err))
      rafId = requestAnimationFrame(tick)
    }
    if (ctx.state === 'suspended') {
      ctx.resume().then(startPlayback)
    } else {
      startPlayback()
    }

    return () => {
      cancelAnimationFrame(rafId)
      audio.removeEventListener('ended', handleEnded)
      audio.pause()
      audio.src = ''
      try { source.disconnect() } catch { /* noop */ }
      try { analyser.disconnect() } catch { /* noop */ }
      try { ctx.close() } catch { /* noop */ }
      const el = curtainOverlayRef.current
      if (el) {
        el.style.removeProperty('--wobble-duration')
        el.style.removeProperty('--wobble-amp')
      }
      setAudioWobbleActive(false)
    }
  }, [state?.activeCinematicAudio])

  useEffect(() => {
    if (!state) return
    const prev = prevScoresRef.current
    const updates: Record<string, number> = {}
    for (const p of state.participants) {
      if (prev[p.id] !== undefined && prev[p.id] !== p.score) {
        updates[p.id] = (scoreFlash[p.id] ?? 0) + 1
      }
      prev[p.id] = p.score
    }
    if (Object.keys(updates).length > 0) {
      setScoreFlash(f => ({ ...f, ...updates }))
    }
  }, [state?.participants])

  useLayoutEffect(() => {
    if (!state) return
    const mv = state.missionView
    if (mv?.active) {
      lastMissionRef.current = mv
      setMissionExiting(false)
    } else if (lastMissionRef.current) {
      setMissionExiting(true)
      setTimeout(() => {
        setMissionExiting(false)
        lastMissionRef.current = null
      }, 900)
    }
  }, [state?.missionView?.active])

  useEffect(() => {
    const unsub = window.electronAPI.onObjectiveAnnounce((name) => {
      setAnnouncement(name)
      if (soundObjetivoRef.current) playAudio(soundObjetivoRef.current, volumeRef.current)
      setTimeout(() => setAnnouncement(null), 5000)
    })
    return unsub
  }, [])

  useEffect(() => {
    const unsub = window.electronAPI.onShowRatings((r) => {
      setRatingsExiting(false)
      setActiveRatings(r)
      const hasScored = Object.values(r).some(v => v === 'excelente' || v === 'aceptable' || v === 'regular')
      if (hasScored && soundPuntajeRef.current) playAudio(soundPuntajeRef.current, volumeRef.current)
    })
    return unsub
  }, [])

  useEffect(() => {
    const unsub = window.electronAPI.onClearRatings(() => {
      setRatingsExiting(true)
      setTimeout(() => { setActiveRatings(null); setRatingsExiting(false) }, 600)
    })
    return unsub
  }, [])

  useEffect(() => {
    const unsub = window.electronAPI.onMissionAnnounce((name) => {
      console.log('[mission] onMissionAnnounce fired — name:', name)
      console.log('[mission] sfxMap keys:', Object.keys(missionSfxMapRef.current))
      setMissionAnnouncement(name)
      setMissionAnnouncingOut(false)
      const sfxUrl = missionSfxMapRef.current[name]
      console.log('[mission] sfxUrl resolved:', sfxUrl)
      if (sfxUrl) {
        playAudioTimed(sfxUrl, volumeRef.current, (remaining) => {
          console.log('[mission cinematic] onDuration callback — remaining:', remaining, 'ms')
          const dur = remaining > 200 ? remaining : 0
          if (dur > 0) {
            setTimeout(() => setMissionAnnouncingOut(true), Math.max(dur - 600, 0))
            setTimeout(() => { setMissionAnnouncement(null); setMissionAnnouncingOut(false) }, dur)
          } else {
            setMissionAnnouncingOut(true)
            setTimeout(() => { setMissionAnnouncement(null); setMissionAnnouncingOut(false) }, 600)
          }
        })
      } else {
        setTimeout(() => setMissionAnnouncingOut(true), 4400)
        setTimeout(() => { setMissionAnnouncement(null); setMissionAnnouncingOut(false) }, 5000)
      }
    })
    return unsub
  }, [])

  const drawWheel = useCallback((angle: number, highlightWinner: number | null) => {
    const canvas = rouletteCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    const cx = W / 2, cy = H / 2
    const R = Math.min(W, H) * 0.42
    const names = rouletteNamesRef.current
    const n = names.length
    const slice = (2 * Math.PI) / n
    const colors = ['#f97316','#ea580c','#c2410c','#9a3412','#7c2d12','#fb923c','#ea580c','#c2410c','#9a3412']

    ctx.clearRect(0, 0, W, H)

    for (let i = 0; i < n; i++) {
      const start = angle + i * slice
      const end = start + slice
      const isWinner = highlightWinner !== null && i === highlightWinner
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, R, start, end)
      ctx.closePath()
      ctx.fillStyle = isWinner ? '#fff' : colors[i % colors.length]
      ctx.fill()
      ctx.strokeStyle = '#111'
      ctx.lineWidth = 2
      ctx.stroke()

      // Text: smaller, pushed toward rim, centered in segment
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(start + slice / 2)
      ctx.textAlign = 'right'
      ctx.fillStyle = isWinner ? '#f97316' : '#fff'
      ctx.font = `bold ${Math.round(R * 0.065)}px 'Arial Black', Arial`
      ctx.fillText(names[i], R * 0.96, Math.round(R * 0.025))
      ctx.restore()
    }

    // Center circle
    ctx.beginPath()
    ctx.arc(cx, cy, R * 0.1, 0, 2 * Math.PI)
    ctx.fillStyle = '#111'
    ctx.fill()
    ctx.strokeStyle = '#f97316'
    ctx.lineWidth = 3
    ctx.stroke()

    // Pointer at top — tip points down into the wheel
    ctx.beginPath()
    ctx.moveTo(cx, cy - R - 8)
    ctx.lineTo(cx - 16, cy - R - 38)
    ctx.lineTo(cx + 16, cy - R - 38)
    ctx.closePath()
    ctx.fillStyle = '#f97316'
    ctx.fill()
  }, [])

  // Start animation after canvas mounts (rouletteVisible triggers render first)
  useEffect(() => {
    if (!rouletteVisible) return
    cancelAnimationFrame(rouletteAnimRef.current)
    roulettePrevSegRef.current = -1

    const winnerIndex = rouletteTargetRef.current
    const n = rouletteNamesRef.current.length
    const slice = (2 * Math.PI) / n
    const targetAngle = -Math.PI / 2 - (winnerIndex * slice + slice / 2)

    if (!rouletteAudioCtxRef.current) {
      rouletteAudioCtxRef.current = new AudioContext()
    }
    const audioCtx = rouletteAudioCtxRef.current
    if (audioCtx.state === 'suspended') audioCtx.resume()

    const freqBase = state?.rouletteTickBase ?? 180
    const freqRange = state?.rouletteTickRange ?? 520

    const playTick = (speed: number) => {
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      osc.connect(gain)
      gain.connect(audioCtx.destination)
      osc.frequency.value = freqBase + speed * freqRange
      osc.type = 'triangle'
      const vol = Math.min(0.35, 0.1 + speed * 0.25) * normalizeVolume(volumeRef.current)
      gain.gain.setValueAtTime(vol, audioCtx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.045)
      osc.start(audioCtx.currentTime)
      osc.stop(audioCtx.currentTime + 0.045)
    }

    const totalAngle = 8 * 2 * Math.PI + targetAngle
    const duration = 5500
    const startTime = performance.now()

    const animate = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 4)
      const currentAngle = totalAngle * eased
      const rawSeg = Math.floor((-Math.PI / 2 - currentAngle) / slice)
      const seg = ((rawSeg % n) + n) % n
      if (seg !== roulettePrevSegRef.current) {
        roulettePrevSegRef.current = seg
        playTick(1 - eased)
      }
      drawWheel(currentAngle, null)
      if (t < 1) {
        rouletteAnimRef.current = requestAnimationFrame(animate)
      } else {
        drawWheel(totalAngle, winnerIndex)
        setRouletteWinner(winnerIndex)
        setTimeout(() => {
          setRouletteRevealed(true)
          const sfxUrl = challengeSfxMapRef.current[rouletteNamesRef.current[winnerIndex]]
          const hideRoulette = (delay: number) => {
            const FADE = 600
            setTimeout(() => setRouletteExiting(true), Math.max(delay - FADE, 0))
            setTimeout(() => { setRouletteVisible(false); setRouletteWinner(null); setRouletteRevealed(false); setRouletteExiting(false) }, delay)
          }
          if (sfxUrl) {
            playAudioTimed(sfxUrl, volumeRef.current, (remaining) => {
              hideRoulette(remaining > 200 ? remaining : 5000)
            })
          } else {
            hideRoulette(5000)
          }
        }, 2000)
      }
    }
    rouletteAnimRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rouletteAnimRef.current)
  }, [rouletteVisible, drawWheel])

  const improsibleAudioRef = useRef<HTMLAudioElement | null>(null)
  const improsibleAudioCleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const clearTimers = () => {
      improsibleTimers.current.forEach(clearTimeout)
      improsibleTimers.current = []
    }
    const clearAudio = () => {
      // Ejecutar el cleanup del listener antes de detener el audio
      if (improsibleAudioCleanupRef.current) {
        improsibleAudioCleanupRef.current()
        improsibleAudioCleanupRef.current = null
      }
      if (improsibleAudioRef.current) {
        improsibleAudioRef.current.pause()
        improsibleAudioRef.current.currentTime = 0
        improsibleAudioRef.current = null
      }
    }
    const startBarrelPhase = () => {
      // barrel: 3s (1s A + 1s B + 1s logo) | vs: después de barrel
      const t2 = setTimeout(() => setImprosiblePhase('vs'), 3000)
      improsibleTimers.current.push(t2)
      setImprosiblePhase('barrel')
    }
    const unsub = window.electronAPI.onImprosibleStart((finalistIds, audioPath) => {
      clearTimers()
      clearAudio()
      setImprosibleFinalists(finalistIds)
      setImprosiblePhase('title')
      // Reproducir M_Final.wav; transición a barrel al terminar el audio
      const FALLBACK_MS = 5000
      if (audioPath) {
        const audioUrl = toLocalFile(audioPath)
        if (audioUrl) {
          const audio = playAudio(audioUrl, volumeRef.current)
          improsibleAudioRef.current = audio
          let barrelStarted = false
          const goBarrel = () => {
            if (barrelStarted) return
            barrelStarted = true
            startBarrelPhase()
          }
          // Fallback: si el audio no termina en un tiempo razonable, avanzar igual
          const tFallback = setTimeout(goBarrel, 60000)
          improsibleTimers.current.push(tFallback)
          const onError = () => {
            clearTimeout(tFallback)
            const idx = improsibleTimers.current.indexOf(tFallback)
            if (idx !== -1) improsibleTimers.current.splice(idx, 1)
            const t = setTimeout(goBarrel, FALLBACK_MS)
            improsibleTimers.current.push(t)
          }
          audio.addEventListener('ended', goBarrel)
          audio.addEventListener('error', onError)
          // Guardar cleanup para poder remover los listeners al limpiar
          improsibleAudioCleanupRef.current = () => {
            barrelStarted = true // evitar que goBarrel dispare tras cleanup
            audio.removeEventListener('ended', goBarrel)
            audio.removeEventListener('error', onError)
            clearTimeout(tFallback)
          }
          return
        }
      }
      // Sin audio: fallback directo
      const t1 = setTimeout(startBarrelPhase, FALLBACK_MS)
      improsibleTimers.current = [t1]
    })
    return () => { clearTimers(); clearAudio(); unsub() }
  }, [])

  useEffect(() => {
    const unsub = window.electronAPI.onImprosibleClear(() => {
      improsibleTimers.current.forEach(clearTimeout)
      improsibleTimers.current = []
      if (improsibleAudioRef.current) {
        improsibleAudioRef.current.pause()
        improsibleAudioRef.current = null
      }
      setImprosiblePhase(null)
      setImprosibleFinalists(null)
      setImprosibleWinnerId(null)
    })
    return unsub
  }, [])

  useEffect(() => {
    const unsub = window.electronAPI.onImprosibleFinalStart((winnerId) => {
      setImprosibleWinnerId(winnerId)
      setImprosiblePhase('final')
    })
    return unsub
  }, [])

  useEffect(() => {
    const unsub = window.electronAPI.onRouletteStart((winnerIndex: number, challenges: string[], skipAnimation: boolean) => {
      cancelAnimationFrame(rouletteAnimRef.current)
      rouletteNamesRef.current = challenges
      rouletteTargetRef.current = winnerIndex
      if (skipAnimation) {
        setRouletteWinner(winnerIndex)
        setRouletteRevealed(true)
        setRouletteVisible(false)
        const sfxUrl = challengeSfxMapRef.current[challenges[winnerIndex]]
        const hideReveal = (delay: number) => {
          const FADE = 600
          setTimeout(() => setRouletteExiting(true), Math.max(delay - FADE, 0))
          setTimeout(() => { setRouletteWinner(null); setRouletteRevealed(false); setRouletteExiting(false) }, delay)
        }
        if (sfxUrl) {
          playAudioTimed(sfxUrl, volumeRef.current, (remaining) => {
            hideReveal(remaining > 200 ? remaining : 5000)
          })
        } else {
          hideReveal(5000)
        }
      } else {
        setRouletteWinner(null)
        setRouletteRevealed(false)
        setRouletteVisible(true)
      }
    })
    return () => { unsub(); cancelAnimationFrame(rouletteAnimRef.current) }
  }, [])

  if (!state) return <div className="projection-root" />

  const mv = state.missionView?.active ? state.missionView : (missionExiting ? lastMissionRef.current : null)

  if (mv?.active || missionExiting) {
    const activePlayers = new Set(state.participants.slice(0, state.visibleParticipants).map(p => p.id))
    const activeList = state.participants.filter(p => activePlayers.has(p.id))

    // Misma tarjeta que la vista de puntuaciones, sin el puntaje.
    const missionCard = (p: AppState['participants'][number]) => (
      <div key={p.id} className="participant-card">
        <div className="participant-photo" style={{ filter: p.eliminated ? 'grayscale(100%)' : 'none', transition: 'filter 0.4s' }}>
          {p.photoPath
            ? <img src={toLocalFile(p.photoPath) ?? ''} alt={p.name} />
            : <div className="photo-placeholder">FOTO</div>}
          {activeRatings && activeRatings[p.id] && (
            <div className={`rating-badge${ratingsExiting ? ' rating-badge--exiting' : ''}`} style={{ color: RATING_COLORS[activeRatings[p.id]] }}>
              {RATING_LABELS[activeRatings[p.id]]}
            </div>
          )}
        </div>
        <div className="participant-name" style={{ background: p.eliminated ? '#4b5563' : undefined, transition: 'background 0.4s' }}>{p.name}</div>
      </div>
    )

    const missionHeader = (
      <div className="mission-header-bar">
        <h1 className="header-title">
          <span className="title-mision">MISIÓN </span>
          <span className="title-impro">IMPRO</span>
          <span className="title-sible">SIBLE</span>
        </h1>
        <div className="mission-name-label">{mv!.name}</div>
      </div>
    )

    if (mv!.allPlay) {
      return (
        <div className={`projection-root mission-view${missionExiting ? ' mission-view--exiting' : ''}`}>
          {missionHeader}
          <div className="participants">
            {activeList.map(missionCard)}
          </div>
        </div>
      )
    }

    // Duelo: siempre 1 vs 1, con el VS ocupando la posición central.
    const impro = state.participants.filter(p => mv!.teamImpro.includes(p.id) && activePlayers.has(p.id))
    const sible = state.participants.filter(p => mv!.teamSible.includes(p.id) && activePlayers.has(p.id))
    // Las dos tarjetas del duelo miden lo mismo que en la fila de "todos juegan":
    // .participants ocupa 97vw (100 menos el padding del root) y separa las n
    // tarjetas con gaps de 2vw, así que cada una mide (97vw - gaps) / n.
    const n = Math.max(1, state.visibleParticipants)
    const duelCardWidth = `calc((97vw - ${2 * (n - 1)}vw) / ${n})`
    return (
      <div className={`projection-root mission-view${missionExiting ? ' mission-view--exiting' : ''}`}>
        {missionHeader}
        <div
          className="participants participants--duel"
          style={{ '--duel-card-w': duelCardWidth } as React.CSSProperties}
        >
          {impro.map(missionCard)}
          <div className="mission-vs">VS</div>
          {sible.map(missionCard)}
        </div>
      </div>
    )
  }

  return (
    <div className="projection-root">
      <div className="header">
        <h1 className="header-title">
          <span className="title-mision">MISIÓN </span>
          <span className="title-impro">IMPRO</span>
          <span className="title-sible">SIBLE</span>
        </h1>
        <div className="header-logo">
          {logoUrl && <img key={state.logoVersion ?? 0} src={logoUrl} className="logo-placeholder" />}
        </div>
      </div>



      <div className="participants">
        {state.participants.slice(0, state.visibleParticipants).map(p => (
          <div key={p.id} className="participant-card">
            <div className="participant-photo" style={{ filter: p.eliminated ? 'grayscale(100%)' : 'none', transition: 'filter 0.4s' }}>
              {p.photoPath ? (
                <img src={toLocalFile(p.photoPath) ?? ''} alt={p.name} />
              ) : (
                <div className="photo-placeholder">FOTO</div>
              )}
              {activeRatings && activeRatings[p.id] && (
                <div
                  className={`rating-badge${ratingsExiting ? ' rating-badge--exiting' : ''}`}
                  style={{ color: RATING_COLORS[activeRatings[p.id]] }}
                >
                  {RATING_LABELS[activeRatings[p.id]]}
                </div>
              )}
            </div>
            <div className="participant-name" style={{ background: p.eliminated ? '#4b5563' : undefined, transition: 'background 0.4s' }}>{p.name}</div>
            <div key={scoreFlash[p.id] ?? 0} className="participant-score participant-score--flash">{p.score}</div>
          </div>
        ))}
      </div>

      {announcement && (
        <div className="obj-announce-overlay" style={{ background: `rgba(0,0,0,${(state.overlayOpacity ?? 80) / 100})` }}>
          <div className="obj-announce-card">
            <div className="obj-announce-label">OBJETIVO ALCANZADO</div>
            <div className="obj-announce-name">{announcement}</div>
            <div className="obj-announce-corners">
              <span /><span /><span /><span />
            </div>
          </div>
        </div>
      )}

      {rouletteVisible && !rouletteRevealed && (
        <div className={`roulette-overlay${rouletteExiting ? ' roulette-overlay--exiting' : ''}`}>
          <div className="roulette-backdrop" />
          <div className="roulette-content">
            <div className="roulette-title">DESAFÍO</div>
            <canvas ref={rouletteCanvasRef} width={900} height={900} className="roulette-canvas" />
          </div>
        </div>
      )}

      {rouletteRevealed && rouletteWinner !== null && (
        <div className={`roulette-overlay${rouletteExiting ? ' roulette-overlay--exiting' : ''}`}>
          <div className="roulette-backdrop" />
          <div className="roulette-reveal">
            <div className="roulette-reveal-label">DESAFÍO SELECCIONADO</div>
            <div className="roulette-reveal-name">{rouletteNamesRef.current[rouletteWinner].toUpperCase()}</div>
          </div>
        </div>
      )}

      {state.activeCinematic && (
        <div className="cinematic-overlay">
          <video
            key={state.activeCinematic}
            src={toVideoSrc(state.activeCinematic) ?? undefined}
            className="cinematic-video"
            autoPlay
            onEnded={() => window.electronAPI.updateAppState({ activeCinematic: null, activeCinematicName: null, curtain: true })}
          />

        </div>
      )}

      {curtainMounted && (
        <div
          ref={curtainOverlayRef}
          className={`curtain-overlay${curtainVisible ? '' : ' curtain-fade-out'}`}
          style={{
            ['--pulse-duration' as string]: `${state?.curtainPulseDuration ?? 5}s`,
            ['--pulse-color' as string]: state?.curtainPulseColor ?? '#ff5500',
            ...(audioWobbleActive
              ? {}
              : { ['--wobble-duration' as string]: `${state?.curtainWobbleDuration ?? 0.35}s` }),
          } as React.CSSProperties}
        >
          {svgLogoContent && (
            <div className={`curtain-logo-wrapper${((state?.curtainWobbleEnabled ?? false) || audioWobbleActive) ? ' wobble-enabled' : ''}`}>
              <div
                className="curtain-logo-coin"
                style={state?.curtainFlipEnabled ?? true
                  ? { animation: `logo-flip-y ${state?.curtainFlipDuration ?? 10}s linear infinite` }
                  : { animation: 'none' }}
              >
                <div className={`curtain-logo${(state?.curtainPulseEnabled ?? true) ? ' pulse-enabled' : ''}`} dangerouslySetInnerHTML={{ __html: (state?.curtainLogoColor ?? 'white') === 'orange' ? (svgLogoOrangeContent ?? svgLogoContent) : svgLogoContent }} />
                <div className={`curtain-logo curtain-logo-back${(state?.curtainPulseEnabled ?? true) ? ' pulse-enabled' : ''}`} dangerouslySetInnerHTML={{ __html: svgLogoOrangeContent ?? svgLogoContent }} />
              </div>
            </div>
          )}
        </div>
      )}

      {missionAnnouncement && (
        <div key={missionAnnouncement} className={`mission-announce-overlay${missionAnnouncingOut ? ' exiting' : ''}`}>
          <div className="mission-announce-backdrop" style={{ background: `rgba(0,0,0,${(state.overlayOpacity ?? 80) / 100})` }} />
          <div className="mission-announce-subtitle">Siguiente misión</div>
          <div className="mission-announce-name">{missionAnnouncement.toUpperCase()}</div>
        </div>
      )}

      {/* ── Fase A: título Misión Improsible ── */}
      {improsiblePhase === 'title' && (
        <div key="improsible-title" className="mission-final-overlay">
          <div className="mission-final-bg" style={{ background: 'rgba(0,0,0,0.95)' }} />
          <div className="mission-final-content">
            <div className="mission-final-caption">Misión Final</div>
            <div className="mission-final-rule" />
            <div className="mission-final-word mission-final-word--1">MISIÓN</div>
            <div className="mission-final-word mission-final-word--2">IMPROSIBLE</div>
            <div className="mission-final-rule mission-final-rule--2" />
          </div>
        </div>
      )}

      {/* ── Fase B: cañón 007 ── */}
      {improsiblePhase === 'barrel' && improsibleFinalists && (() => {
        const fa = state.participants.find(p => p.id === improsibleFinalists[0])
        const fb = state.participants.find(p => p.id === improsibleFinalists[1])
        return (
          <div className="improsible-barrel-overlay">
            <div className="barrel-blood" />
            <div className="barrel-circle">
              <div className="barrel-stage">
                {fa?.photoPath && (
                  <img
                    className="barrel-finalist barrel-finalist--a"
                    src={toLocalFile(fa.photoPath) ?? ''}
                    alt={fa.name}
                  />
                )}
                {fb?.photoPath && (
                  <img
                    className="barrel-finalist barrel-finalist--b"
                    src={toLocalFile(fb.photoPath) ?? ''}
                    alt={fb.name}
                  />
                )}
                {svgLogoContent && (
                  <div
                    className="barrel-agency-logo"
                    dangerouslySetInnerHTML={{ __html: svgLogoContent }}
                  />
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Fase E: Ganador ── */}
      {improsiblePhase === 'final' && improsibleWinnerId && (() => {
        const winner = state.participants.find(p => p.id === improsibleWinnerId)
        return (
          <div className="improsible-winner-overlay">
            <div className="winner-stage-wrapper">
              <div className="winner-stage">
                <div className="winner-photo-ring">
                  {winner?.photoPath
                    ? <img className="winner-photo" src={toLocalFile(winner.photoPath) ?? ''} alt={winner?.name} />
                    : <div className="winner-photo-placeholder">{winner?.name?.[0] ?? '?'}</div>
                  }
                </div>
                <div className="winner-name">{winner?.name}</div>
                <div className="winner-label" style={{ color: state.improsibleWinnerColor ?? '#f97316' }}>
                  {state.improsibleWinnerLabel ?? '¡GANADOR!'}
                </div>
                <div className="winner-sublabel">{state.improsibleWinnerSublabel ?? 'MEJOR AGENTE'}</div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Fase D: VS pulsante ── */}
      {improsiblePhase === 'vs' && improsibleFinalists && (() => {
        const fa = state.participants.find(p => p.id === improsibleFinalists[0])
        const fb = state.participants.find(p => p.id === improsibleFinalists[1])
        return (
          <div className="improsible-vs-overlay">
            <div className="improsible-vs-bg" />
            <div className="improsible-vs-label">¿Quién será el mejor agente?</div>
            <div className="improsible-vs-content">
              <div className="improsible-finalist-card improsible-finalist-card--a">
                <div className="improsible-finalist-photo">
                  {fa?.photoPath
                    ? <img src={toLocalFile(fa.photoPath) ?? ''} alt={fa?.name} />
                    : <div className="improsible-finalist-placeholder">A</div>}
                </div>
                <div className="improsible-finalist-name">{fa?.name}</div>
              </div>
              <div className="improsible-vs-center">
                <div className="improsible-vs-word">VS</div>
              </div>
              <div className="improsible-finalist-card improsible-finalist-card--b">
                <div className="improsible-finalist-photo">
                  {fb?.photoPath
                    ? <img src={toLocalFile(fb.photoPath) ?? ''} alt={fb?.name} />
                    : <div className="improsible-finalist-placeholder">B</div>}
                </div>
                <div className="improsible-finalist-name">{fb?.name}</div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
