import { useEffect, useState } from 'react'
import { AppState } from '../../shared/types'

interface Props {
  state: AppState
}

export function ProjectionPreview({ state }: Props) {
  const [animating, setAnimating] = useState(false)
  const animTimerRef = { current: 0 as ReturnType<typeof setTimeout> }

  function triggerAnim(duration: number) {
    setAnimating(true)
    clearTimeout(animTimerRef.current)
    animTimerRef.current = setTimeout(() => setAnimating(false), duration)
  }

  useEffect(() => {
    const u1 = window.electronAPI.onObjectiveAnnounce(() => triggerAnim(5200))
    const u2 = window.electronAPI.onMissionAnnounce(() => triggerAnim(6000))
    const u3 = window.electronAPI.onShowRatings(() => triggerAnim(1500))
    const u4 = window.electronAPI.onImprosibleStart(() => triggerAnim(30000))
    const u5 = window.electronAPI.onImprosibleClear(() => { setAnimating(false); clearTimeout(animTimerRef.current) })
    return () => { u1(); u2(); u3(); u4(); u5() }
  }, [])

  const visible = state.participants.slice(0, state.visibleParticipants)

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#111', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: "'Arial Black', Arial, sans-serif", padding: '1.2cqh 1.5cqw 1.5cqh' }}>

      {/* Header */}
      <div style={{ padding: '1.5cqh 2cqw', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: '8cqw', fontWeight: 900, letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1, margin: 0 }}>
          <span style={{ color: '#fff' }}>MISIÓN </span>
          <span style={{ color: '#f97316' }}>IMPRO</span>
          <span style={{ color: '#fff' }}>SIBLE</span>
        </div>
      </div>


      {/* Participants */}
      <div style={{ display: 'flex', flex: 1, gap: '2cqw', alignItems: 'stretch', minHeight: 0 }}>
        {visible.map(p => (
          <div key={p.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '0.4cqh solid #888', background: '#fff', overflow: 'hidden' }}>
            <div style={{ flex: 1, minHeight: 0, background: p.photoPath ? '#fff' : '#d0d0d0', overflow: 'hidden', position: 'relative', filter: p.eliminated ? 'grayscale(1)' : 'none', transition: 'filter 0.4s' }}>
              {p.photoPath
                ? <img src={`localfile:///${p.photoPath.replace(/\\/g, '/')}`} alt={p.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#d0d0d0', color: '#888', fontSize: '2cqw', fontWeight: 700 }}>FOTO</div>
              }
            </div>
            <div style={{ background: p.eliminated ? '#4b5563' : '#f97316', color: '#fff', textAlign: 'center', fontSize: '2.8cqw', fontWeight: 900, padding: '0.8cqh 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transition: 'background 0.4s', flexShrink: 0 }}>
              {p.name}
            </div>
            <div style={{ background: '#d1d5db', color: '#111', textAlign: 'center', fontSize: '6cqw', fontWeight: 900, padding: '1cqh 0', lineHeight: 1, flexShrink: 0 }}>
              {p.score}
            </div>
          </div>
        ))}
      </div>

      {/* Animating overlay */}
      {animating && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.72)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10,
        }}>
          <div style={{
            color: '#f97316',
            fontFamily: "'Arial Black', Arial, sans-serif",
            fontWeight: 900,
            fontSize: '2.8cqw',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            textAlign: 'center',
            border: '1px solid #f97316',
            padding: '1cqh 2cqw',
            background: 'rgba(0,0,0,0.8)',
          }}>
            Animación en progreso
          </div>
        </div>
      )}
    </div>
  )
}
