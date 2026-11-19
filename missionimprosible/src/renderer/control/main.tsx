import React from 'react'
import { createRoot } from 'react-dom/client'
import { ControlApp } from './ControlApp'
import '../design-tokens.css'
import './control.css'

async function start() {
  // Versión web: el "proceso principal" corre en el navegador (src/web/).
  if (import.meta.env.MODE === 'web') await (await import('../../web/install')).installWebApi('control')
  createRoot(document.getElementById('root')!).render(<ControlApp />)
}
start()
