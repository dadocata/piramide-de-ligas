import type { Player, PlayerAttrs, PlayerPosition } from './types'

export const STAT_LABELS: Record<'ritmo' | 'tiro' | 'pase' | 'regate' | 'defensa' | 'fisico' | 'atajadas', string> = {
  ritmo: 'Ritmo',
  tiro: 'Tiro',
  pase: 'Pase',
  regate: 'Regate',
  defensa: 'Defensa',
  fisico: 'Físico',
  atajadas: 'Atajadas'
}

export const POSITION_SHORT: Record<PlayerPosition, string> = {
  GK: 'ARQ',
  CB: 'DC',
  LB: 'LI',
  RB: 'LD',
  DM: 'MCD',
  CM: 'MC',
  AM: 'MCO',
  LW: 'EI',
  RW: 'ED',
  SS: 'SD',
  ST: 'DC'
}

export type PlayerTier = 'gold' | 'silver' | 'bronze'

export function clamp(value: number, min = 35, max = 99): number {
  return Math.min(max, Math.max(min, value))
}

function seedOf(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = (Math.imul(31, h) + name.charCodeAt(i)) | 0
  }
  return Math.abs(h % 1000) / 1000
}

function baseOverall(marketValueEur: number): number {
  if (!marketValueEur || marketValueEur <= 0) return 62
  return clamp(40 + 5.8 * Math.log10(marketValueEur), 42, 92)
}

function ageModifier(age: number): number {
  if (age <= 0) return 0
  if (age < 22) return (age - 24) * 0.6
  if (age <= 29) return 0
  if (age <= 33) return -(age - 29) * 0.3
  if (age <= 36) return -1.2 - (age - 33) * 0.8
  return -3.6 - (age - 36) * 0.9
}

function veteranCarry(age: number, base: number): number {
  if (age < 30 || base <= 70) return 0
  const surplus = Math.min(base - 70, 6)
  const ratio = age >= 34 ? 0.5 : 0.35
  return surplus * ratio
}

const ARCHETYPES: Record<PlayerPosition, Partial<Record<keyof PlayerAttrs, number>>> = {
  GK: { ritmo: -35, tiro: -45, pase: -26, regate: -38, defensa: -2, fisico: -8 },
  CB: { ritmo: -18, tiro: -40, pase: -18, regate: -30, defensa: 8, fisico: 8 },
  LB: { ritmo: 6, tiro: -15, pase: -8, regate: -2, defensa: 2, fisico: 2 },
  RB: { ritmo: 6, tiro: -15, pase: -8, regate: -2, defensa: 2, fisico: 2 },
  DM: { ritmo: -6, tiro: -20, pase: -2, regate: -8, defensa: 6, fisico: 4 },
  CM: { ritmo: -4, tiro: -14, pase: 4, regate: 2, defensa: 2, fisico: 0 },
  AM: { ritmo: 2, tiro: -4, pase: 5, regate: 6, defensa: -20, fisico: -8 },
  LW: { ritmo: 12, tiro: -1, pase: -2, regate: 9, defensa: -28, fisico: -10 },
  RW: { ritmo: 12, tiro: -1, pase: -2, regate: 9, defensa: -28, fisico: -10 },
  SS: { ritmo: 5, tiro: 3, pase: 1, regate: 5, defensa: -28, fisico: -6 },
  ST: { ritmo: -2, tiro: 7, pase: -10, regate: -4, defensa: -32, fisico: 5 }
}

export interface EstimateOptions {
  name: string
  position: PlayerPosition
  age: number
  marketValueEur?: number
}

export function estimatePlayerAttrs(opts: EstimateOptions): PlayerAttrs {
  const base = baseOverall(opts.marketValueEur ?? 0)
  const noise = (seedOf(opts.name) - 0.5) * 4
  const anchor = Math.round(
    Math.min(94, Math.max(42, base + ageModifier(opts.age) + veteranCarry(opts.age, base) + noise))
  )
  const archetype = ARCHETYPES[opts.position]
  const decline = Math.max(0, opts.age - 29)

  const ritmo = clamp(Math.round(anchor + (archetype.ritmo ?? 0) - decline * 0.7))
  const tiro = clamp(Math.round(anchor + (archetype.tiro ?? 0)))
  const pase = clamp(Math.round(anchor + (archetype.pase ?? 0)))
  const regate = clamp(Math.round(anchor + (archetype.regate ?? 0)))
  const defensa = clamp(Math.round(anchor + (archetype.defensa ?? 0)))
  const fisico = clamp(Math.round(anchor + (archetype.fisico ?? 0) - decline * 0.35))

  const attrs: PlayerAttrs = { ritmo, tiro, pase, regate, defensa, fisico }
  if (opts.position === 'GK') {
    attrs.atajadas = clamp(Math.round(anchor + 12))
  }
  return attrs
}

const OVR_WEIGHTS: Record<PlayerPosition, Partial<Record<keyof PlayerAttrs, number>>> = {
  GK: { defensa: 0.42, atajadas: 0.32, fisico: 0.1, pase: 0.08, ritmo: 0.08 },
  CB: { defensa: 0.45, fisico: 0.28, ritmo: 0.12, pase: 0.1, regate: 0.05 },
  LB: { ritmo: 0.3, defensa: 0.28, fisico: 0.18, pase: 0.12, regate: 0.12 },
  RB: { ritmo: 0.3, defensa: 0.28, fisico: 0.18, pase: 0.12, regate: 0.12 },
  DM: { defensa: 0.26, pase: 0.24, fisico: 0.18, ritmo: 0.14, regate: 0.1, tiro: 0.08 },
  CM: { pase: 0.28, regate: 0.18, ritmo: 0.15, tiro: 0.1, defensa: 0.15, fisico: 0.14 },
  AM: { pase: 0.26, regate: 0.26, ritmo: 0.2, tiro: 0.18, fisico: 0.1 },
  LW: { ritmo: 0.26, regate: 0.26, tiro: 0.2, pase: 0.14, fisico: 0.14 },
  RW: { ritmo: 0.26, regate: 0.26, tiro: 0.2, pase: 0.14, fisico: 0.14 },
  SS: { tiro: 0.24, regate: 0.24, ritmo: 0.22, pase: 0.16, fisico: 0.14 },
  ST: { tiro: 0.3, fisico: 0.22, ritmo: 0.18, regate: 0.16, pase: 0.14 }
}

export function playerOverall(player: Pick<Player, 'position' | 'attrs'>): number {
  const weights = OVR_WEIGHTS[player.position]
  let sum = 0
  let weightSum = 0
  for (const key of Object.keys(weights) as (keyof PlayerAttrs)[]) {
    const value = player.attrs[key]
    const weight = weights[key]
    if (typeof value === 'number' && typeof weight === 'number' && weight > 0) {
      sum += value * weight
      weightSum += weight
    }
  }
  if (weightSum === 0) return 0
  return Math.round(sum / weightSum)
}

export function playerTier(overall: number): PlayerTier {
  if (overall >= 80) return 'gold'
  if (overall >= 70) return 'silver'
  return 'bronze'
}

export function positionFromLabel(label: string): PlayerPosition {
  const l = label.toLowerCase()
  if (l.includes('goalkeep')) return 'GK'
  if (l.includes('centre-back') || l.includes('center-back')) return 'CB'
  if (l.includes('left-back')) return 'LB'
  if (l.includes('right-back')) return 'RB'
  if (l.includes('defensive mid')) return 'DM'
  if (l.includes('central mid')) return 'CM'
  if (l.includes('attacking mid')) return 'AM'
  if (l.includes('left winger')) return 'LW'
  if (l.includes('right winger')) return 'RW'
  if (l.includes('second striker')) return 'SS'
  return 'ST'
}