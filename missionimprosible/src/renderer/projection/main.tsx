import React from 'react'
import { createRoot } from 'react-dom/client'
import { ProjectionApp } from './ProjectionApp'
import '../design-tokens.css'
import './projection.css'
import './intro.css'

// Apply body styles specific to the projection window (not needed in control renderer)
Object.assign(document.documentElement.style, { width: '100vw', height: '100vh', overflow: 'hidden' })
Object.assign(document.body.style, { width: '100vw', height: '100vh', overflow: 'hidden', background: '#111' })

async function start() {
  // Versión web: el "proceso principal" corre en el navegador (src/web/).
  if (import.meta.env.MODE === 'web') await (await import('../../web/install')).installWebApi('projection')
  createRoot(document.getElementById('root')!).render(<ProjectionApp />)
}
start()
