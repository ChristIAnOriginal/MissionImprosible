export type RatingKey = 'excelente' | 'aceptable' | 'regular' | 'noaplica'

export const RATING_OPTIONS: { key: RatingKey; label: string; points: number; color: string }[] = [
  { key: 'excelente', label: 'Excelente', points: 5, color: '#22c55e' },
  { key: 'aceptable', label: 'Aceptable', points: 3, color: '#eab308' },
  { key: 'regular',   label: 'Regular',   points: 1, color: '#ef4444' },
  { key: 'noaplica',  label: 'No aplica', points: 0, color: '#6b7280' },
]

export const RATING_LABELS: Record<string, string> = {
  excelente: 'EXCELENTE',
  aceptable: 'ACEPTABLE',
  regular:   'REGULAR',
}

export const RATING_COLORS: Record<string, string> = {
  excelente: '#22c55e',
  aceptable: '#eab308',
  regular:   '#ef4444',
}
