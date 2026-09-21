export interface Point {
  x: number
  y: number
}

export const CARD_WIDTH = 320
export const CARD_HEIGHT = 110
export const CARD_GAP_X = 48
export const LEVEL_GAP_Y = 56
export const ORIGIN_PAD = 60

interface Leveled {
  id: string
  level: number
}

export function autoLayoutPositions(leagues: Leveled[]): Record<string, Point> {
  const byLevel = new Map<number, Leveled[]>()
  for (const league of leagues) {
    const row = byLevel.get(league.level) ?? []
    row.push(league)
    byLevel.set(league.level, row)
  }

  const levels = [...byLevel.keys()].sort((a, b) => a - b)
  let maxRowWidth = 0
  for (const level of levels) {
    const row = byLevel.get(level) ?? []
    maxRowWidth = Math.max(maxRowWidth, row.length * CARD_WIDTH + (row.length - 1) * CARD_GAP_X)
  }

  const positions: Record<string, Point> = {}
  levels.forEach((level, rowIndex) => {
    const row = byLevel.get(level) ?? []
    const rowWidth = row.length * CARD_WIDTH + (row.length - 1) * CARD_GAP_X
    const startX = ORIGIN_PAD + (maxRowWidth - rowWidth) / 2
    const y = ORIGIN_PAD + rowIndex * (CARD_HEIGHT + LEVEL_GAP_Y)
    row.forEach((league, i) => {
      positions[league.id] = { x: startX + i * (CARD_WIDTH + CARD_GAP_X), y }
    })
  })

  return positions
}

export function nextLeaguePosition(leagues: Leveled[], level: number): Point {
  const fake: Leveled = { id: '__new__', level }
  return autoLayoutPositions([...leagues, fake])['__new__']
}