import { PROJECT_VERSION, type Club, type League, type LeagueConnection, type Project } from '@/domain/types'
import { createClub, createConnection, createLeague, createTournament } from '@/domain/factories'
import { autoLayoutPositions } from '@/domain/layout'
import { SEED_LEAGUES, SEED_NAME } from './afaLite'

export function buildSampleProject(): Project {
  const now = new Date().toISOString()
  const leagues: League[] = []
  const clubs: Club[] = []
  const connections: LeagueConnection[] = []

  for (const seedLeague of SEED_LEAGUES) {
    const league = createLeague(seedLeague.name, seedLeague.level)
    const tournament = createTournament(seedLeague.tournamentName)
    if (seedLeague.zones) {
      tournament.setup.zones = seedLeague.zones.map((z) => ({ ...z }))
      tournament.format = { kind: 'grupos', vueltas: 2 }
    }
    league.tournaments = [tournament]
    leagues.push(league)

    for (const seedClub of seedLeague.clubs) {
      clubs.push(
        createClub(league.id, seedClub.name, {
          shortName: seedClub.shortName,
          barrio: seedClub.barrio,
          localidad: seedClub.localidad,
          provincia: seedClub.provincia,
          zoneId: seedClub.zoneId
        })
      )
    }
  }

  for (let i = 0; i < leagues.length - 1; i++) {
    const upper = SEED_LEAGUES[i]
    const lower = SEED_LEAGUES[i + 1]
    connections.push(
      createConnection(leagues[i].id, leagues[i + 1].id, lower.promotion.promoteCount, upper.promotion.relegationCount)
    )
  }

  const positions = autoLayoutPositions(leagues)
  for (const league of leagues) {
    const pos = positions[league.id]
    if (pos) {
      league.x = pos.x
      league.y = pos.y
    }
  }

  return {
    version: PROJECT_VERSION,
    name: SEED_NAME,
    leagues,
    clubs,
    connections,
    players: [],
    createdAt: now,
    updatedAt: now
  }
}

export function leagueNameSummary(): string {
  return SEED_LEAGUES.map((l) => `${l.name} (${l.clubs.length})`).join(' · ')
}