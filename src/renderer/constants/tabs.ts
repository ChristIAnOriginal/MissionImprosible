import React from 'react'
import { Users, Flag, Settings, Crosshair, Target, Film, Zap } from 'lucide-react'

export type TabId = 'participantes' | 'objetivos' | 'desafios' | 'misiones' | 'cinematicas' | 'improsible' | 'configuracion'

export type TabGroup = 'juego' | 'especiales' | 'sistema'

export const TAB_GROUPS: { id: TabGroup; label: string }[] = [
  { id: 'juego',      label: 'Juego' },
  { id: 'especiales', label: 'Especiales' },
  { id: 'sistema',    label: 'Sistema' },
]

export const TABS: { id: TabId; label: string; Icon: React.ElementType; group: TabGroup }[] = [
  { id: 'participantes', label: 'Participantes',     Icon: Users,     group: 'juego' },
  { id: 'misiones',      label: 'Misiones',          Icon: Crosshair, group: 'juego' },
  { id: 'objetivos',     label: 'Objetivos',         Icon: Flag,      group: 'juego' },
  { id: 'desafios',      label: 'Desafíos',          Icon: Target,    group: 'juego' },
  { id: 'cinematicas',   label: 'Cinemáticas',       Icon: Film,      group: 'especiales' },
  { id: 'improsible',    label: 'Misión Improsible', Icon: Zap,       group: 'especiales' },
  { id: 'configuracion', label: 'Configuración',     Icon: Settings,  group: 'sistema' },
]
