import React from 'react'
import { createRoot } from 'react-dom/client'
import { ProjectionApp } from './ProjectionApp'
import '../design-tokens.css'
import './projection.css'
import './intro.css'

// Apply body styles specific to the projection window (not needed in control renderer)
Object.assign(document.documentElement.style, { width: '100vw', height: '100vh', overflow: 'hidden' })
Object.assign(document.body.style, { width: '100vw', height: '100vh', overflow: 'hidden', background: '#111' })

const root = createRoot(document.getElementById('root')!)
root.render(<ProjectionApp />)
