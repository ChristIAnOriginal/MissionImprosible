/// <reference path="../huna-api.d.ts" />
import React, { useEffect, useState } from 'react'
import { DEFAULT_ANIMATION_ID } from '../../shared/animations'
import type { ShowState } from '../../shared/types'
import { Stage } from '../Stage'
import { useShowClock } from '../useShowClock'
import './projection.css'

const INITIAL: ShowState = {
  activeId: DEFAULT_ANIMATION_ID,
  playing: true,
  speed: 1,
  epoch: 0,
  values: {},
  running: null,
  cue: { transitionId: null, nextId: null },
  arrival: null,
  look: 'realista',
  presets: {},
  guiones: [],
  guion: { id: null, step: null },
}

export default function ProjectionApp() {
  const [state, setState] = useState<ShowState>(INITIAL)

  useEffect(() => {
    const api = window.hunaAPI
    const off = api.onState(setState)
    api.requestState()
    return off
  }, [])

  // Las transiciones corren a tiempo real: su ritmo lo fija su duración.
  const time = useShowClock(state.playing, state.running ? 1 : state.speed, state.epoch)

  return (
    <div className="stage">
      <Stage state={state} time={time} />
    </div>
  )
}
