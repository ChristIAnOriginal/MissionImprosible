import { useEffect, useRef, useState, useCallback } from 'react'
import { Monitor, Play, RotateCcw, Target, Plus, Trash2, GripVertical, EyeOff, Trophy, Power, ZoomIn } from 'lucide-react'
import { AppState, Participant, MissionData, ObjectiveData, CinematicData, CinematicAudioData } from '../../shared/types'
import { ProjectionPreview } from './ProjectionPreview'
import { playAudio, getAudioDuration } from '../utils/audio'
import { RatingKey, RATING_OPTIONS } from '../constants/ratings'
import { TabId, TABS, TAB_GROUPS } from '../constants/tabs'
import { introEndAt, IntroCueKey } from '../constants/intro'
import { IntroTimeline } from './IntroTimeline'

function toLocalFile(absPath: string | null): string | null {
  if (!absPath) return null
  const normalized = absPath.replace(/\\/g, '/')
  const encoded = normalized.split('/').map((seg, i) =>
    i === 0 && /^[A-Za-z]:$/.test(seg) ? seg : encodeURIComponent(seg)
  ).join('/')
  return `localfile:///${encoded}`
}


type Display = { id: number; label: string; bounds: { x: number; y: number; width: number; height: number }; isPrimary: boolean }

export function ControlApp() {
  const [state, setState] = useState<AppState | null>(null)
  const [displays, setDisplays] = useState<Display[]>([])
  const [selectedDisplay, setSelectedDisplay] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('participantes')

  // Dynamic data from JSON
  const [missionData, setMissionData] = useState<MissionData[]>([])
  const [objectiveData, setObjectiveData] = useState<ObjectiveData[]>([])
  const [challengeData, setChallengeData] = useState<{ name: string; audioPath: string | null }[]>([])
  const [enabledChallenges, setEnabledChallenges] = useState<Set<string>>(new Set())
  const [addChallengeModal, setAddChallengeModal] = useState(false)
  const [newChallengeName, setNewChallengeName] = useState('')
  const [newChallengeAudio, setNewChallengeAudio] = useState<string | null>(null)
  const [deleteChallengeConfirm, setDeleteChallengeConfirm] = useState<string | null>(null)
  const [finalizarConfirm, setFinalizarConfirm] = useState(false)
  const [soundDisparo, setSoundDisparo] = useState<string | null>(null)
  const [soundIntro, setSoundIntro] = useState<string | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  // Cinematics
  const [cinematicData, setCinematicData] = useState<CinematicData[]>([])
  const [addCinematicModal, setAddCinematicModal] = useState(false)
  const [newCinematicName, setNewCinematicName] = useState('')
  const [newCinematicVideo, setNewCinematicVideo] = useState<string | null>(null)
  const [deleteCinematicConfirm, setDeleteCinematicConfirm] = useState<CinematicData | null>(null)
  const [playCinematicConfirm, setPlayCinematicConfirm] = useState<CinematicData | null>(null)

  // Cinematic audios
  const [cinematicAudioData, setCinematicAudioData] = useState<CinematicAudioData[]>([])
  const [addCinematicAudioModal, setAddCinematicAudioModal] = useState(false)
  const [newCinematicAudioName, setNewCinematicAudioName] = useState('')
  const [newCinematicAudioPath, setNewCinematicAudioPath] = useState<string | null>(null)
  const [deleteCinematicAudioConfirm, setDeleteCinematicAudioConfirm] = useState<CinematicAudioData | null>(null)
  const [playCinematicAudioConfirm, setPlayCinematicAudioConfirm] = useState<CinematicAudioData | null>(null)

  // Objective modals
  const [modalObjective, setModalObjective] = useState<ObjectiveData | null>(null)
  const [announceModal, setAnnounceModal] = useState<{ objective: ObjectiveData; participantId: string } | null>(null)
  const [addObjectiveModal, setAddObjectiveModal] = useState(false)
  const [newObjName, setNewObjName] = useState('')
  const [newObjPoints, setNewObjPoints] = useState(5)
  const [newObjDesc, setNewObjDesc] = useState('')
  const [newObjAudio, setNewObjAudio] = useState<string | null>(null)
  const [deleteObjectiveConfirm, setDeleteObjectiveConfirm] = useState<ObjectiveData | null>(null)
  const [objectiveSearch, setObjectiveSearch] = useState('')

  // Mission modals
  const [addMissionModal, setAddMissionModal] = useState(false)
  const [newMissionName, setNewMissionName] = useState('')
  const [newMissionAudio, setNewMissionAudio] = useState<string | null>(null)
  const [deleteMissionConfirm, setDeleteMissionConfirm] = useState<MissionData | null>(null)

  // Score / animation
  const [pendingScores, setPendingScores] = useState<Record<string, number>>({})
  const [scoreFlash, setScoreFlash] = useState<Record<string, number>>({})
  const [scoreInputValues, setScoreInputValues] = useState<Record<string, string>>({})
  const [executedObjectives, setExecutedObjectives] = useState<Set<number>>(new Set())
  const [executedMissions, setExecutedMissions] = useState<Set<number>>(new Set())
  const [executedCinematics, setExecutedCinematics] = useState<Set<string>>(new Set())
  const [executedCinematicAudios, setExecutedCinematicAudios] = useState<Set<string>>(new Set())
  const [improsibleFinalists, setImprosibleFinalists] = useState<[string, string] | null>(null)
  const [improsibleLaunched, setImprosibleLaunched] = useState(false)
  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null)
  const [finalAnimationPlaying, setFinalAnimationPlaying] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [animatingKey, setAnimatingKey] = useState<string | null>(null)
  const [shakingIds, setShakingIds] = useState<Set<string>>(new Set())
  const [activeRatings, setActiveRatings] = useState<Record<string, RatingKey>>({})
  const [rouletteConfirm, setRouletteConfirm] = useState(false)
  const [autoClearStart, setAutoClearStart] = useState<number | null>(null)
  const [autoClearNow, setAutoClearNow] = useState(0)
  const [eliminatedAt, setEliminatedAt] = useState<Record<string, number>>({})
  const [eliminatedNow, setEliminatedNow] = useState(0)
  const [elderlyMode, setElderlyMode] = useState(false)

  // Intro del show
  const [introStartedAt, setIntroStartedAt] = useState<number | null>(null)
  const [introNow, setIntroNow] = useState(0)

  // Mission drag-and-drop
  const [missionDragIdx, setMissionDragIdx] = useState<number | null>(null)
  const [missionDragOverIdx, setMissionDragOverIdx] = useState<number | null>(null)

  // Mission start modal
  const [missionModal, setMissionModal] = useState(false)
  const [missionName, setMissionName] = useState('')
  const [missionAssignments, setMissionAssignments] = useState<Record<string, 'impro' | 'sible' | 'none'>>({})
  const [allPlay, setAllPlay] = useState(false)
  const [usePreload, setUsePreload] = useState(false)

  // Preload agents modal
  const [preloadModal, setPreloadModal] = useState(false)
  const [preloadMissionName, setPreloadMissionName] = useState('')
  const [preloadAssignments, setPreloadAssignments] = useState<Record<string, 'impro' | 'sible' | 'none'>>({})
  const [preloadAllPlay, setPreloadAllPlay] = useState(false)

  const activePreload = usePreload ? state?.missionPreloads?.[missionName] : undefined
  const effectiveAllPlay = usePreload ? !!activePreload?.allPlay : allPlay
  const effectiveAssignments = usePreload ? (activePreload?.assignments ?? {}) : missionAssignments

  const missionCanStart = state
    ? (usePreload
        ? !!activePreload && (effectiveAllPlay ||
            (state.participants.some(p => (effectiveAssignments[p.id] ?? 'none') === 'impro') &&
             state.participants.some(p => (effectiveAssignments[p.id] ?? 'none') === 'sible')))
        : allPlay ||
          (state.participants.some(p => (missionAssignments[p.id] ?? 'none') === 'impro') &&
           state.participants.some(p => (missionAssignments[p.id] ?? 'none') === 'sible')))
    : false

  const regularMissions = missionData

  useEffect(() => {
    window.electronAPI.getMissions().then(missions => {
      setMissionData(missions)
      const first = missions[0]
      if (first) setMissionName(first.name)
    })
    window.electronAPI.getObjectives().then(setObjectiveData)
    window.electronAPI.getChallenges().then(ch => {
      setChallengeData(ch)
      setEnabledChallenges(new Set(ch.map(c => c.name)))
    })
    window.electronAPI.getSounds().then(sounds => {
      setSoundDisparo(toLocalFile(sounds.disparo ?? null))
      setSoundIntro(toLocalFile(sounds.intro ?? null))
    })
    window.electronAPI.getCinematics().then(setCinematicData)
    window.electronAPI.getCinematicAudios().then(setCinematicAudioData)
    window.electronAPI.getLogoPath().then(p => setLogoPreview(toLocalFile(p)))
  }, [])

  useEffect(() => {
    const unsub = window.electronAPI.onStateUpdate(setState)
    window.electronAPI.getState()
    window.electronAPI.listDisplays().then(d => {
      setDisplays(d)
      const nonPrimary = d.find(x => !x.isPrimary)
      if (nonPrimary) setSelectedDisplay(nonPrimary.id)
      else if (d.length > 0) setSelectedDisplay(d[0].id)
    })
    return unsub
  }, [])

  const ratingDurationMs = (state?.ratingDuration ?? 5) * 1000
  const ELIM_RESTORE_MS = 5000

  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])

  useEffect(() => {
    const ids = Object.keys(eliminatedAt)
    if (ids.length === 0) return
    const interval = setInterval(() => setEliminatedNow(Date.now()), 100)
    const timers = ids.map(id => {
      const elapsed = Date.now() - eliminatedAt[id]
      const remaining = Math.max(0, ELIM_RESTORE_MS - elapsed)
      return setTimeout(() => {
        const current = stateRef.current?.participants.find(p => p.id === id)
        if (current && current.eliminated) {
          window.electronAPI.updateParticipant({ ...current, eliminated: false })
        }
        setEliminatedAt(prev => {
          if (!(id in prev)) return prev
          const next = { ...prev }
          delete next[id]
          return next
        })
      }, remaining)
    })
    return () => { clearInterval(interval); timers.forEach(clearTimeout) }
  }, [eliminatedAt])

  useEffect(() => {
    if (autoClearStart === null) return
    const tick = () => setAutoClearNow(Date.now())
    const interval = setInterval(tick, 100)
    const elapsed = Date.now() - autoClearStart
    const remaining = Math.max(0, ratingDurationMs - elapsed)
    const timeout = setTimeout(() => {
      window.electronAPI.clearRatings()
      setActiveRatings({})
      setAutoClearStart(null)
    }, remaining)
    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [autoClearStart, ratingDurationMs])

  // Aplica una calificación a un participante: suma puntos, muestra el badge en
  // pantalla (fusionado con los ya visibles) y reinicia el contador para que todos
  // desaparezcan a la vez.
  const handleRating = (id: string, key: RatingKey) => {
    const opt = RATING_OPTIONS.find(o => o.key === key)!
    window.electronAPI.updateScore(id, opt.points)
    setScoreFlash(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))
    const merged = { ...activeRatings, [id]: key }
    setActiveRatings(merged)
    window.electronAPI.showRatings(merged)
    if (state?.ratingAutoClear ?? true) {
      setAutoClearStart(Date.now())
      setAutoClearNow(Date.now())
    }
  }

  const playGunshot = () => {
    if (soundDisparo) playAudio(soundDisparo, state?.volume ?? 100)
  }

  const handleEliminate = (id: string) => {
    const p = state!.participants.find(p => p.id === id)!
    window.electronAPI.updateParticipant({ ...p, eliminated: true, score: p.score - 2 })
    playGunshot()
    setShakingIds(prev => new Set(prev).add(id))
    setTimeout(() => setShakingIds(prev => { const s = new Set(prev); s.delete(id); return s }), 600)
    const now = Date.now()
    setEliminatedAt(prev => ({ ...prev, [id]: now }))
    setEliminatedNow(now)
  }

  const handleRestore = (id: string) => {
    window.electronAPI.updateParticipant({ ...state!.participants.find(p => p.id === id)!, eliminated: false })
    setEliminatedAt(prev => {
      if (!(id in prev)) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const introTimings = state?.introTimings ?? {}
  const introDuration = introEndAt(introTimings)

  // Reloj de la intro: alimenta la línea de tiempo mientras la secuencia corre.
  useEffect(() => {
    if (introStartedAt === null) return
    const interval = setInterval(() => setIntroNow(Date.now()), 200)
    const done = setTimeout(() => setIntroStartedAt(null), introDuration * 1000 + 1500)
    return () => { clearInterval(interval); clearTimeout(done) }
  }, [introStartedAt, introDuration])

  const introElapsed = introStartedAt !== null ? (introNow - introStartedAt) / 1000 : null

  const handleIntroCueChange = (key: IntroCueKey, at: number) => {
    window.electronAPI.updateAppState({ introTimings: { ...introTimings, [key]: at } })
  }

  const handleIntroTimingsReset = () => {
    window.electronAPI.updateAppState({ introTimings: {} })
  }

  const animatingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const blockFor = (ms: number, key: string) => {
    if (animatingTimer.current) clearTimeout(animatingTimer.current)
    setIsAnimating(true)
    setAnimatingKey(key)
    animatingTimer.current = setTimeout(() => { setIsAnimating(false); setAnimatingKey(null) }, ms)
  }

  const handleStartIntro = () => {
    if (isAnimating) return
    window.electronAPI.startIntro()
    const now = Date.now()
    setIntroStartedAt(now)
    setIntroNow(now)
    blockFor(introDuration * 1000 + 1500, 'intro')
  }

  const handleStopIntro = () => {
    window.electronAPI.stopIntro()
    setIntroStartedAt(null)
    blockFor(0, 'intro')
  }

  // Recalcula blockFor cuando llega el audioPath real de la secuencia improsible
  useEffect(() => {
    const unsub = window.electronAPI.onImprosibleStart((_finalistIds, audioPath) => {
      if (!audioPath) return
      const url = toLocalFile(audioPath)
      if (!url) return
      // barrel dura 13s fijos; bloqueamos duración_audio + 13s + 500ms de margen
      getAudioDuration(url, (audioDuration) => {
        blockFor(audioDuration + 13000 + 500, 'improsible')
      })
    })
    return unsub
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fireMission = (name: string, key: string) => {
    if (isAnimating) return
    const sfxUrl = toLocalFile(missionData.find(m => m.name === name)?.audioPath ?? null)
    blockFor(4000, key)
    if (sfxUrl) getAudioDuration(sfxUrl, (duration) => blockFor(duration, key))
    window.electronAPI.announceMission(name)
  }

  const handlePendingDelta = (id: string, delta: number) =>
    setPendingScores(prev => ({ ...prev, [id]: (prev[id] ?? 0) + delta }))

  const handleCommitScore = (id: string) => {
    const pending = pendingScores[id] ?? 0
    if (pending === 0) return
    window.electronAPI.updateScore(id, pending)
    setPendingScores(prev => ({ ...prev, [id]: 0 }))
    setScoreFlash(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))
  }

  const handleScoreInput = (id: string, value: string) => {
    setScoreInputValues(prev => ({ ...prev, [id]: value }))
    const n = value === '' || value === '-' ? null : parseInt(value, 10)
    if (n !== null && !isNaN(n)) {
      window.electronAPI.setScore(id, n)
      setScoreFlash(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))
    }
  }

  const handleScoreBlur = (id: string, score: number) => {
    const raw = scoreInputValues[id] ?? String(score)
    const isEmpty = raw === '' || raw === '-'
    if (isEmpty) {
      window.electronAPI.setScore(id, 0)
      setScoreFlash(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))
      setScoreInputValues(prev => ({ ...prev, [id]: '0' }))
    } else {
      setScoreInputValues(prev => ({ ...prev, [id]: String(score) }))
    }
  }

  const handleNameChange = useCallback((p: Participant, name: string) => {
    window.electronAPI.updateParticipant({ ...p, name })
  }, [])

  const handleSelectPhoto = async (id: string) => { await window.electronAPI.selectPhoto(id) }
  const handleProjectDisplay = () => { if (selectedDisplay !== null) window.electronAPI.setDisplay(selectedDisplay) }

  // --- Mission CRUD ---
  const handleAddMission = async () => {
    if (!newMissionName.trim()) return
    const newId = missionData.length > 0 ? Math.max(...missionData.map(m => m.id)) + 1 : 1
    const newMission: MissionData = { id: newId, name: newMissionName.trim(), audioPath: newMissionAudio }
    const updated = [...missionData, newMission]
    await window.electronAPI.saveMissions(updated)
    setMissionData(updated)
    setAddMissionModal(false)
    setNewMissionName('')
    setNewMissionAudio(null)
  }

  const reorderRegularMissions = async (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return
    const reordered = [...regularMissions]
    if (fromIdx >= reordered.length || toIdx >= reordered.length) return
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)

    const executedNames = new Set(
      Array.from(executedMissions)
        .map(id => missionData.find(m => m.id === id)?.name)
        .filter((n): n is string => !!n)
    )

    const next: MissionData[] = reordered.map((m, i) => ({ ...m, id: i + 1 }))

    setMissionData(next)
    setExecutedMissions(new Set(next.filter(m => executedNames.has(m.name)).map(m => m.id)))
    await window.electronAPI.saveMissions(next)
  }

  const handleDeleteMission = async (mission: MissionData) => {
    const updated = missionData.filter(m => m.id !== mission.id)
    await window.electronAPI.saveMissions(updated)
    if (mission.audioPath) await window.electronAPI.deleteFile(mission.audioPath)
    setMissionData(updated)
    setDeleteMissionConfirm(null)
  }

  // --- Objective CRUD ---
  const handleAddObjective = async () => {
    if (!newObjName.trim() || !newObjDesc.trim()) return
    const newId = objectiveData.length > 0 ? Math.max(...objectiveData.map(o => o.id)) + 1 : 1
    const newObj: ObjectiveData = {
      id: newId,
      name: newObjName.trim(),
      points: newObjPoints,
      description: newObjDesc.trim(),
      audioPath: newObjAudio,
    }
    const updated = [...objectiveData, newObj]
    await window.electronAPI.saveObjectives(updated)
    setObjectiveData(updated)
    setAddObjectiveModal(false)
    setNewObjName('')
    setNewObjPoints(5)
    setNewObjDesc('')
    setNewObjAudio(null)
  }

  const handleDeleteObjective = async (obj: ObjectiveData) => {
    const updated = objectiveData.filter(o => o.id !== obj.id)
    await window.electronAPI.saveObjectives(updated)
    if (obj.audioPath) await window.electronAPI.deleteFile(obj.audioPath)
    setObjectiveData(updated)
    setDeleteObjectiveConfirm(null)
  }

  // --- Cinematic Audio CRUD ---
  const handleAddCinematicAudio = async () => {
    if (!newCinematicAudioName.trim() || !newCinematicAudioPath) return
    const newEntry: CinematicAudioData = { name: newCinematicAudioName.trim(), audioPath: newCinematicAudioPath }
    const updated = [...cinematicAudioData, newEntry]
    await window.electronAPI.saveCinematicAudios(updated)
    setCinematicAudioData(updated)
    setAddCinematicAudioModal(false)
    setNewCinematicAudioName('')
    setNewCinematicAudioPath(null)
  }

  const handleDeleteCinematicAudio = async (entry: CinematicAudioData) => {
    const updated = cinematicAudioData.filter(a => a.name !== entry.name)
    await window.electronAPI.saveCinematicAudios(updated)
    if (entry.audioPath) await window.electronAPI.deleteFile(entry.audioPath)
    setCinematicAudioData(updated)
    setDeleteCinematicAudioConfirm(null)
  }

  // --- Cinematic CRUD ---
  const handleAddCinematic = async () => {
    if (!newCinematicName.trim() || !newCinematicVideo) return
    const newCinematic: CinematicData = { name: newCinematicName.trim(), videoPath: newCinematicVideo }
    const updated = [...cinematicData, newCinematic]
    await window.electronAPI.saveCinematics(updated)
    setCinematicData(updated)
    setAddCinematicModal(false)
    setNewCinematicName('')
    setNewCinematicVideo(null)
  }

  const handleDeleteCinematic = async (cinematic: CinematicData) => {
    const updated = cinematicData.filter(c => c.name !== cinematic.name)
    await window.electronAPI.saveCinematics(updated)
    if (cinematic.videoPath) await window.electronAPI.deleteFile(cinematic.videoPath)
    setCinematicData(updated)
    setDeleteCinematicConfirm(null)
  }

  // --- Challenge CRUD ---
  const handleAddChallenge = async () => {
    if (!newChallengeName.trim()) return
    const newChallenge = { name: newChallengeName.trim(), audioPath: newChallengeAudio }
    const updated = [...challengeData, newChallenge]
    await window.electronAPI.saveChallenges(updated)
    setChallengeData(updated)
    setEnabledChallenges(prev => new Set([...prev, newChallenge.name]))
    setAddChallengeModal(false)
    setNewChallengeName('')
    setNewChallengeAudio(null)
  }

  const handleDeleteChallenge = async (name: string) => {
    const entry = challengeData.find(c => c.name === name)
    const updated = challengeData.filter(c => c.name !== name)
    await window.electronAPI.saveChallenges(updated)
    if (entry?.audioPath) await window.electronAPI.deleteFile(entry.audioPath)
    setChallengeData(updated)
    setEnabledChallenges(prev => { const s = new Set(prev); s.delete(name); return s })
    setDeleteChallengeConfirm(null)
  }

  if (!state) return <div className="control-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>Cargando...</div>

  return (
    <div className={`control-root${elderlyMode ? ' control-root--elderly' : ''}`}>
      {/* Top bar */}
      <div className="topbar">
        <h1>MISIÓN IMPROSIBLE<span className="topbar-sub">Control</span></h1>

        <div className="topbar-spacer" />

        {/* Qué se muestra en la proyección */}
        <div className="seg" role="group" aria-label="Modo de proyección">
          <button
            className={`seg-btn${state.curtain ? ' seg-btn--active' : ''}`}
            onClick={() => window.electronAPI.updateAppState({ curtain: true, activeCinematic: null, activeCinematicName: null })}
          ><EyeOff size={15} /><span>Cortina</span></button>
          <button
            className={`seg-btn${!state.curtain ? ' seg-btn--active' : ''}`}
            onClick={() => window.electronAPI.updateAppState({ curtain: false, activeCinematic: null, activeCinematicName: null })}
          ><Trophy size={15} /><span>Puntuaciones</span></button>
        </div>

        <div className="topbar-divider" />

        {/* Destino de proyección */}
        <div className="display-select">
          <Monitor size={15} style={{ color: '#888' }} />
          <select value={selectedDisplay ?? ''} onChange={e => setSelectedDisplay(Number(e.target.value))}>
            {displays.map(d => (
              <option key={d.id} value={d.id}>{d.isPrimary ? '(Principal) ' : ''}{d.label}</option>
            ))}
          </select>
          <button className="btn btn-primary btn-sm" onClick={handleProjectDisplay}>Proyectar</button>
        </div>

        <div className="topbar-divider" />

        <button
          className={`btn btn-sm ${elderlyMode ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setElderlyMode(v => !v)}
          title="Aumenta el tamaño del texto del panel de control"
        ><ZoomIn size={14} /><span>Modo Anciano</span></button>
        <button
          className="btn btn-danger btn-sm"
          onClick={() => setFinalizarConfirm(true)}
        ><Power size={14} /><span>Finalizar</span></button>
      </div>

      {/* Main */}
      <div className="main-layout">
        <nav className="sidebar">
          {TAB_GROUPS.map(g => (
            <div key={g.id} className="sidebar-group">
              <div className="sidebar-group-label">{g.label}</div>
              {TABS.filter(t => t.group === g.id).map(({ id, label, Icon }) => (
                <button
                  key={id}
                  className={`sidebar-btn${activeTab === id ? ' sidebar-btn--active' : ''}`}
                  onClick={() => setActiveTab(id)}
                >
                  <Icon size={17} /><span>{label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="content-panel">
          <div className="content-header">
            {(() => {
              const tab = TABS.find(t => t.id === activeTab)!
              const Icon = tab.Icon
              return (<><Icon size={18} /><span>{tab.label}</span></>)
            })()}
          </div>
          <div className="tab-content">
            {activeTab === 'participantes' && (
              <div className="participants-list">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0 12px' }}>
                  <span className="field-label">Jugadores visibles</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button className="score-btn score-btn-minus"
                      onClick={() => window.electronAPI.updateAppState({ visibleParticipants: Math.max(1, state.visibleParticipants - 1) })}>−</button>
                    <span style={{ fontSize: 20, fontWeight: 900, color: '#f97316', minWidth: 24, textAlign: 'center' }}>{state.visibleParticipants}</span>
                    <button className="score-btn score-btn-plus"
                      onClick={() => window.electronAPI.updateAppState({ visibleParticipants: Math.min(4, state.visibleParticipants + 1) })}>+</button>
                  </div>
                </div>
                <div className="participants-grid">
                {state.participants.map((p, idx) => {
                  const startedAt = eliminatedAt[p.id]
                  const counting = startedAt !== undefined
                  const elapsed = counting ? eliminatedNow - startedAt : 0
                  const progress = counting ? Math.min(1, elapsed / ELIM_RESTORE_MS) : 0
                  const radius = 10
                  const circumference = 2 * Math.PI * radius
                  const dashOffset = circumference * (1 - progress)
                  const pending = pendingScores[p.id] ?? 0
                  return (
                    <div
                      key={p.id}
                      className={`participant-row${shakingIds.has(p.id) ? ' participant-row--shaking' : ''}${p.eliminated ? ' participant-row--eliminated' : ''}`}
                      style={{ opacity: idx < state.visibleParticipants ? 1 : 0.4 }}
                    >
                      {/* Cabecera: foto + nombre + acciones */}
                      <div className="pcard-header">
                        <div className="participant-thumb" onClick={() => handleSelectPhoto(p.id)} title="Click para cargar foto"
                          style={{ filter: p.eliminated ? 'grayscale(100%)' : 'none', transition: 'filter 0.3s' }}>
                          {p.photoPath
                            ? <img src={toLocalFile(p.photoPath) ?? ''} alt={p.name} />
                            : <div className="thumb-placeholder">📷<br />Foto</div>}
                        </div>
                        <div className="pcard-idbox">
                          <span className="pcard-idx">Jugador {idx + 1}{p.eliminated ? ' · Eliminado' : ''}</span>
                          <input className="participant-name-input" value={p.name} onChange={e => handleNameChange(p, e.target.value)} onFocus={e => e.target.select()} />
                        </div>
                        <div className="elim-actions">
                          <button
                            className={`elim-btn elim-btn--shoot${p.eliminated ? ' elim-btn--active' : ''}`}
                            onClick={() => handleEliminate(p.id)}
                            title="Eliminar participante"
                          >
                            <Target size={13} />
                          </button>
                          <button
                            className={`elim-btn elim-btn--restore${counting ? ' elim-btn--counting' : ''}`}
                            onClick={() => handleRestore(p.id)}
                            disabled={!p.eliminated}
                            title="Restaurar participante"
                          >
                            {counting && (
                              <svg className="elim-progress-ring" viewBox="0 0 24 24" aria-hidden="true">
                                <circle cx="12" cy="12" r={radius} className="elim-progress-track" />
                                <circle cx="12" cy="12" r={radius} className="elim-progress-bar"
                                  style={{ strokeDasharray: circumference, strokeDashoffset: dashOffset }} />
                              </svg>
                            )}
                            <RotateCcw size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Puntos: marcador + edición directa */}
                      <div className="pcard-row">
                        <span className="pcard-label">Puntos</span>
                        <span key={scoreFlash[p.id] ?? 0} className="score-value score-value--flash">{p.score}</span>
                        <div className="score-manual">
                          <span className="score-manual-label">
                            Fijar
                            <span className="score-manual-hint" title="Escribe directamente el valor exacto de la puntuación">?</span>
                          </span>
                          <input
                            className="score-input"
                            type="text"
                            inputMode="numeric"
                            value={scoreInputValues[p.id] ?? String(p.score)}
                            onChange={e => handleScoreInput(p.id, e.target.value)}
                            onBlur={() => handleScoreBlur(p.id, p.score)}
                            onFocus={e => e.target.select()}
                          />
                        </div>
                      </div>

                      {/* Ajustar: sumar/restar en lote */}
                      <div className="pcard-row">
                        <span className="pcard-label">Puntuar</span>
                        <div className="pcard-adjust">
                          <button className="score-btn score-btn-minus" onClick={() => handlePendingDelta(p.id, -1)}>−</button>
                          <span className={`pending-value${pending !== 0 ? ' pending-value--active' : ''}`}>
                            {pending > 0 ? '+' : ''}{pending}
                          </span>
                          <button className="score-btn score-btn-plus" onClick={() => handlePendingDelta(p.id, 1)}>+</button>
                          <button className="btn btn-primary score-commit-btn" disabled={pending === 0} onClick={() => handleCommitScore(p.id)}>✓ Aplicar</button>
                        </div>
                      </div>

                      {/* Calificar: badges en pantalla */}
                      <div className="pcard-row">
                        <span className="pcard-label">Calificar</span>
                        <div className="rating-buttons">
                          {RATING_OPTIONS.filter(o => o.key !== 'noaplica').map(o => (
                            <button
                              key={o.key}
                              className={`rating-btn rating-btn--${o.key}${activeRatings[p.id] === o.key ? ' rating-btn--active' : ''}`}
                              onClick={() => handleRating(p.id, o.key)}
                              title={`${o.label} (+${o.points})`}
                            >
                              <span className="rating-btn-label">{o.label}</span>
                              <span className="rating-btn-points">+{o.points}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
                </div>
                <div className="rating-actions">
                  {(() => {
                    const elapsed = autoClearStart !== null ? autoClearNow - autoClearStart : 0
                    const remainingMs = autoClearStart !== null ? Math.max(0, ratingDurationMs - elapsed) : 0
                    const remainingSec = Math.ceil(remainingMs / 1000)
                    const progressPct = autoClearStart !== null
                      ? Math.min(100, (elapsed / ratingDurationMs) * 100)
                      : 0
                    const active = autoClearStart !== null
                    return (
                      <button
                        className={`btn btn-ghost clear-ratings-btn${active ? ' clear-ratings-btn--counting' : ''}`}
                        onClick={() => {
                          window.electronAPI.clearRatings()
                          setActiveRatings({})
                          setAutoClearStart(null)
                          state.participants.filter(p => p.eliminated).forEach(p =>
                            window.electronAPI.updateParticipant({ ...p, eliminated: false })
                          )
                        }}
                      >
                        {active && (
                          <span
                            className="clear-ratings-progress"
                            style={{ width: `${progressPct}%` }}
                          />
                        )}
                        <span className="clear-ratings-label">
                          Limpiar calificaciones{active ? ` (${remainingSec})` : ''}
                        </span>
                      </button>
                    )
                  })()}
                </div>
              </div>
            )}

            {activeTab === 'configuracion' && (
              <div className="participants-list">
                <div className="config-group">
                  <div className="config-group-title">Audio</div>
                  <div className="field-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span className="field-label">Volumen</span>
                      <span style={{ fontSize: 13, color: '#f97316', fontWeight: 700 }}>
                        {state.volume}%
                        <span style={{ color: '#9ca3af', fontWeight: 400, marginLeft: 8 }}>
                          {state.volume === 0
                            ? '−∞ dB'
                            : `${(10 * Math.log10(state.volume / 100)).toFixed(1)} dB`}
                        </span>
                      </span>
                    </div>
                    <input
                      type="range"
                      className="volume-slider"
                      min={0}
                      max={100}
                      value={state.volume}
                      onChange={e => window.electronAPI.updateAppState({ volume: Number(e.target.value) })}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280' }}>
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                  </div>
                  <div className="field-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8, marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span className="field-label">Beep ruleta — base</span>
                      <span style={{ fontSize: 13, color: '#f97316', fontWeight: 700 }}>{state.rouletteTickBase ?? 180} Hz</span>
                    </div>
                    <input
                      type="range"
                      className="volume-slider"
                      min={80}
                      max={1200}
                      step={10}
                      value={state.rouletteTickBase ?? 180}
                      onChange={e => window.electronAPI.updateAppState({ rouletteTickBase: Number(e.target.value) })}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280' }}>
                      <span>80 Hz (grave)</span>
                      <span>1200 Hz (agudo)</span>
                    </div>
                  </div>
                  <div className="field-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8, marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span className="field-label">Beep ruleta — rango</span>
                      <span style={{ fontSize: 13, color: '#f97316', fontWeight: 700 }}>{state.rouletteTickRange ?? 520} Hz</span>
                    </div>
                    <input
                      type="range"
                      className="volume-slider"
                      min={0}
                      max={1200}
                      step={10}
                      value={state.rouletteTickRange ?? 520}
                      onChange={e => window.electronAPI.updateAppState({ rouletteTickRange: Number(e.target.value) })}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280' }}>
                      <span>0 Hz (tono fijo)</span>
                      <span>1200 Hz (variación máxima)</span>
                    </div>
                  </div>
                </div>
                <div className="config-group">
                  <div className="config-group-title">Calificaciones</div>
                  <div className="field-row">
                    <span className="field-label">Ocultar automáticamente</span>
                    <button
                      className={`btn btn-sm ${(state.ratingAutoClear ?? true) ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => window.electronAPI.updateAppState({ ratingAutoClear: !(state.ratingAutoClear ?? true) })}
                    >
                      {(state.ratingAutoClear ?? true) ? 'Activado' : 'Desactivado'}
                    </button>
                  </div>
                  <div className="field-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8, marginTop: 4, opacity: (state.ratingAutoClear ?? true) ? 1 : 0.4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span className="field-label">Duración en pantalla</span>
                      <span style={{ fontSize: 13, color: '#f97316', fontWeight: 700 }}>{state.ratingDuration ?? 5}s</span>
                    </div>
                    <input type="range" className="volume-slider" min={1} max={30} step={0.5}
                      disabled={!(state.ratingAutoClear ?? true)}
                      value={state.ratingDuration ?? 5}
                      onChange={e => window.electronAPI.updateAppState({ ratingDuration: Number(e.target.value) })} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280' }}>
                      <span>1s</span><span>30s</span>
                    </div>
                  </div>
                </div>
                <div className="config-group">
                  <div className="config-group-title">Opacidad de animaciones</div>
                  <div className="field-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span className="field-label">Opacidad del fondo</span>
                      <span style={{ fontSize: 13, color: '#f97316', fontWeight: 700 }}>{state.overlayOpacity}%</span>
                    </div>
                    <input
                      type="range"
                      className="volume-slider"
                      min={0}
                      max={100}
                      value={state.overlayOpacity}
                      onChange={e => window.electronAPI.updateAppState({ overlayOpacity: Number(e.target.value) })}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280' }}>
                      <span>0% (transparente)</span>
                      <span>100% (negro)</span>
                    </div>
                  </div>
                </div>
                <div className="config-group">
                  <div className="config-group-title">Giro</div>
                  <div className="field-row">
                    <span className="field-label">Giro 3D</span>
                    <button
                      className={`btn btn-sm ${(state.curtainFlipEnabled ?? true) ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => window.electronAPI.updateAppState({ curtainFlipEnabled: !(state.curtainFlipEnabled ?? true) })}
                    >
                      {(state.curtainFlipEnabled ?? true) ? 'Activado' : 'Desactivado'}
                    </button>
                  </div>
                  <div className="field-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8, marginTop: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span className="field-label">Duración</span>
                      <span style={{ fontSize: 13, color: '#f97316', fontWeight: 700 }}>{state.curtainFlipDuration ?? 10}s</span>
                    </div>
                    <input type="range" className="volume-slider" min={0.5} max={30} step={0.5}
                      value={state.curtainFlipDuration ?? 10}
                      onChange={e => window.electronAPI.updateAppState({ curtainFlipDuration: Number(e.target.value) })} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280' }}>
                      <span>0.5s (rápido)</span><span>30s (lento)</span>
                    </div>
                  </div>
                </div>
                <div className="config-group">
                  <div className="config-group-title">Color</div>
                  <div className="field-row">
                    <span className="field-label">Pulso de color</span>
                    <button
                      className={`btn btn-sm ${(state.curtainPulseEnabled ?? true) ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => window.electronAPI.updateAppState({ curtainPulseEnabled: !(state.curtainPulseEnabled ?? true) })}
                    >
                      {(state.curtainPulseEnabled ?? true) ? 'Activado' : 'Desactivado'}
                    </button>
                  </div>
                  <div className="field-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8, marginTop: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span className="field-label">Duración</span>
                      <span style={{ fontSize: 13, color: '#f97316', fontWeight: 700 }}>{state.curtainPulseDuration ?? 5}s</span>
                    </div>
                    <input type="range" className="volume-slider" min={0.5} max={20} step={0.5}
                      value={state.curtainPulseDuration ?? 5}
                      onChange={e => window.electronAPI.updateAppState({ curtainPulseDuration: Number(e.target.value) })} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280' }}>
                      <span>0.5s (rápido)</span><span>20s (lento)</span>
                    </div>
                  </div>
                  <div className="field-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8, marginTop: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span className="field-label">Color del logo (RGB)</span>
                      <span style={{ fontSize: 13, color: state.curtainPulseColor ?? '#ff5500', fontWeight: 700 }}>
                        {(state.curtainPulseColor ?? '#ff5500').toUpperCase()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        type="color"
                        value={state.curtainPulseColor ?? '#ff5500'}
                        onChange={e => window.electronAPI.updateAppState({ curtainPulseColor: e.target.value })}
                        style={{ width: 48, height: 32, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                      />
                      <input
                        type="text"
                        value={state.curtainPulseColor ?? '#ff5500'}
                        onChange={e => {
                          const v = e.target.value
                          if (/^#[0-9a-fA-F]{6}$/.test(v)) {
                            window.electronAPI.updateAppState({ curtainPulseColor: v.toLowerCase() })
                          } else {
                            window.electronAPI.updateAppState({ curtainPulseColor: v })
                          }
                        }}
                        placeholder="#ff5500"
                        style={{ flex: 1, padding: '6px 8px', background: '#1f2937', color: '#e5e7eb', border: '1px solid #374151', borderRadius: 4, fontFamily: 'monospace', fontSize: 13 }}
                      />
                      {[0, 1, 2].map(i => {
                        const hex = state.curtainPulseColor ?? '#ff5500'
                        const r = parseInt(hex.slice(1, 3), 16) || 0
                        const g = parseInt(hex.slice(3, 5), 16) || 0
                        const b = parseInt(hex.slice(5, 7), 16) || 0
                        const rgb = [r, g, b]
                        const labels = ['R', 'G', 'B']
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <span style={{ fontSize: 11, color: '#9ca3af' }}>{labels[i]}</span>
                            <input
                              type="number"
                              min={0}
                              max={255}
                              value={rgb[i]}
                              onChange={e => {
                                const v = Math.max(0, Math.min(255, Number(e.target.value) || 0))
                                rgb[i] = v
                                const next = '#' + rgb.map(n => n.toString(16).padStart(2, '0')).join('')
                                window.electronAPI.updateAppState({ curtainPulseColor: next })
                              }}
                              style={{ width: 52, padding: '4px 6px', background: '#1f2937', color: '#e5e7eb', border: '1px solid #374151', borderRadius: 4, fontSize: 12 }}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
                <div className="config-group">
                  <div className="config-group-title">Zumbido</div>
                  <div className="field-row">
                    <span className="field-label">Zumbido</span>
                    <button
                      className={`btn btn-sm ${(state.curtainWobbleEnabled ?? false) ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => window.electronAPI.updateAppState({ curtainWobbleEnabled: !(state.curtainWobbleEnabled ?? false) })}
                    >
                      {(state.curtainWobbleEnabled ?? false) ? 'Activado' : 'Desactivado'}
                    </button>
                  </div>
                  <div className="field-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8, marginTop: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span className="field-label">Duración</span>
                      <span style={{ fontSize: 13, color: '#f97316', fontWeight: 700 }}>{(state.curtainWobbleDuration ?? 0.35).toFixed(2)}s</span>
                    </div>
                    <input type="range" className="volume-slider" min={0.1} max={1.5} step={0.05}
                      value={state.curtainWobbleDuration ?? 0.35}
                      onChange={e => window.electronAPI.updateAppState({ curtainWobbleDuration: Number(e.target.value) })} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280' }}>
                      <span>0.1s (muy rápido)</span><span>1.5s (lento)</span>
                    </div>
                  </div>
                </div>
                <div className="config-group">
                  <div className="config-group-title">Logo</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {logoPreview && (
                      <img
                        key={state.logoVersion ?? 0}
                        src={logoPreview}
                        alt="Logo"
                        style={{ height: 64, objectFit: 'contain', background: '#000', borderRadius: 4, padding: 4 }}
                      />
                    )}
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={async () => {
                        const p = await window.electronAPI.selectLogo()
                        if (p) setLogoPreview(toLocalFile(p) + '?v=' + Date.now())
                      }}
                    >
                      Cambiar logo
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'objetivos' && (() => {
              const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
              const q = normalize(objectiveSearch.trim())
              const filteredObjectives = q
                ? objectiveData.filter(o => normalize(o.name).includes(q) || String(o.id).includes(q))
                : objectiveData
              return (
              <div className="obj-list">
                <div className="obj-list-toolbar" style={{ gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => setAddObjectiveModal(true)}>
                    <Plus size={13} /> Nuevo objetivo
                  </button>
                  <input
                    type="text"
                    className="field-input"
                    placeholder="Buscar objetivo..."
                    value={objectiveSearch}
                    onChange={e => setObjectiveSearch(e.target.value)}
                    style={{ flex: 1, fontSize: 12, padding: '6px 10px' }}
                  />
                </div>
                <table className="obj-table">
                  <thead>
                    <tr>
                      <th className="obj-th obj-th-num">#</th>
                      <th className="obj-th obj-th-play"></th>
                      <th className="obj-th obj-th-name">Nombre</th>
                      <th className="obj-th obj-th-pts">Pts</th>
                      <th className="obj-th obj-th-more"></th>
                      <th className="obj-th obj-th-del"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredObjectives.map(obj => (
                      <tr key={obj.id} className="obj-row">
                        <td className="obj-td obj-td-num">{obj.id}</td>
                        <td className="obj-td obj-td-play">
                          <button
                            className={`obj-play-btn${isAnimating ? ' obj-play-btn--blocked' : executedObjectives.has(obj.id) ? ' obj-play-btn--done' : ''}`}
                            disabled={isAnimating}
                            onClick={() => setAnnounceModal({ objective: obj, participantId: state.participants[0]?.id ?? '' })}
                          ><Play size={10} fill="#fff" color="#fff" /></button>
                        </td>
                        <td className="obj-td obj-td-name">
                          {obj.name}
                          {animatingKey === `obj-${obj.id}` && <span className="obj-executing-badge">En ejecución</span>}
                          {executedObjectives.has(obj.id) && animatingKey !== `obj-${obj.id}` && <span className="obj-executed-badge">Ya ejecutado</span>}
                        </td>
                        <td className="obj-td obj-td-pts">{obj.points}</td>
                        <td className="obj-td obj-td-more">
                          <button className="obj-more-btn" onClick={() => setModalObjective(obj)}>Ver más</button>
                        </td>
                        <td className="obj-td obj-td-del">
                          <button className="obj-del-btn" onClick={() => setDeleteObjectiveConfirm(obj)} title="Eliminar objetivo">
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )
            })()}

            {activeTab === 'desafios' && (
              <div className="obj-list">
                <div className="obj-list-toolbar" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setEnabledChallenges(new Set(challengeData.map(c => c.name)))}
                    >
                      Reiniciar
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => setAddChallengeModal(true)}
                    >
                      <Plus size={13} /> Nuevo
                    </button>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={enabledChallenges.size === 0}
                    onClick={() => setRouletteConfirm(true)}
                  >
                    Iniciar ruleta
                  </button>
                </div>
                <div className="challenge-list">
                  {challengeData.map(c => (
                    <div key={c.name} className={`challenge-item${enabledChallenges.has(c.name) ? '' : ' challenge-item--disabled'}`}>
                      <button
                        className="obj-play-btn"
                        title="Reproducir animación"
                        onClick={() => {
                          const names = challengeData.map(x => x.name)
                          const winnerIndex = names.indexOf(c.name)
                          if (winnerIndex < 0) return
                          window.electronAPI.updateAppState({ curtain: false, activeCinematic: null, activeCinematicName: null })
                          window.electronAPI.startRoulette(winnerIndex, names, true)
                          setEnabledChallenges(prev => { const s = new Set(prev); s.delete(c.name); return s })
                        }}
                      >
                        <Play size={10} fill="#fff" color="#fff" />
                      </button>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          className="challenge-checkbox"
                          checked={enabledChallenges.has(c.name)}
                          onChange={e => setEnabledChallenges(prev => {
                            const s = new Set(prev)
                            if (e.target.checked) s.add(c.name)
                            else s.delete(c.name)
                            return s
                          })}
                        />
                        <span>{c.name}</span>
                      </label>
                      <button
                        className="obj-del-btn"
                        onClick={() => setDeleteChallengeConfirm(c.name)}
                        title="Eliminar desafío"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'intro' && (
              <div className="obj-list intro-tab">
                <div className="intro-tab-header">
                  <span className="intro-tab-title">Intro del show</span>
                  <span className="intro-tab-counter">
                    {introElapsed !== null
                      ? `${Math.min(Math.floor(introElapsed), introDuration)}s / ${introDuration}s`
                      : `${introDuration}s de secuencia`}
                  </span>
                </div>

                <div className="ifm-field">
                  <span className="ifm-label">Texto del punto en el mapa</span>
                  <input
                    className="ifm-input"
                    value={state.introLocationText ?? ''}
                    placeholder="Ubicación clasificada"
                    onChange={e => window.electronAPI.updateAppState({ introLocationText: e.target.value })}
                  />
                  <span className="intro-tab-hint">
                    Se muestra en la escena del mapa que señala el punto.
                  </span>
                </div>

                <div className="intro-tab-actions">
                  <button
                    className={`btn intro-launch-btn${introElapsed !== null ? ' intro-launch-btn--running' : ''}`}
                    disabled={isAnimating}
                    onClick={handleStartIntro}
                  >
                    <Play size={13} fill="#fff" color="#fff" />
                    {introElapsed !== null ? 'Intro en curso' : 'Iniciar intro'}
                  </button>
                  <button
                    className="btn btn-ghost"
                    disabled={introElapsed === null}
                    onClick={handleStopIntro}
                  >
                    <Power size={13} /> Detener
                  </button>
                </div>

                <IntroTimeline
                  audioUrl={soundIntro}
                  timings={introTimings}
                  onChange={handleIntroCueChange}
                  onReset={handleIntroTimingsReset}
                  liveElapsed={introElapsed}
                />
              </div>
            )}

            {activeTab === 'cinematicas' && (
              <div className="obj-list">
                <div style={{ padding: '10px 4px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cinemáticas</span>
                  <button className="btn btn-primary btn-sm" onClick={() => setAddCinematicModal(true)}>
                    <Plus size={13} /> Nueva cinemática
                  </button>
                </div>
                <div className="challenge-list">
                  {cinematicData.map(c => (
                    <div
                      key={c.name}
                      className="challenge-item"
                      onClick={() => setPlayCinematicConfirm(c)}
                      style={{ cursor: 'pointer' }}
                    >
                      <button
                        className={`obj-play-btn${executedCinematics.has(c.name) ? ' obj-play-btn--done' : ''}`}
                        title="Reproducir"
                        onClick={e => { e.stopPropagation(); setPlayCinematicConfirm(c) }}
                      >
                        <Play size={10} fill="#fff" color="#fff" />
                      </button>
                      <span style={{ flex: 1, fontSize: 13 }}>
                        {c.name}
                        {executedCinematics.has(c.name) && <span className="obj-executed-badge" style={{ marginLeft: 8 }}>Ya ejecutado</span>}
                      </span>
                      <span style={{ fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                        {c.videoPath ? c.videoPath.split(/[\\/]/).pop() : 'Sin video'}
                      </span>
                      <button
                        className="obj-del-btn"
                        onClick={e => { e.stopPropagation(); setDeleteCinematicConfirm(c) }}
                        title="Eliminar cinemática"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {cinematicData.length === 0 && (
                    <div style={{ color: '#4b5563', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                      No hay cinemáticas. Agrega una con el botón de arriba.
                    </div>
                  )}
                </div>

                {/* ── Audios ── */}
                <div style={{ borderTop: '1px solid #333', padding: '10px 4px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', letterSpacing: '0.08em' }}>AUDIOS</span>
                  <button className="btn btn-primary btn-sm" onClick={() => setAddCinematicAudioModal(true)}>
                    <Plus size={13} /> Nuevo audio
                  </button>
                </div>
                <div className="challenge-list">
                  {cinematicAudioData.map(a => (
                    <div
                      key={a.name}
                      className="challenge-item"
                      onClick={() => setPlayCinematicAudioConfirm(a)}
                      style={{ cursor: 'pointer' }}
                    >
                      <button
                        className={`obj-play-btn${executedCinematicAudios.has(a.name) ? ' obj-play-btn--done' : ''}`}
                        title="Reproducir"
                        onClick={e => { e.stopPropagation(); setPlayCinematicAudioConfirm(a) }}
                      >
                        <Play size={10} fill="#fff" color="#fff" />
                      </button>
                      <span style={{ flex: 1, fontSize: 13 }}>
                        {a.name}
                        {executedCinematicAudios.has(a.name) && <span className="obj-executed-badge" style={{ marginLeft: 8 }}>Ya ejecutado</span>}
                      </span>
                      <span style={{ fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                        {a.audioPath ? a.audioPath.split(/[\\/]/).pop() : 'Sin audio'}
                      </span>
                      <button
                        className="obj-del-btn"
                        onClick={e => { e.stopPropagation(); setDeleteCinematicAudioConfirm(a) }}
                        title="Eliminar audio"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {cinematicAudioData.length === 0 && (
                    <div style={{ color: '#4b5563', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
                      No hay audios.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'misiones' && (
              <div className="obj-list">
                <div className="obj-list-toolbar">
                  <button className="btn btn-primary btn-sm" onClick={() => setAddMissionModal(true)}>
                    <Plus size={13} /> Nueva misión
                  </button>
                </div>
                <table className="obj-table">
                  <thead>
                    <tr>
                      <th className="obj-th obj-th-num">#</th>
                      <th className="obj-th obj-th-play"></th>
                      <th className="obj-th obj-th-name">Nombre</th>
                      <th className="obj-th obj-th-del"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {regularMissions.map((m, idx) => {
                      const preload = state.missionPreloads?.[m.name]
                      const preloadNames = preload
                        ? preload.allPlay
                          ? 'Todos'
                          : state.participants
                              .filter(p => preload.assignments[p.id] === 'impro' || preload.assignments[p.id] === 'sible')
                              .map(p => p.name)
                              .join(', ')
                        : null
                      const isDragging = missionDragIdx === idx
                      const isDragOver = missionDragOverIdx === idx && missionDragIdx !== null && missionDragIdx !== idx
                      return (
                      <tr
                        key={m.id}
                        className="obj-row"
                        onDragOver={e => {
                          if (missionDragIdx === null) return
                          e.preventDefault()
                          if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
                          if (missionDragOverIdx !== idx) setMissionDragOverIdx(idx)
                        }}
                        onDrop={e => {
                          e.preventDefault()
                          if (missionDragIdx !== null) reorderRegularMissions(missionDragIdx, idx)
                          setMissionDragIdx(null)
                          setMissionDragOverIdx(null)
                        }}
                        style={{
                          opacity: isDragging ? 0.4 : 1,
                          borderTop: isDragOver && (missionDragIdx ?? 0) > idx ? '2px solid #f97316' : undefined,
                          borderBottom: isDragOver && (missionDragIdx ?? 0) < idx ? '2px solid #f97316' : undefined,
                        }}
                      >
                        <td className="obj-td obj-td-num">
                          <span
                            draggable
                            onDragStart={e => {
                              setMissionDragIdx(idx)
                              if (e.dataTransfer) {
                                e.dataTransfer.effectAllowed = 'move'
                                e.dataTransfer.setData('text/plain', String(idx))
                              }
                            }}
                            onDragEnd={() => { setMissionDragIdx(null); setMissionDragOverIdx(null) }}
                            title="Arrastrar para reordenar"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, cursor: 'grab', color: '#6b7280' }}
                          >
                            <GripVertical size={12} />
                            {m.id}
                          </span>
                        </td>
                        <td className="obj-td obj-td-play">
                          <button
                            className={`obj-play-btn${animatingKey === `mission-${m.id}` ? ' obj-play-btn--executing' : isAnimating ? ' obj-play-btn--blocked' : executedMissions.has(m.id) ? ' obj-play-btn--done' : ''}`}
                            disabled={isAnimating}
                            onClick={() => { fireMission(m.name, `mission-${m.id}`); setExecutedMissions(prev => new Set(prev).add(m.id)) }}
                          ><Play size={10} fill="#fff" color="#fff" /></button>
                        </td>
                        <td className="obj-td obj-td-name">
                          {m.name}
                          {animatingKey === `mission-${m.id}` && <span className="obj-executing-badge">En ejecución</span>}
                          {executedMissions.has(m.id) && animatingKey !== `mission-${m.id}` && <span className="obj-executed-badge">Ya ejecutado</span>}
                          {state.missionView?.active && state.missionView.name === m.name && (
                            <button
                              className="btn btn-danger"
                              style={{ marginLeft: 8, padding: '3px 10px', fontSize: 11 }}
                              onClick={() => window.electronAPI.updateAppState({ missionView: null })}
                            >
                              Finalizar
                            </button>
                          )}
                          {preloadNames && (
                            <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <div style={{ fontSize: 11, color: '#f97316', fontWeight: 500 }}>
                                Precargado con: <span style={{ color: '#e5e7eb' }}>{preloadNames}</span>
                              </div>
                              <button
                                className="btn btn-primary"
                                style={{ padding: '3px 10px', fontSize: 11 }}
                                onClick={() => {
                                  const teamImpro = preload!.allPlay ? [] : state.participants.filter(p => preload!.assignments[p.id] === 'impro').map(p => p.id)
                                  const teamSible = preload!.allPlay ? [] : state.participants.filter(p => preload!.assignments[p.id] === 'sible').map(p => p.id)
                                  window.electronAPI.updateAppState({ missionView: { active: true, name: m.name, teamImpro, teamSible, allPlay: preload!.allPlay } })
                                }}
                              >
                                Ejecutar misión precargada
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="obj-td obj-td-del">
                          <button className="obj-del-btn" onClick={() => setDeleteMissionConfirm(m)} title="Eliminar misión">
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
                <div style={{ padding: '12px 4px 0', display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setMissionModal(true)}>
                    Iniciar misión
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      const first = regularMissions[0]?.name ?? ''
                      const existing = first ? state.missionPreloads?.[first] : undefined
                      setPreloadMissionName(first)
                      setPreloadAllPlay(existing?.allPlay ?? false)
                      setPreloadAssignments(existing?.assignments ?? {})
                      setPreloadModal(true)
                    }}
                  >
                    Precargar agentes
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'improsible' && (
              <div className="obj-list improsible-tab">
                {/* Header */}
                <div className="improsible-tab-header">
                  <span className="improsible-tab-title">Misión Improsible</span>
                  <span className="improsible-tab-counter">{improsibleFinalists ? improsibleFinalists.filter(Boolean).length : 0}/2 finalistas</span>
                </div>

                {/* Finalist slots */}
                <div className="improsible-slots">
                  {([0, 1] as const).map(idx => {
                    const fId = improsibleFinalists?.[idx]
                    const fp = fId ? state.participants.find(p => p.id === fId) : null
                    return (
                      <div key={idx} className={`improsible-slot${fp ? ' improsible-slot--filled' : ''}`}>
                        {fp ? (
                          <>
                            {fp.photoPath && (
                              <img src={toLocalFile(fp.photoPath) ?? ''} alt={fp.name} className="improsible-slot-photo" />
                            )}
                            <span className="improsible-slot-name">{fp.name}</span>
                            <button
                              className="improsible-slot-remove"
                              onClick={() => {
                                const next = [...(improsibleFinalists ?? ['', ''])] as [string, string]
                                next[idx] = ''
                                const filtered = next.filter(Boolean)
                                setImprosibleFinalists(filtered.length === 2 ? [filtered[0], filtered[1]] : null)
                              }}
                            >×</button>
                          </>
                        ) : (
                          <span className="improsible-slot-empty">Finalista {idx + 1}</span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Participant grid */}
                <p className="improsible-grid-label">Seleccione sus participantes</p>
                <div className="improsible-pcard-grid">
                  {state.participants.slice(0, state.visibleParticipants).map(p => {
                    const isSelected = improsibleFinalists?.[0] === p.id || improsibleFinalists?.[1] === p.id
                    const isFull = !!(improsibleFinalists?.[0] && improsibleFinalists?.[1])
                    const isDisabled = isFull && !isSelected
                    const photoUrl = p.photoPath ? toLocalFile(p.photoPath) : null
                    const initials = p.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                    return (
                      <div
                        key={p.id}
                        className={`improsible-pcard${isSelected ? ' improsible-pcard--selected' : ''}${isDisabled ? ' improsible-pcard--disabled' : ''}${p.eliminated ? ' improsible-pcard--elim' : ''}`}
                        onClick={() => {
                          if (isDisabled) return
                          if (isSelected) {
                            const next = [...(improsibleFinalists ?? ['', ''])] as [string, string]
                            const idxToRemove = next.indexOf(p.id)
                            if (idxToRemove >= 0) next[idxToRemove] = ''
                            const filtered = next.filter(Boolean)
                            setImprosibleFinalists(filtered.length === 2 ? [filtered[0], filtered[1]] : null)
                          } else {
                            if (!improsibleFinalists) {
                              setImprosibleFinalists([p.id, ''] as unknown as [string, string])
                            } else {
                              const next = [...improsibleFinalists] as [string, string]
                              const emptyIdx = next.indexOf('' as string)
                              if (emptyIdx >= 0) next[emptyIdx] = p.id
                              setImprosibleFinalists(next)
                            }
                          }
                          setImprosibleLaunched(false)
                        }}
                      >
                        <div className="improsible-pcard-photo">
                          {photoUrl
                            ? <img src={photoUrl} alt={p.name} className="improsible-pcard-img" />
                            : <span className="improsible-pcard-initials">{initials}</span>
                          }
                          {isSelected && <div className="improsible-pcard-check-badge">✓</div>}
                          {p.eliminated && <span className="improsible-pcard-elim-badge">ELIM.</span>}
                        </div>
                        <span className="improsible-pcard-name">{p.name}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Action buttons */}
                <div className="improsible-actions">
                  <button
                    className={`btn improsible-launch-btn${improsibleLaunched ? ' improsible-launch-btn--done' : ''}`}
                    disabled={!(improsibleFinalists?.[0] && improsibleFinalists?.[1]) || isAnimating}
                    onClick={() => {
                      if (!improsibleFinalists?.[0] || !improsibleFinalists?.[1]) return
                      window.electronAPI.startImprosible([improsibleFinalists[0], improsibleFinalists[1]])
                      setImprosibleLaunched(true)
                      // Bloqueo generoso; onImprosibleStart recalcula con duración real del audio
                      blockFor(30000, 'improsible')
                    }}
                  >
                    {improsibleLaunched ? 'Misión en curso' : 'Iniciar Misión Improsible'}
                  </button>
                  <button
                    className="btn btn-ghost improsible-clear-btn"
                    onClick={() => {
                      window.electronAPI.clearImprosible()
                      setImprosibleLaunched(false)
                      setSelectedWinnerId(null)
                      setFinalAnimationPlaying(false)
                    }}
                  >
                    Cerrar overlay
                  </button>
                </div>

                {/* Selector de ganador — visible solo cuando la misión está activa */}
                {improsibleLaunched && improsibleFinalists?.[0] && improsibleFinalists?.[1] && (() => {
                  const fa = state.participants.find(p => p.id === improsibleFinalists[0])
                  const fb = state.participants.find(p => p.id === improsibleFinalists[1])
                  const toLocal = (path: string | null) => {
                    if (!path) return null
                    const normalized = path.replace(/\\/g, '/')
                    const encoded = normalized.split('/').map((seg: string, i: number) =>
                      i === 0 && /^[A-Za-z]:$/.test(seg) ? seg : encodeURIComponent(seg)
                    ).join('/')
                    return `localfile:///${encoded}`
                  }
                  return (
                    <div className="improsible-winner-selector">
                      <div className="improsible-winner-selector-title">Seleccionar ganador</div>
                      <div className="improsible-winner-cards">
                        {[fa, fb].map(p => {
                          if (!p) return null
                          const photoUrl = toLocal(p.photoPath)
                          const isWinner = selectedWinnerId === p.id
                          return (
                            <div
                              key={p.id}
                              className={`improsible-winner-card${isWinner ? ' improsible-winner-card--selected' : ''}`}
                              onClick={() => setSelectedWinnerId(isWinner ? null : p.id)}
                            >
                              <div className="improsible-winner-card-photo">
                                {photoUrl
                                  ? <img src={photoUrl} alt={p.name} />
                                  : <span>{p.name[0]}</span>
                                }
                                {isWinner && <div className="improsible-winner-card-crown">👑</div>}
                              </div>
                              <div className="improsible-winner-card-name">{p.name}</div>
                            </div>
                          )
                        })}
                      </div>
                      <button
                        className={`btn improsible-final-btn${finalAnimationPlaying ? ' improsible-final-btn--playing' : ''}`}
                        disabled={!selectedWinnerId || finalAnimationPlaying}
                        onClick={() => {
                          if (!selectedWinnerId) return
                          window.electronAPI.startImprosibleFinal(selectedWinnerId)
                          setFinalAnimationPlaying(true)
                        }}
                      >
                        {finalAnimationPlaying ? 'Animación final en curso' : 'Animación final'}
                      </button>
                    </div>
                  )
                })()}

                {/* Mensaje final — totalmente configurable */}
                <div className="improsible-final-message">
                  <div className="improsible-winner-selector-title">Mensaje final</div>

                  <div className="ifm-field">
                    <span className="ifm-label">Mensaje principal</span>
                    <input
                      className="ifm-input"
                      value={state.improsibleWinnerLabel ?? '¡GANADOR!'}
                      placeholder="¡GANADOR!"
                      onChange={e => window.electronAPI.updateAppState({ improsibleWinnerLabel: e.target.value })}
                    />
                  </div>

                  <div className="ifm-field">
                    <span className="ifm-label">Mensaje secundario</span>
                    <input
                      className="ifm-input"
                      value={state.improsibleWinnerSublabel ?? 'MEJOR AGENTE'}
                      placeholder="MEJOR AGENTE"
                      onChange={e => window.electronAPI.updateAppState({ improsibleWinnerSublabel: e.target.value })}
                    />
                  </div>

                  <div className="ifm-field">
                    <span className="ifm-label">Color de la fuente</span>
                    <div className="ifm-color">
                      <input
                        type="color"
                        className="ifm-swatch"
                        value={state.improsibleWinnerColor ?? '#f97316'}
                        onChange={e => window.electronAPI.updateAppState({ improsibleWinnerColor: e.target.value })}
                      />
                      <input
                        type="text"
                        className="ifm-input ifm-input--hex"
                        value={state.improsibleWinnerColor ?? '#f97316'}
                        placeholder="#f97316"
                        onChange={e => window.electronAPI.updateAppState({ improsibleWinnerColor: e.target.value })}
                      />
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => window.electronAPI.updateAppState({ improsibleWinnerColor: '#f97316' })}
                      >
                        Restablecer
                      </button>
                    </div>
                  </div>

                  <div className="ifm-preview">
                    <span className="ifm-preview-hint">Vista previa</span>
                    <span className="ifm-preview-label" style={{ color: state.improsibleWinnerColor ?? '#f97316' }}>
                      {state.improsibleWinnerLabel || '¡GANADOR!'}
                    </span>
                    <span className="ifm-preview-sub">
                      {state.improsibleWinnerSublabel || 'MEJOR AGENTE'}
                    </span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        <aside className="right-panel">
          {(() => {
            const live = state.activeCinematic
              ? { kind: 'cinematic', label: 'Cinemática' }
              : state.curtain
                ? { kind: 'curtain', label: 'Cortina' }
                : { kind: 'scores', label: 'Puntuaciones' }
            return (
              <div className="preview-header">
                <span className="preview-title">Vista previa</span>
                <span className={`live-pill live-pill--${live.kind}`}>
                  <span className="live-dot" />{live.label}
                </span>
              </div>
            )
          })()}
          <div className="preview-frame">
            <ProjectionPreview state={state} />
          </div>
        </aside>
      </div>

      {/* ── Ruleta confirm ── */}
      {rouletteConfirm && (
        <div className="obj-modal-overlay" onClick={() => setRouletteConfirm(false)}>
          <div className="obj-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 340, textAlign: 'center' }}>
            <div className="obj-modal-header" style={{ justifyContent: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>¿Iniciar ruleta?</span>
            </div>
            <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 20px' }}>
              Se mostrará una animación de ruleta en la proyección y se seleccionará un desafío al azar.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setRouletteConfirm(false)}>Cancelar</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const enabledArray = [...enabledChallenges]
                  const winnerIndex = Math.floor(Math.random() * enabledArray.length)
                  const winnerName = enabledArray[winnerIndex]
                  window.electronAPI.updateAppState({ curtain: false, activeCinematic: null, activeCinematicName: null })
                  window.electronAPI.startRoulette(winnerIndex, enabledArray)
                  setEnabledChallenges(prev => { const s = new Set(prev); s.delete(winnerName); return s })
                  setRouletteConfirm(false)
                }}
              >
                Iniciar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Anunciar objetivo ── */}
      {announceModal && (
        <div className="obj-modal-overlay" onClick={() => setAnnounceModal(null)}>
          <div className="obj-modal" onClick={e => e.stopPropagation()}>
            <div className="obj-modal-header">
              <span className="obj-modal-num">#{announceModal.objective.id}</span>
              <span className="obj-modal-title">{announceModal.objective.name}</span>
              <span className="obj-modal-pts">{announceModal.objective.points} pts</span>
            </div>
            <div className="field-row" style={{ marginTop: 12 }}>
              <span className="field-label">Participante</span>
              <select
                className="field-input"
                value={announceModal.participantId}
                onChange={e => setAnnounceModal({ ...announceModal, participantId: e.target.value })}
              >
                {state.participants.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setAnnounceModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => {
                const { objective, participantId } = announceModal
                setAnnounceModal(null)
                setExecutedObjectives(prev => new Set(prev).add(objective.id))
                blockFor(5000, `obj-${objective.id}`)
                window.electronAPI.announceObjective(objective.name)
                setTimeout(() => window.electronAPI.updateScore(participantId, objective.points), 5000)
              }}>Ejecutar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Iniciar misión ── */}
      {missionModal && state && (
        <div className="obj-modal-overlay" onClick={() => { setMissionModal(false); setAllPlay(false); setUsePreload(false) }}>
          <div className="obj-modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="obj-modal-header">
              <span className="obj-modal-title">Iniciar misión</span>
            </div>
            <div className="field-row">
              <span className="field-label">Misión</span>
              <select className="field-input" value={missionName} onChange={e => setMissionName(e.target.value)}>
                {regularMissions.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            </div>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="allPlayCheck" checked={allPlay} disabled={usePreload} onChange={e => setAllPlay(e.target.checked)} />
                <label htmlFor="allPlayCheck" style={{ fontSize: 13, color: usePreload ? '#6b7280' : '#eee', cursor: usePreload ? 'not-allowed' : 'pointer' }}>Todos juegan</label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="usePreloadCheck"
                  checked={usePreload}
                  disabled={!state.missionPreloads?.[missionName]}
                  onChange={e => setUsePreload(e.target.checked)}
                />
                <label htmlFor="usePreloadCheck" style={{ fontSize: 13, color: state.missionPreloads?.[missionName] ? '#eee' : '#6b7280', cursor: state.missionPreloads?.[missionName] ? 'pointer' : 'not-allowed' }}>
                  Usar precargados
                </label>
              </div>
            </div>
            {usePreload && activePreload && (
              <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 4 }}>
                <div style={{ fontSize: 12, color: '#f97316', fontWeight: 700, marginBottom: 6 }}>Precargado</div>
                {activePreload.allPlay ? (
                  <div style={{ fontSize: 12, color: '#eee' }}>Todos juegan</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {state.participants.slice(0, state.visibleParticipants).map(p => {
                      const team = activePreload.assignments[p.id] ?? 'none'
                      const label = team === 'impro' ? 'Equipo A' : team === 'sible' ? 'Equipo B' : 'No participa'
                      const color = team === 'impro' ? '#f97316' : team === 'sible' ? '#3b82f6' : '#6b7280'
                      return (
                        <div key={p.id} style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#eee' }}>{p.name}{p.eliminated ? ' (eliminado)' : ''}</span>
                          <span style={{ color, fontWeight: 700 }}>{label}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
            {!allPlay && !usePreload && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {state.participants.slice(0, state.visibleParticipants).map(p => (
                  <div key={p.id} className="field-row" style={{ opacity: p.eliminated ? 0.55 : 1 }}>
                    <span className="field-label" style={{ width: 120, fontSize: 13, color: '#eee' }}>
                      {p.name}{p.eliminated ? ' (eliminado)' : ''}
                    </span>
                    <select
                      className="field-input"
                      value={missionAssignments[p.id] ?? 'none'}
                      onChange={e => setMissionAssignments(prev => ({ ...prev, [p.id]: e.target.value as 'impro' | 'sible' | 'none' }))}
                    >
                      <option value="none">No participa</option>
                      <option value="impro">Equipo A</option>
                      <option value="sible">Equipo B</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
            {!allPlay && !missionCanStart && Object.keys(missionAssignments).length > 0 && (
              <div style={{ fontSize: 12, color: '#dc2626', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 4, padding: '6px 10px' }}>
                Debe haber al menos un participante en cada equipo.
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => { setMissionModal(false); setAllPlay(false); setUsePreload(false) }}>Cancelar</button>
              <button
                className="btn btn-primary"
                disabled={!missionCanStart}
                onClick={() => {
                  const teamImpro = effectiveAllPlay ? [] : state.participants.filter(p => effectiveAssignments[p.id] === 'impro').map(p => p.id)
                  const teamSible = effectiveAllPlay ? [] : state.participants.filter(p => effectiveAssignments[p.id] === 'sible').map(p => p.id)
                  window.electronAPI.updateAppState({ missionView: { active: true, name: missionName, teamImpro, teamSible, allPlay: effectiveAllPlay } })
                  setMissionModal(false)
                  setUsePreload(false)
                }}
              >
                Iniciar misión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Precargar agentes ── */}
      {preloadModal && state && (
        <div className="obj-modal-overlay" onClick={() => setPreloadModal(false)}>
          <div className="obj-modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <div className="obj-modal-header">
              <span className="obj-modal-title">Precargar agentes</span>
            </div>
            <div className="field-row">
              <span className="field-label">Misión</span>
              <select
                className="field-input"
                value={preloadMissionName}
                onChange={e => {
                  const name = e.target.value
                  const existing = state.missionPreloads?.[name]
                  setPreloadMissionName(name)
                  setPreloadAllPlay(existing?.allPlay ?? false)
                  setPreloadAssignments(existing?.assignments ?? {})
                }}
              >
                {regularMissions.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            </div>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id="preloadAllPlayCheck" checked={preloadAllPlay} onChange={e => setPreloadAllPlay(e.target.checked)} />
              <label htmlFor="preloadAllPlayCheck" style={{ fontSize: 13, color: '#eee', cursor: 'pointer' }}>Todos juegan</label>
            </div>
            {!preloadAllPlay && (
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {state.participants.slice(0, state.visibleParticipants).map(p => (
                  <div key={p.id} className="field-row" style={{ opacity: p.eliminated ? 0.55 : 1 }}>
                    <span className="field-label" style={{ width: 120, fontSize: 13, color: '#eee' }}>
                      {p.name}{p.eliminated ? ' (eliminado)' : ''}
                    </span>
                    <select
                      className="field-input"
                      value={preloadAssignments[p.id] ?? 'none'}
                      onChange={e => setPreloadAssignments(prev => ({ ...prev, [p.id]: e.target.value as 'impro' | 'sible' | 'none' }))}
                    >
                      <option value="none">No participa</option>
                      <option value="impro">Equipo A</option>
                      <option value="sible">Equipo B</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
            {state.missionPreloads?.[preloadMissionName] && (
              <div style={{ marginTop: 12, fontSize: 11, color: '#6b7280' }}>
                Esta misión ya tiene una precarga guardada; al guardar se sobrescribe.
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'space-between' }}>
              <button
                className="btn btn-danger"
                disabled={!state.missionPreloads?.[preloadMissionName]}
                onClick={() => {
                  const next = { ...(state.missionPreloads ?? {}) }
                  delete next[preloadMissionName]
                  window.electronAPI.updateAppState({ missionPreloads: next })
                  setPreloadModal(false)
                }}
              >
                Eliminar
              </button>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" onClick={() => setPreloadModal(false)}>Cancelar</button>
                <button
                  className="btn btn-primary"
                  disabled={!preloadMissionName || (!preloadAllPlay &&
                    !(state.participants.some(p => (preloadAssignments[p.id] ?? 'none') === 'impro') &&
                      state.participants.some(p => (preloadAssignments[p.id] ?? 'none') === 'sible')))}
                  onClick={() => {
                    const next = {
                      ...(state.missionPreloads ?? {}),
                      [preloadMissionName]: { allPlay: preloadAllPlay, assignments: preloadAssignments },
                    }
                    window.electronAPI.updateAppState({ missionPreloads: next })
                    setPreloadModal(false)
                  }}
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Ver más objetivo ── */}
      {modalObjective && (
        <div className="obj-modal-overlay" onClick={() => setModalObjective(null)}>
          <div className="obj-modal" onClick={e => e.stopPropagation()}>
            <div className="obj-modal-header">
              <span className="obj-modal-num">#{modalObjective.id}</span>
              <span className="obj-modal-title">{modalObjective.name}</span>
              <span className="obj-modal-pts">{modalObjective.points} pts</span>
            </div>
            <p className="obj-modal-desc">{modalObjective.description}</p>
            <button className="btn btn-ghost obj-modal-close" onClick={() => setModalObjective(null)}>Cerrar</button>
          </div>
        </div>
      )}

      {/* ── Añadir misión ── */}
      {addMissionModal && (
        <div className="obj-modal-overlay" onClick={() => { setAddMissionModal(false); setNewMissionName(''); setNewMissionAudio(null) }}>
          <div className="obj-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="obj-modal-header">
              <span className="obj-modal-title">Nueva misión</span>
            </div>
            <div className="field-row" style={{ marginTop: 12 }}>
              <span className="field-label">Nombre</span>
              <input
                className="field-input"
                placeholder="Nombre de la misión"
                value={newMissionName}
                onChange={e => setNewMissionName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="field-row">
              <span className="field-label">Audio</span>
              <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                <span style={{ flex: 1, fontSize: 12, color: newMissionAudio ? '#f97316' : '#6b7280', alignSelf: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {newMissionAudio ? newMissionAudio.split(/[\\/]/).pop() : 'Sin audio'}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={async () => {
                  const p = await window.electronAPI.selectAudio()
                  if (p) setNewMissionAudio(p)
                }}>Seleccionar</button>
                {newMissionAudio && <button className="btn btn-ghost btn-sm" onClick={() => setNewMissionAudio(null)}>✕</button>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => { setAddMissionModal(false); setNewMissionName(''); setNewMissionAudio(null) }}>Cancelar</button>
              <button className="btn btn-primary" disabled={!newMissionName.trim()} onClick={handleAddMission}>Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Eliminar misión ── */}
      {deleteMissionConfirm && (
        <div className="obj-modal-overlay" onClick={() => setDeleteMissionConfirm(null)}>
          <div className="obj-modal" style={{ maxWidth: 360, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div className="obj-modal-header" style={{ justifyContent: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>¿Eliminar misión?</span>
            </div>
            <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 4px' }}>
              Se eliminará permanentemente:
            </p>
            <p style={{ color: '#f97316', fontSize: 14, fontWeight: 700, margin: '0 0 20px' }}>
              {deleteMissionConfirm.name}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteMissionConfirm(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleDeleteMission(deleteMissionConfirm)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Añadir objetivo ── */}
      {addObjectiveModal && (
        <div className="obj-modal-overlay" onClick={() => { setAddObjectiveModal(false); setNewObjName(''); setNewObjDesc(''); setNewObjPoints(5); setNewObjAudio(null) }}>
          <div className="obj-modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="obj-modal-header">
              <span className="obj-modal-title">Nuevo objetivo</span>
            </div>
            <div className="field-row" style={{ marginTop: 12 }}>
              <span className="field-label">Nombre</span>
              <input
                className="field-input"
                placeholder="Nombre del objetivo"
                value={newObjName}
                onChange={e => setNewObjName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="field-row">
              <span className="field-label">Puntos</span>
              <input
                className="field-input"
                type="number"
                min={1}
                value={newObjPoints}
                onChange={e => setNewObjPoints(Number(e.target.value))}
                style={{ maxWidth: 80 }}
              />
            </div>
            <div className="field-row" style={{ alignItems: 'flex-start' }}>
              <span className="field-label" style={{ paddingTop: 6 }}>Descripción</span>
              <textarea
                className="field-input"
                placeholder="Descripción del objetivo"
                rows={3}
                value={newObjDesc}
                onChange={e => setNewObjDesc(e.target.value)}
                style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }}
              />
            </div>
            <div className="field-row">
              <span className="field-label">Audio</span>
              <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                <span style={{ flex: 1, fontSize: 12, color: newObjAudio ? '#f97316' : '#6b7280', alignSelf: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {newObjAudio ? newObjAudio.split(/[\\/]/).pop() : 'Sin audio'}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={async () => {
                  const p = await window.electronAPI.selectAudio()
                  if (p) setNewObjAudio(p)
                }}>Seleccionar</button>
                {newObjAudio && <button className="btn btn-ghost btn-sm" onClick={() => setNewObjAudio(null)}>✕</button>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => { setAddObjectiveModal(false); setNewObjName(''); setNewObjDesc(''); setNewObjPoints(5); setNewObjAudio(null) }}>Cancelar</button>
              <button className="btn btn-primary" disabled={!newObjName.trim() || !newObjDesc.trim()} onClick={handleAddObjective}>Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Eliminar objetivo ── */}
      {deleteObjectiveConfirm && (
        <div className="obj-modal-overlay" onClick={() => setDeleteObjectiveConfirm(null)}>
          <div className="obj-modal" style={{ maxWidth: 360, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div className="obj-modal-header" style={{ justifyContent: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>¿Eliminar objetivo?</span>
            </div>
            <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 4px' }}>
              Se eliminará permanentemente:
            </p>
            <p style={{ color: '#f97316', fontSize: 14, fontWeight: 700, margin: '0 0 20px' }}>
              {deleteObjectiveConfirm.name}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteObjectiveConfirm(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleDeleteObjective(deleteObjectiveConfirm)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Añadir desafío ── */}
      {addChallengeModal && (
        <div className="obj-modal-overlay" onClick={() => { setAddChallengeModal(false); setNewChallengeName(''); setNewChallengeAudio(null) }}>
          <div className="obj-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="obj-modal-header">
              <span className="obj-modal-title">Nuevo desafío</span>
            </div>
            <div className="field-row" style={{ marginTop: 12 }}>
              <span className="field-label">Nombre</span>
              <input
                className="field-input"
                placeholder="Nombre del desafío"
                value={newChallengeName}
                onChange={e => setNewChallengeName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="field-row">
              <span className="field-label">Audio</span>
              <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                <span style={{ flex: 1, fontSize: 12, color: newChallengeAudio ? '#f97316' : '#6b7280', alignSelf: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {newChallengeAudio ? newChallengeAudio.split(/[\\/]/).pop() : 'Sin audio'}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={async () => {
                  const p = await window.electronAPI.selectAudio()
                  if (p) setNewChallengeAudio(p)
                }}>Seleccionar</button>
                {newChallengeAudio && <button className="btn btn-ghost btn-sm" onClick={() => setNewChallengeAudio(null)}>✕</button>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => { setAddChallengeModal(false); setNewChallengeName(''); setNewChallengeAudio(null) }}>Cancelar</button>
              <button className="btn btn-primary" disabled={!newChallengeName.trim()} onClick={handleAddChallenge}>Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmar reproducción cinemática ── */}
      {playCinematicConfirm && (
        <div className="obj-modal-overlay" onClick={() => setPlayCinematicConfirm(null)}>
          <div className="obj-modal" style={{ maxWidth: 340, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div className="obj-modal-header" style={{ justifyContent: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>¿Reproducir cinemática?</span>
            </div>
            <p style={{ color: '#f97316', fontSize: 14, fontWeight: 700, margin: '0 0 20px' }}>
              {playCinematicConfirm.name}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setPlayCinematicConfirm(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => {
                window.electronAPI.updateAppState({ activeCinematic: playCinematicConfirm.videoPath, activeCinematicName: playCinematicConfirm.name, curtain: false })
                setExecutedCinematics(prev => new Set(prev).add(playCinematicConfirm.name))
                setPlayCinematicConfirm(null)
              }}>Reproducir</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmar reproducción audio ── */}
      {playCinematicAudioConfirm && (
        <div className="obj-modal-overlay" onClick={() => setPlayCinematicAudioConfirm(null)}>
          <div className="obj-modal" style={{ maxWidth: 340, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div className="obj-modal-header" style={{ justifyContent: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>¿Reproducir audio?</span>
            </div>
            <p style={{ color: '#f97316', fontSize: 14, fontWeight: 700, margin: '0 0 20px' }}>
              {playCinematicAudioConfirm.name}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setPlayCinematicAudioConfirm(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => {
                const { audioPath, name } = playCinematicAudioConfirm
                if (audioPath) {
                  window.electronAPI.updateAppState({
                    curtain: true,
                    activeCinematic: null,
                    activeCinematicName: null,
                    activeCinematicAudio: audioPath,
                    activeCinematicAudioName: name,
                  })
                }
                setExecutedCinematicAudios(prev => new Set(prev).add(name))
                setPlayCinematicAudioConfirm(null)
              }}>Reproducir</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Añadir audio cinemática ── */}
      {addCinematicAudioModal && (
        <div className="obj-modal-overlay" onClick={() => { setAddCinematicAudioModal(false); setNewCinematicAudioName(''); setNewCinematicAudioPath(null) }}>
          <div className="obj-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="obj-modal-header">
              <span className="obj-modal-title">Nuevo audio</span>
            </div>
            <div className="field-row" style={{ marginTop: 12 }}>
              <span className="field-label">Nombre</span>
              <input
                className="field-input"
                placeholder="Nombre del audio"
                value={newCinematicAudioName}
                onChange={e => setNewCinematicAudioName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="field-row">
              <span className="field-label">Audio</span>
              <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                <span style={{ flex: 1, fontSize: 12, color: newCinematicAudioPath ? '#f97316' : '#6b7280', alignSelf: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {newCinematicAudioPath ? newCinematicAudioPath.split(/[\\/]/).pop() : 'Sin audio'}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={async () => {
                  const p = await window.electronAPI.selectAudio()
                  if (p) setNewCinematicAudioPath(p)
                }}>Seleccionar</button>
                {newCinematicAudioPath && <button className="btn btn-ghost btn-sm" onClick={() => setNewCinematicAudioPath(null)}>✕</button>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => { setAddCinematicAudioModal(false); setNewCinematicAudioName(''); setNewCinematicAudioPath(null) }}>Cancelar</button>
              <button className="btn btn-primary" disabled={!newCinematicAudioName.trim() || !newCinematicAudioPath} onClick={handleAddCinematicAudio}>Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Eliminar audio cinemática ── */}
      {deleteCinematicAudioConfirm && (
        <div className="obj-modal-overlay" onClick={() => setDeleteCinematicAudioConfirm(null)}>
          <div className="obj-modal" style={{ maxWidth: 360, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div className="obj-modal-header" style={{ justifyContent: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>¿Eliminar audio?</span>
            </div>
            <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 4px' }}>Se eliminará permanentemente:</p>
            <p style={{ color: '#f97316', fontSize: 14, fontWeight: 700, margin: '0 0 20px' }}>{deleteCinematicAudioConfirm.name}</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteCinematicAudioConfirm(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleDeleteCinematicAudio(deleteCinematicAudioConfirm)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Añadir cinemática ── */}
      {addCinematicModal && (
        <div className="obj-modal-overlay" onClick={() => { setAddCinematicModal(false); setNewCinematicName(''); setNewCinematicVideo(null) }}>
          <div className="obj-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="obj-modal-header">
              <span className="obj-modal-title">Nueva cinemática</span>
            </div>
            <div className="field-row" style={{ marginTop: 12 }}>
              <span className="field-label">Nombre</span>
              <input
                className="field-input"
                placeholder="Nombre de la cinemática"
                value={newCinematicName}
                onChange={e => setNewCinematicName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="field-row">
              <span className="field-label">Video</span>
              <div style={{ display: 'flex', gap: 6, flex: 1 }}>
                <span style={{ flex: 1, fontSize: 12, color: newCinematicVideo ? '#f97316' : '#6b7280', alignSelf: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {newCinematicVideo ? newCinematicVideo.split(/[\\/]/).pop() : 'Sin video'}
                </span>
                <button className="btn btn-ghost btn-sm" onClick={async () => {
                  const p = await window.electronAPI.selectVideo()
                  if (p) setNewCinematicVideo(p)
                }}>Seleccionar</button>
                {newCinematicVideo && <button className="btn btn-ghost btn-sm" onClick={() => setNewCinematicVideo(null)}>✕</button>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => { setAddCinematicModal(false); setNewCinematicName(''); setNewCinematicVideo(null) }}>Cancelar</button>
              <button className="btn btn-primary" disabled={!newCinematicName.trim() || !newCinematicVideo} onClick={handleAddCinematic}>Crear</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Eliminar cinemática ── */}
      {deleteCinematicConfirm && (
        <div className="obj-modal-overlay" onClick={() => setDeleteCinematicConfirm(null)}>
          <div className="obj-modal" style={{ maxWidth: 360, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div className="obj-modal-header" style={{ justifyContent: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>¿Eliminar cinemática?</span>
            </div>
            <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 4px' }}>Se eliminará permanentemente:</p>
            <p style={{ color: '#f97316', fontSize: 14, fontWeight: 700, margin: '0 0 20px' }}>{deleteCinematicConfirm.name}</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteCinematicConfirm(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleDeleteCinematic(deleteCinematicConfirm)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Eliminar desafío ── */}
      {finalizarConfirm && (
        <div className="obj-modal-overlay" onClick={() => setFinalizarConfirm(false)}>
          <div className="obj-modal" style={{ maxWidth: 360, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div className="obj-modal-header" style={{ justifyContent: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>¿Finalizar proyección?</span>
            </div>
            <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 20px' }}>
              Se cerrará la ventana de proyección.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setFinalizarConfirm(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => { window.electronAPI.closeProjection(); setFinalizarConfirm(false) }}>Finalizar</button>
            </div>
          </div>
        </div>
      )}

      {deleteChallengeConfirm && (
        <div className="obj-modal-overlay" onClick={() => setDeleteChallengeConfirm(null)}>
          <div className="obj-modal" style={{ maxWidth: 360, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div className="obj-modal-header" style={{ justifyContent: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>¿Eliminar desafío?</span>
            </div>
            <p style={{ color: '#9ca3af', fontSize: 13, margin: '0 0 4px' }}>
              Se eliminará permanentemente:
            </p>
            <p style={{ color: '#f97316', fontSize: 14, fontWeight: 700, margin: '0 0 20px' }}>
              {deleteChallengeConfirm}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setDeleteChallengeConfirm(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => handleDeleteChallenge(deleteChallengeConfirm)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
