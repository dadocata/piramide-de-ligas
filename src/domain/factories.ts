import { newId } from './ids'
import {
  PROJECT_VERSION,
  type Club,
  type League,
  type LeagueConnection,
  type Player,
  type Project,
  type Tournament
} from './types'
import { estimatePlayerAttrs, positionFromLabel } from './ratings'
import type { RosterRow } from '@/seed/rosters'

export function createTournament(name: string): Tournament {
  return {
    id: newId('t'),
    name,
    format: { kind: 'liga', vueltas: 2 },
    tiebreakerOrder: ['points', 'goalDifference', 'goalsFor'],
    setup: {
      zones: [],
      interzonals: []
    },
    bands: []
  }
}

export function createCupTournament(name: string): Tournament {
  return {
    id: newId('t'),
    name,
    format: { kind: 'copa', fase: 'grupos', vueltas: 2, legs: 2, avPorGrupo: 2 },
    tiebreakerOrder: ['points', 'goalDifference', 'goalsFor'],
    setup: {
      zones: [],
      interzonals: []
    },
    bands: []
  }
}

export function createLeague(name: string, level: number, x?: number, y?: number): League {
  return {
    id: newId('l'),
    name,
    kind: 'division',
    level,
    x,
    y,
    tournaments: [createTournament('Torneo Apertura')]
  }
}

export function createCup(name: string, scope: 'nacional' | 'regional' = 'nacional'): League {
  return {
    id: newId('l'),
    name,
    kind: 'copa',
    level: 1,
    cup: {
      scope,
      feeders: [],
      participants: []
    },
    tournaments: []
  }
}

export function createCupFeeder(leagueId: string): { id: string; leagueId: string } {
  return { id: newId('f'), leagueId }
}

export function createClub(leagueId: string, name: string, partial: Partial<Club> = {}): Club {
  return {
    id: newId('c'),
    leagueId,
    name,
    ...partial
  }
}

export function createConnection(
  upperLeagueId: string,
  lowerLeagueId: string,
  promoteCount = 1,
  relegateCount = 1
): LeagueConnection {
  return {
    id: newId('x'),
    upperLeagueId,
    lowerLeagueId,
    promoteCount,
    relegateCount
  }
}

export function createPlayer(clubId: string, row: RosterRow): Player {
  const position = positionFromLabel(row.position)
  return {
    id: newId('p'),
    clubId,
    name: row.name,
    position,
    age: row.age,
    number: row.number,
    nationality: row.nationality,
    marketValue: row.marketValue,
    attrs: estimatePlayerAttrs({
      name: row.name,
      position,
      age: row.age,
      marketValueEur: row.marketValue
    })
  }
}

export function emptyProject(name: string): Project {
  const now = new Date().toISOString()
  return {
    version: PROJECT_VERSION,
    name,
    leagues: [],
    clubs: [],
    connections: [],
    players: [],
    createdAt: now,
    updatedAt: now
  }
}

export function toProject(state: Omit<Project, 'version' | 'createdAt' | 'updatedAt' | 'name'> & { projectName: string }, existing?: Project): Project {
  const now = new Date().toISOString()
  return {
    version: PROJECT_VERSION,
    name: state.projectName,
    leagues: state.leagues,
    clubs: state.clubs,
    connections: state.connections,
    players: state.players,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  }
}