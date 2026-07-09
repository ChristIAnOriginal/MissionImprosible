import React from 'react'
import { createRoot } from 'react-dom/client'
import { ControlApp } from './ControlApp'
import '../design-tokens.css'
import './control.css'

const root = createRoot(document.getElementById('root')!)
root.render(<ControlApp />)
