export interface StandingRow {
  clubId: string
  zoneId?: string
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  points: number
}

export function createEmptyStandingRows(clubIds: Array<{ clubId: string; zoneId?: string }>): StandingRow[] {
  return clubIds.map(({ clubId, zoneId }) => ({
    clubId,
    zoneId,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0
  }))
}

function computed(c: StandingRow): { goalDifference: number } {
  return { goalDifference: c.goalsFor - c.goalsAgainst }
}

export function sortStandings(rows: StandingRow[]): StandingRow[] {
  return [...rows].sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points
    const ga = computed(a).goalDifference
    const gb = computed(b).goalDifference
    if (ga !== gb) return gb - ga
    return b.goalsFor - a.goalsFor
  })
}

export function sortedWithTiebreaker(rows: StandingRow[], tiebreakers: string[]): StandingRow[] {
  const order = tiebreakers.length > 0 ? tiebreakers : ['points', 'goalDifference', 'goalsFor']
  return [...rows].sort((a, b) => {
    for (const key of order) {
      if (key === 'points' && a.points !== b.points) return b.points - a.points
      if (key === 'goalDifference') {
        const ga = computed(a).goalDifference
        const gb = computed(b).goalDifference
        if (ga !== gb) return gb - ga
      }
      if (key === 'goalsFor' && a.goalsFor !== b.goalsFor) return b.goalsFor - a.goalsFor
    }
    return 0
  })
}

export function sumStandingTables(tables: StandingRow[][]): StandingRow[] {
  const acc = new Map<string, StandingRow>()
  for (const table of tables) {
    for (const row of table) {
      const current = acc.get(row.clubId)
      if (!current) {
        acc.set(row.clubId, { ...row })
      } else {
        current.played += row.played
        current.wins += row.wins
        current.draws += row.draws
        current.losses += row.losses
        current.goalsFor += row.goalsFor
        current.goalsAgainst += row.goalsAgainst
        current.points += row.points
      }
    }
  }
  return [...acc.values()]
}

export interface PromedioRow {
  clubId: string
  points: number
  played: number
  promedio: number
}

export interface SeasonRowInput {
  clubId: string
  points: number
  played: number
}

export function computePromedios(
  clubIds: string[],
  pastSeasons: SeasonRowInput[][],
  currentTable: StandingRow[]
): PromedioRow[] {
  const acc = new Map<string, number[]>(clubIds.map((id) => [id, [0, 0]]))
  for (const season of pastSeasons) {
    for (const row of season) {
      const target = acc.get(row.clubId)
      if (!target) continue
      target[0] += row.points
      target[1] += row.played
    }
  }
  for (const row of currentTable) {
    const target = acc.get(row.clubId)
    if (!target) continue
    target[0] += row.points
    target[1] += row.played
  }
  return clubIds
    .map((clubId) => {
      const [points, played] = acc.get(clubId) ?? [0, 0]
      const promedio = played > 0 ? points / played : 0
      return { clubId, points, played, promedio: Math.round(promedio * 1000) / 1000 }
    })
    .sort((a, b) => {
      if (b.promedio !== a.promedio) return b.promedio - a.promedio
      if (b.points !== a.points) return b.points - a.points
      return a.played - b.played
    })
}