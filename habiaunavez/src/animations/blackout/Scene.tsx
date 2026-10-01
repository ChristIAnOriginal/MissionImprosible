/** "Blackout": la pantalla completamente negra. */
import React from 'react'
import { STAGE } from '../../shared/palette'

export default function Blackout() {
  return <rect width={STAGE.width} height={STAGE.height} fill="#000000" />
}
