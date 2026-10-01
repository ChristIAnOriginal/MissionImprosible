import React from 'react'
import { createRoot } from 'react-dom/client'
import ControlApp from './ControlApp'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ControlApp />
  </React.StrictMode>
)
