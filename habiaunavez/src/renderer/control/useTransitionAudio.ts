import { useEffect, useRef } from 'react'
import { findTransition } from '../../shared/animations'
import { VOLUME_KEY, sanitizeValues, type ShowState } from '../../shared/types'
import { TRANSITION_AUDIO } from '../transitions'

/**
 * Reproduce el audio de la transición en curso.
 *
 * Suena sólo en el panel: con la proyección abierta en la misma máquina, dos
 * ventanas sonando a la vez se oirían desfasadas. El reloj manda el main; aquí
 * sólo se recoloca el audio donde diga (arranque, pausa, reinicio, cancelar).
 */
export function useTransitionAudio(state: ShowState) {
  const audio = useRef<{ id: string; el: HTMLAudioElement } | null>(null)
  const run = state.running
  const url = run ? TRANSITION_AUDIO[run.id] : undefined

  const meta = run ? findTransition(run.id) : undefined
  const raw = meta ? sanitizeValues(meta, state.values[meta.id])[VOLUME_KEY] : undefined
  const volume = typeof raw === 'number' ? raw : 1

  useEffect(() => {
    if (!run || !url) {
      stop(audio)
      return
    }
    if (audio.current?.id !== run.id) {
      stop(audio)
      audio.current = { id: run.id, el: new Audio(url) }
    }
    const el = audio.current.el
    const elapsed = (run.elapsedMs + (run.startedAt === null ? 0 : Date.now() - run.startedAt)) / 1000
    // Sólo se busca si se ha desviado: cada salto del audio se oye.
    if (Math.abs(el.currentTime - elapsed) > 0.15) el.currentTime = elapsed
    if (run.startedAt === null) el.pause()
    else el.play().catch(() => {})
  }, [run?.id, run?.startedAt, run?.elapsedMs, state.epoch, url])

  useEffect(() => {
    if (audio.current) audio.current.el.volume = volume
  }, [volume, run?.id])

  useEffect(() => () => stop(audio), [])
}

function stop(audio: { current: { el: HTMLAudioElement } | null }) {
  audio.current?.el.pause()
  audio.current = null
}
