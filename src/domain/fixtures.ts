import type {
  Club,
  FixtureMatch,
  FixtureRound,
  KnockoutMatch,
  KnockoutRound,
  MatchSource,
  ZoneDef
} from './types'
import { newId } from './ids'

export interface FixtureOptions {
  vueltas: number
  interleaved?: boolean
  interleaveEvery?: number
}

export interface InterzonalInput {
  zoneA: string
  zoneB: string
  cruces?: number
}

interface Pair {
  home: string
  away: string
}

export const BYE = '__bye__'

function roundRobinPairings(clubIds: string[]): Pair[][] {
  const isOdd = clubIds.length % 2 === 1
  const list = isOdd ? [...clubIds, BYE] : [...clubIds]
  const n = list.length
  const roundsCount = isOdd ? clubIds.length : n - 1
  const circle = [...list]
  const rounds: Pair[][] = []

  for (let r = 0; r < roundsCount; r++) {
    const pairs: Pair[] = []
    for (let i = 0; i < n / 2; i++) {
      const a = circle[i]
      const b = circle[n - 1 - i]
      if (a === BYE || b === BYE) continue
      pairs.push(r % 2 === 0 ? { home: a, away: b } : { home: b, away: a })
    }
    rounds.push(pairs)

    const first = circle[0]
    const rest = circle.slice(1)
    const moved = rest.shift() as string
    rest.push(moved)
    circle.splice(0, circle.length, first, ...rest)
  }

  return rounds
}

function makeMatch(home: string, away: string): FixtureMatch {
  return {
    id: newId('f'),
    homeClubId: home,
    awayClubId: away,
    played: false
  }
}

function pairsToRounds(pairRounds: Pair[][], vueltas: number): FixtureMatch[][] {
  const rounds: FixtureMatch[][] = []
  if (vueltas === 0.5) {
    const take = Math.ceil(pairRounds.length / 2)
    for (let r = 0; r < take; r++) {
      rounds.push(pairRounds[r].map((p) => makeMatch(p.home, p.away)))
    }
    return rounds
  }
  for (let v = 0; v < vueltas; v++) {
    for (let r = 0; r < pairRounds.length; r++) {
      const pairs = v % 2 === 0 ? pairRounds[r] : pairRounds[r].map((p) => ({ home: p.away, away: p.home }))
      rounds.push(pairs.map((p) => makeMatch(p.home, p.away)))
    }
  }
  return rounds
}

function zoneRoundsFor(clubs: Pick<Club, 'id' | 'zoneId'>[], zoneId: string, vueltas: number): FixtureMatch[][] {
  const ids = clubs.filter((c) => c.zoneId === zoneId).map((c) => c.id)
  if (ids.length < 2) return []
  return pairsToRounds(roundRobinPairings(ids), vueltas)
}

function interzonalRounds(
  clubs: Pick<Club, 'id' | 'zoneId'>[],
  zoneA: string,
  zoneB: string,
  vueltas: number,
  cruces?: number
): FixtureMatch[][] {
  const a = clubs.filter((c) => c.zoneId === zoneA).map((c) => c.id)
  const b = clubs.filter((c) => c.zoneId === zoneB).map((c) => c.id)
  if (a.length === 0 || b.length === 0) return []
  const m = Math.min(a.length, b.length)
  const maxSize = Math.max(a.length, b.length)
  const requested = cruces == null || !(cruces >= 1) ? maxSize : Math.floor(cruces)
  const k = Math.min(requested, m)
  const vueltaRounds = vueltas === 0.5 ? Math.ceil(k / 2) : k
  const rounds: FixtureMatch[][] = []
  for (let v = 0; v < (vueltas === 0.5 ? 1 : vueltas); v++) {
    for (let r = 0; r < vueltaRounds; r++) {
      const matches: FixtureMatch[] = []
      for (let i = 0; i < m; i++) {
        const clubA = a[i]
        const clubB = b[(i + r) % b.length]
        if (v === 0) {
          matches.push(makeMatch(clubA, clubB))
        } else {
          matches.push(makeMatch(clubB, clubA))
        }
      }
      rounds.push(matches)
    }
  }
  return rounds
}

export function generateFixture(
  clubs: Pick<Club, 'id' | 'zoneId'>[],
  zones: ZoneDef[],
  interzonals: InterzonalInput[],
  opts: FixtureOptions
): FixtureRound[] {
  const rounds: FixtureMatch[][] = []

  if (zones.length === 0) {
    const ids = clubs.map((c) => c.id)
    if (ids.length < 2) return []
    rounds.push(...pairsToRounds(roundRobinPairings(ids), opts.vueltas))
  } else {
    const zoneRounds = zones.map((zone) => zoneRoundsFor(clubs, zone.id, opts.vueltas))
    const zoneMax = Math.max(0, ...zoneRounds.map((zr) => zr.length))
    const zoneFechas: FixtureMatch[][] = []
    for (let r = 0; r < zoneMax; r++) {
      zoneFechas.push(zoneRounds.flatMap((zr) => zr[r] ?? []))
    }
    const interFechas = interzonals.flatMap((inter) =>
      interzonalRounds(clubs, inter.zoneA, inter.zoneB, opts.vueltas, inter.cruces)
    )
    if (opts.interleaved && interFechas.length > 0 && zoneFechas.length > 0) {
      const every = Math.max(1, opts.interleaveEvery ?? 3)
      let interIdx = 0
      for (let r = 0; r < zoneFechas.length; r++) {
        rounds.push(zoneFechas[r])
        if ((r + 1) % every === 0 && interIdx < interFechas.length) {
          rounds.push(interFechas[interIdx])
          interIdx++
        }
      }
      while (interIdx < interFechas.length) {
        rounds.push(interFechas[interIdx])
        interIdx++
      }
    } else {
      rounds.push(...zoneFechas, ...interFechas)
    }
  }

  return rounds
    .filter((r) => r.length > 0)
    .map((matches, i) => ({
      id: newId('r'),
      name: `Fecha ${i + 1}`,
      matches
    }))
}

/**
 * Cantidad de fechas y partidos que genera `generateFixture` con los
 * clubes y vueltas dados. Reutiliza el generador real para que la
 * estimación coincida siempre con el fixture.
 */
export function fixtureSize(
  clubs: Pick<Club, 'id' | 'zoneId'>[],
  zones: ZoneDef[],
  interzonals: InterzonalInput[],
  opts: FixtureOptions
): { rounds: number; matches: number } {
  const rounds = generateFixture(clubs, zones, interzonals, opts)
  return {
    rounds: rounds.length,
    matches: rounds.reduce((sum, r) => sum + r.matches.length, 0)
  }
}

export function isPowerOfTwo(n: number): boolean {
  return n > 1 && (n & (n - 1)) === 0
}

export function nextPowerOfTwo(n: number): number {
  if (n < 1) return 1
  let power = 1
  while (power < n) power *= 2
  return power
}

export function padWithByes(seedOrder: string[]): string[] {
  const size = nextPowerOfTwo(seedOrder.length)
  if (size === seedOrder.length) return [...seedOrder]
  return [...seedOrder, ...Array.from({ length: size - seedOrder.length }, () => BYE)]
}

export function generatePlayoffFromStandings(
  sortedClubIds: string[],
  fromPos: number,
  toPos: number,
  _legs: 1 | 2
): KnockoutRound[] {
  const start = Math.max(1, fromPos)
  const end = Math.min(sortedClubIds.length, Math.max(start, toPos))
  const seeded = sortedClubIds.slice(start - 1, end)
  return buildPlayoffBracket(seeded)
}

export function buildPlayoffBracket(seedOrder: string[]): KnockoutRound[] {
  if (seedOrder.length < 2) return []
  const padded = padWithByes(seedOrder)
  let participants: MatchSource[] = padded.map((_, i) => ({ kind: 'seed', position: i + 1 }))
  const rounds: KnockoutRound[] = []
  let round = 1

  while (participants.length > 1) {
    const matches: KnockoutMatch[] = []
    const next: MatchSource[] = []
    const count = participants.length / 2
    for (let i = 0; i < count; i++) {
      const home = participants[i]
      const away = participants[participants.length - 1 - i]
      matches.push({ id: newId('k'), round, index: i, home, away })
      const homeIsBye = sourceIsBye(home, padded)
      const awayIsBye = sourceIsBye(away, padded)
      if (homeIsBye) next.push(away)
      else if (awayIsBye) next.push(home)
      else next.push({ kind: 'winner', round, index: i })
    }
    rounds.push({ round, matches })
    participants = next
    round++
  }

  return rounds
}

function sourceIsBye(source: MatchSource, padded: string[]): boolean {
  return source.kind === 'seed' && padded[source.position - 1] === BYE
}

export interface CupGroupOrder {
  zoneId: string
  orderedClubIds: string[]
}

/**
 * Arma el orden de siembra del bracket de una copa intercalando los
 * clasificados de cada grupo (A1, B1, C1…, A2, B2, C2…) para que los
 * mejores de cada zona no se crucen en primera ronda.
 */
export function cupSeedOrder(groups: CupGroupOrder[], avPorGrupo: number): string[] {
  const limit = Math.max(1, avPorGrupo)
  const seeds: string[] = []
  for (let pos = 0; pos < limit; pos++) {
    for (const group of groups) {
      const clubId = group.orderedClubIds[pos]
      if (clubId) seeds.push(clubId)
    }
  }
  return seeds
}

export function matchWinner(match: KnockoutMatch, legs: 1 | 2): 'home' | 'away' | null {
  const h = match.homeGoals
  const a = match.awayGoals
  if (h == null || a == null) return null
  if (legs === 1) {
    if (h > a) return 'home'
    if (a > h) return 'away'
    return null
  }
  const h2 = match.homeGoals2
  const a2 = match.awayGoals2
  if (h2 == null || a2 == null) return null
  const totalHome = h + a2
  const totalAway = a + h2
  if (totalHome > totalAway) return 'home'
  if (totalAway > totalHome) return 'away'
  const homeAwayGoals = h2
  const awayAwayGoals = a
  if (homeAwayGoals > awayAwayGoals) return 'home'
  if (awayAwayGoals > homeAwayGoals) return 'away'
  return null
}

export function resolveTeam(
  source: MatchSource,
  seedOrder: string[],
  rounds: KnockoutRound[],
  legs: 1 | 2
): string | null {
  if (source.kind === 'seed') {
    return seedOrder[source.position - 1] ?? null
  }
  const match = rounds.find((r) => r.round === source.round)?.matches[source.index]
  if (!match) return null
  const winner = matchWinner(match, legs)
  if (!winner) return null
  return resolveTeam(winner === 'home' ? match.home : match.away, seedOrder, rounds, legs)
}