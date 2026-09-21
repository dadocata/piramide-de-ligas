import { PROJECT_VERSION, type Club, type LeagueConnection, type Player, type Project, type League, type Tournament, type TournamentFormat, type RoundTripCount, type LeagueRounds } from '@/domain/types'
import { newId } from '@/domain/ids'
import { autoLayoutPositions } from '@/domain/layout'

export function migrateProject(value: unknown): Project {
  const v = (value ?? {}) as Record<string, unknown>
  const now = new Date().toISOString()
  const rawLeagues = Array.isArray(v.leagues) ? (v.leagues as unknown[]) : []
  const leagues = rawLeagues.map(migrateLeague)

  const withoutPosition = leagues.filter((l) => typeof l.x !== 'number' || typeof l.y !== 'number')
  if (withoutPosition.length > 0) {
    const positions = autoLayoutPositions(leagues)
    for (const league of leagues) {
      const pos = positions[league.id]
      if (pos) league.x = pos.x
      if (pos) league.y = pos.y
    }
  }

  const clubs = Array.isArray(v.clubs) ? (v.clubs as unknown[]).map((c) => migrateClub(c as Record<string, unknown>)) : []

  return {
    version: PROJECT_VERSION,
    name: typeof v.name === 'string' && v.name.trim() ? v.name : 'Proyecto importado',
    leagues,
    clubs,
    connections: migrateConnections(rawLeagues, v.connections),
    players: Array.isArray(v.players) ? (v.players as Player[]) : [],
    createdAt: typeof v.createdAt === 'string' ? v.createdAt : now,
    updatedAt: now
  }
}

function migrateLeague(raw: unknown): Project['leagues'][number] {
  const league = { ...((raw as Record<string, unknown>) ?? {}) } as unknown as Project['leagues'][number]
  const tournaments = Array.isArray(league.tournaments)
    ? (league.tournaments as unknown[]).map(migrateTournament)
    : []
  league.tournaments = tournaments
  delete (league as unknown as Record<string, unknown>).promotion
  if (league.kind !== 'copa' && league.kind !== 'division') league.kind = 'division'
  league.cup = league.kind === 'copa' ? migrateCup(league.cup as Record<string, unknown> | undefined) : undefined
  if (league.generalTable) {
    const ids = Array.isArray(league.generalTable.tournamentIds)
      ? league.generalTable.tournamentIds.filter((id): id is string => typeof id === 'string')
      : []
    league.generalTable = { tournamentIds: ids }
  }
  if (league.relegation) {
    const method = league.relegation.method === 'promedio' ? 'promedio' : 'tabla'
    const rawProm = league.relegation.promedio as Record<string, unknown> | undefined
    league.relegation = { method }
    if (method === 'promedio') {
      const seasons = Array.isArray(rawProm?.seasons)
        ? (rawProm.seasons as unknown[]).map((s) => {
            const season = { ...((s as Record<string, unknown>) ?? {}) }
            const standings = Array.isArray(season.standings) ? season.standings : []
            return {
              year: typeof season.year === 'string' ? season.year : '',
              standings: standings.map((r) => {
                const row = (r as Record<string, unknown>) ?? {}
                return {
                  clubId: typeof row.clubId === 'string' ? row.clubId : '',
                  points: typeof row.points === 'number' ? row.points : 0,
                  played: typeof row.played === 'number' ? row.played : 0
                }
              })
            }
          })
        : []
      const seasonsCount = rawProm?.seasonsCount === 2 ? 2 : 3
      league.relegation.promedio = { seasonsCount, seasons }
    }
  }
  return league
}

function normalizeRoundTripCount(value: unknown, fallback: RoundTripCount): RoundTripCount {
  return value === 1 || value === 2 ? value : fallback
}

function normalizeLeagueRounds(value: unknown, fallback: LeagueRounds): LeagueRounds {
  return value === 0.5 || value === 1 || value === 2 || value === 3 || value === 4 ? value : fallback
}

function migrateCup(raw: Record<string, unknown> | undefined): Project['leagues'][number]['cup'] {
  return {
    scope: raw?.scope === 'regional' ? 'regional' : 'nacional',
    feeders: Array.isArray(raw?.feeders)
      ? (raw.feeders as unknown[])
          .map((f) => {
            const obj = (f as Record<string, unknown>) ?? {}
            return {
              id: typeof obj.id === 'string' ? obj.id : newId('f'),
              leagueId: typeof obj.leagueId === 'string' ? obj.leagueId : ''
            }
          })
          .filter((f) => f.leagueId.length > 0)
      : [],
    participants: Array.isArray(raw?.participants)
      ? (raw.participants as unknown[])
          .map((p) => {
            const obj = (p as Record<string, unknown>) ?? {}
            return {
              clubId: typeof obj.clubId === 'string' ? obj.clubId : '',
              zoneId: typeof obj.zoneId === 'string' ? obj.zoneId : undefined
            }
          })
          .filter((p) => p.clubId.length > 0)
      : []
  }
}

function migrateFormat(raw: Record<string, unknown>): TournamentFormat {
  const format = raw.format as Record<string, unknown> | undefined
  if (format && typeof format === 'object' && typeof format.kind === 'string') {
    const kind = format.kind
    if (kind === 'liga' || kind === 'grupos') {
      const vueltas = normalizeLeagueRounds(format.vueltas, 2)
      if (kind === 'grupos') {
        const interleaveEvery =
          typeof format.interleaveEvery === 'number' && format.interleaveEvery >= 1
            ? Math.floor(format.interleaveEvery)
            : undefined
        if (format.interleaved === true) {
          return { kind: 'grupos', vueltas, interleaved: true, interleaveEvery }
        }
        return { kind: 'grupos', vueltas }
      }
      return { kind: 'liga', vueltas }
    }
    if (kind === 'copa') {
      const fase = format.fase === 'directo' ? 'directo' : 'grupos'
      return {
        kind,
        fase,
        vueltas: normalizeLeagueRounds(format.vueltas, 2),
        legs: normalizeRoundTripCount(format.legs, 2),
        avPorGrupo:
          typeof format.avPorGrupo === 'number' && format.avPorGrupo >= 1 ? Math.floor(format.avPorGrupo) : 2
      }
    }
    if (kind === 'reducido') {
      const fromPos =
        typeof format.fromPos === 'number' && format.fromPos >= 1 ? Math.floor(format.fromPos) : 1
      let toPos =
        typeof format.toPos === 'number' && format.toPos >= 1
          ? Math.floor(format.toPos)
          : typeof format.topN === 'number' && format.topN >= 2
            ? Math.floor(format.topN)
            : 4
      if (toPos < fromPos) toPos = fromPos
      return {
        kind,
        vueltas: normalizeLeagueRounds(format.vueltas, 2),
        fromPos,
        toPos,
        legs: normalizeRoundTripCount(format.legs, 2)
      }
    }
    if (kind === 'eliminacion') {
      return { kind, legs: normalizeRoundTripCount(format.legs, 2) }
    }
  }
  if (raw.type === 'playoff') {
    return { kind: 'eliminacion', legs: 2 }
  }
  const setup = raw.setup as Record<string, unknown> | undefined
  const zones = Array.isArray(setup?.zones) && setup.zones.length > 0
  return zones ? { kind: 'grupos', vueltas: 2 } : { kind: 'liga', vueltas: 2 }
}

function migrateTournament(raw: unknown): Project['leagues'][number]['tournaments'][number] {
  const tournament = { ...((raw as Record<string, unknown>) ?? {}) } as unknown as Tournament
  if (!Array.isArray(tournament.bands)) {
    tournament.bands = []
  }
  tournament.format = migrateFormat(tournament as unknown as Record<string, unknown>)
  delete (tournament as unknown as Record<string, unknown>).type
  return tournament as League['tournaments'][number]
}

function migrateConnection(raw: unknown, legacyById: Map<string, Record<string, unknown>>): LeagueConnection | null {
  const conn = { ...((raw as Record<string, unknown>) ?? {}) }
  const upperLeagueId = typeof conn.upperLeagueId === 'string' ? conn.upperLeagueId : ''
  const lowerLeagueId = typeof conn.lowerLeagueId === 'string' ? conn.lowerLeagueId : ''
  if (!upperLeagueId || !lowerLeagueId) return null

  const promoteCount =
    typeof conn.promoteCount === 'number'
      ? conn.promoteCount
      : legacyPromotion(legacyById.get(lowerLeagueId))?.promoteCount ?? 1
  const relegateCount =
    typeof conn.relegateCount === 'number'
      ? conn.relegateCount
      : legacyPromotion(legacyById.get(upperLeagueId))?.relegationCount ?? 1

  return {
    id: typeof conn.id === 'string' ? conn.id : newId('x'),
    upperLeagueId,
    lowerLeagueId,
    promoteCount,
    relegateCount
  }
}

function migrateConnections(rawLeagues: unknown[], rawConnections: unknown): LeagueConnection[] {
  if (!Array.isArray(rawConnections)) return []
  const legacyById = new Map<string, Record<string, unknown>>()
  for (const raw of rawLeagues) {
    const obj = (raw ?? {}) as Record<string, unknown>
    if (typeof obj.id === 'string') legacyById.set(obj.id, obj)
  }
  return rawConnections
    .map((raw) => migrateConnection(raw, legacyById))
    .filter((c): c is LeagueConnection => c !== null)
}

function legacyPromotion(obj: Record<string, unknown> | undefined): { promoteCount: number; relegationCount: number } | null {
  const promotion = obj?.promotion as Record<string, unknown> | undefined
  if (!promotion || typeof promotion !== 'object') return null
  return {
    promoteCount: typeof promotion.promoteCount === 'number' ? promotion.promoteCount : 1,
    relegationCount: typeof promotion.relegationCount === 'number' ? promotion.relegationCount : 1
  }
}

function migrateClub(c: Record<string, unknown>): Club {
  const club = { ...c } as unknown as Club
  const rawCity = c.city

  if (typeof rawCity === 'string' && rawCity.trim() && !c.barrio && !c.localidad) {
    const comma = rawCity.indexOf(',')
    if (comma > 0) {
      club.barrio = rawCity.slice(0, comma).trim()
      club.localidad = rawCity.slice(comma + 1).trim()
    } else {
      club.localidad = rawCity.trim()
    }
  }

  delete (club as unknown as Record<string, unknown>).city

  const rawCrest = c.crestUrl
  const crestData = c.crestData
  if (typeof crestData === 'string' && crestData.startsWith('data:')) {
    club.crestData = crestData
  } else if (typeof rawCrest === 'string' && rawCrest.startsWith('data:')) {
    club.crestData = rawCrest
  }
  delete (club as unknown as Record<string, unknown>).crestUrl

  return club
}