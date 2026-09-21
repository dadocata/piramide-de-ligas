import type { Club, League, LeagueConnection, Project, Tournament } from './types'
import { isPowerOfTwo } from './fixtures'

export interface ValidationIssue {
  path: string
  message: string
}

export function primaryTournament(league: League): Tournament {
  return league.tournaments[0]
}

export function hasZones(tournament: Tournament): boolean {
  return usesZonesSetup(tournament) && tournament.setup.zones.length > 0
}

export function usesZonesSetup(tournament: Tournament): boolean {
  return (
    tournament.format.kind === 'grupos' ||
    tournament.format.kind === 'liga' ||
    (tournament.format.kind === 'copa' && tournament.format.fase === 'grupos')
  )
}

export function getLeagueClubs(clubs: Club[], leagueId: string): Club[] {
  return clubs.filter((c) => c.leagueId === leagueId)
}

export function cupParticipantClubs(league: League, clubs: Club[]): Club[] {
  if (league.kind !== 'copa' || !league.cup) return []
  const zoneById = new Map((league.cup.participants ?? []).map((p) => [p.clubId, p.zoneId]))
  return clubs
    .filter((c) => zoneById.has(c.id))
    .map((c) => (zoneById.get(c.id) ? { ...c, zoneId: zoneById.get(c.id) } : c))
}

export function cupEligibleClubs(league: League, clubs: Club[]): Club[] {
  if (league.kind !== 'copa' || !league.cup) return []
  const feederIds = new Set((league.cup.feeders ?? []).map((f) => f.leagueId))
  return clubs.filter((c) => feederIds.has(c.leagueId))
}

export function isBuilding(league: League, clubs: Club[]): boolean {
  if (league.kind === 'copa') return cupParticipantClubs(league, clubs).length < 2
  return getLeagueClubs(clubs, league.id).length < 2
}

export function validateProject(project: Pick<Project, 'name' | 'leagues' | 'clubs' | 'connections'>): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const byLevel = new Map<number, League>()

  for (const league of project.leagues) {
    const path = `ligas[${league.name}]`

    if (!league.name.trim()) {
      issues.push({ path, message: 'La liga debe tener un nombre.' })
    }

    if (league.kind === 'copa') {
      const cup = league.cup
      if (!cup) {
        issues.push({ path, message: 'La copa necesita configuración de participantes.' })
      } else {
        if (!cup.scope) issues.push({ path, message: 'La copa necesita alcance (nacional o regional).' })
        const feederIds = new Set(cup.feeders.map((f) => f.leagueId))
        for (const feeder of cup.feeders) {
          const feeding = project.leagues.find((l) => l.id === feeder.leagueId)
          if (!feeding) {
            issues.push({ path, message: 'La copa referencia una división inexistente.' })
          } else if (feeding.kind === 'copa') {
            issues.push({ path, message: 'La copa solo se conecta a divisiones, no a otras copas.' })
          }
        }
        const eligible = new Set(
          project.clubs.filter((c) => feederIds.has(c.leagueId)).map((c) => c.id)
        )
        for (const participant of cup.participants) {
          if (!eligible.has(participant.clubId)) {
            issues.push({
              path,
              message: `Un participante de la copa no pertenece a las divisiones conectadas.`
            })
            break
          }
        }
      }
    } else {
      const existing = byLevel.get(league.level)
      if (existing && existing.id !== league.id) {
        issues.push({
          path,
          message: `El nivel ${league.level} ya está ocupado por «${existing.name}».`
        })
      }
      byLevel.set(league.level, league)

      if (league.level < 1 || league.level > 10) {
        issues.push({ path, message: 'El nivel debe estar entre 1 y 10.' })
      }
    }

    if (league.tournaments.length === 0) {
      issues.push({ path, message: 'La liga necesita al menos un torneo.' })
    }

    if (league.kind !== 'copa') {
      if (league.generalTable) {
        const validIds = new Set(league.tournaments.map((t) => t.id))
        const missing = league.generalTable.tournamentIds.filter((id) => !validIds.has(id))
        if (league.generalTable.tournamentIds.length < 2) {
          issues.push({
            path,
            message: 'La tabla general necesita sumar al menos 2 torneos.'
          })
        }
        if (missing.length > 0) {
          issues.push({
            path,
            message: 'La tabla general referencia torneos que no existen en la liga.'
          })
        }
      }

      if (league.relegation?.method === 'promedio') {
        if (!league.relegation.promedio) {
          issues.push({ path, message: 'El sistema de descenso por promedio requiere temporadas configuradas.' })
        } else {
          const okCount = league.relegation.promedio.seasonsCount === 2 || league.relegation.promedio.seasonsCount === 3
          if (!okCount) {
            issues.push({ path, message: 'El promedio usa 2 o 3 temporadas.' })
          }
          const clubIds = new Set(project.clubs.filter((c) => c.leagueId === league.id).map((c) => c.id))
          for (const season of league.relegation.promedio.seasons) {
            for (const row of season.standings) {
              if (!clubIds.has(row.clubId)) {
                issues.push({
                  path,
                  message: `El promedio de «${season.year || 'año sin nombre'}» referencia clubes que no pertenecen a la liga.`
                })
                break
              }
            }
          }
        }
      }
    }

    for (const tournament of league.tournaments) {
      const tpath = `${path} > torneo «${tournament.name}»`
      if (!tournament.name.trim()) {
        issues.push({ path: tpath, message: 'El torneo debe tener un nombre.' })
      }
      validateTournament(tournament, tpath, issues, league.kind === 'copa')
    }

    validateLeagueSoft(league, project.clubs, issues)
    validateConnectionsForLeague(league, project.connections, project.leagues, issues)
  }

  for (const club of project.clubs) {
    const cpath = `clubes[${club.name}]`
    if (!club.name.trim()) {
      issues.push({ path: cpath, message: 'Todos los clubes deben tener un nombre.' })
    }
    const league = project.leagues.find((l) => l.id === club.leagueId)
    if (!league) {
      issues.push({ path: cpath, message: `«${club.name}» no pertenece a ninguna liga.` })
      continue
    }
    const tl = primaryTournament(league)
    if (club.zoneId && tl && !tl.setup.zones.some((z) => z.id === club.zoneId)) {
      issues.push({
        path: cpath,
        message: `«${club.name}» tiene una zona que no existe en «${tl.name}».`
      })
    }
  }

  return issues
}

function validateTournament(tournament: Tournament, path: string, issues: ValidationIssue[], isCopa: boolean): void {
  const format = tournament.format
  if (format.kind === 'reducido') {
    const count = format.toPos - format.fromPos + 1
    if (format.fromPos < 1 || count < 2) {
      issues.push({ path, message: 'El reducido necesita un rango de puestos válido con al menos 2 equipos.' })
    }
    if (count === 3 || (count > 2 && !isPowerOfTwo(count))) {
      issues.push({ path, message: `El reducido de ${count} equipos no forma un bracket parejo (ideal: 2, 4, 8 o 16).` })
    }
  }
  if (format.kind === 'copa' && format.fase === 'grupos') {
    if (format.avPorGrupo < 1) {
      issues.push({ path, message: 'La copa necesita al menos 1 clasificado por grupo.' })
    }
    if (tournament.setup.zones.length < 1) {
      issues.push({ path, message: 'La copa con fase de grupos necesita definir al menos un grupo.' })
    }
    if (isCopa && tournament.setup.interzonals.length > 0) {
      issues.push({ path, message: 'La copa no usa interzonales: cada grupo juega su propia tabla.' })
    }
  }
  const zoneIds = new Set(tournament.setup.zones.map((z) => z.id))
  for (const zone of tournament.setup.zones) {
    if (!zone.label.trim()) {
      issues.push({ path, message: 'Las zonas deben tener un nombre.' })
    }
  }
  for (const inter of tournament.setup.interzonals) {
    if (inter.zoneA === inter.zoneB) {
      issues.push({ path, message: 'Un interzonal no puede enfrentar a una zona consigo misma.' })
    }
    if (!zoneIds.has(inter.zoneA) || !zoneIds.has(inter.zoneB)) {
      issues.push({ path, message: 'Un interzonal referencia zonas que no existen.' })
    }
    if (inter.cruces != null && inter.cruces < 1) {
      issues.push({ path, message: 'El interzonal debe pedir al menos 1 cruce por equipo.' })
    }
  }
  if (format.kind === 'grupos' && format.interleaved) {
    if (format.interleaveEvery != null && format.interleaveEvery < 1) {
      issues.push({ path, message: 'El intervalo de fechas interzonales debe ser al menos 1.' })
    }
  }
}

function validateLeagueSoft(league: League, clubs: Club[], issues: ValidationIssue[]): void {
  if (isBuilding(league, clubs)) return

  const tl = primaryTournament(league)
  if (!tl) return
  const zoneClubs =
    league.kind === 'copa' ? cupParticipantClubs(league, clubs) : getLeagueClubs(clubs, league.id)
  const buildingForZones =
    usesZonesSetup(tl) && tl.setup.zones.length > 0 && zoneClubs.filter((c) => c.zoneId).length < 2

  if (usesZonesSetup(tl) && tl.setup.zones.length > 0 && !buildingForZones) {
    const missing = zoneClubs.filter((c) => !c.zoneId)
    if (missing.length > 0) {
      issues.push({
        path: `ligas[${league.name}]`,
        message: `${missing.length} clubes de «${league.name}» no tienen zona asignada.`
      })
    }
  }
}

function validateConnectionsForLeague(
  league: League,
  connections: LeagueConnection[],
  leagues: League[],
  issues: ValidationIssue[]
): void {
  const path = `conexiones(${league.name})`
  const involved = connections.filter(
    (c) => c.upperLeagueId === league.id || c.lowerLeagueId === league.id
  )

  for (const conn of involved) {
    const upper = leagues.find((l) => l.id === conn.upperLeagueId)
    const lower = leagues.find((l) => l.id === conn.lowerLeagueId)
    if (!upper || !lower) {
      issues.push({ path, message: 'La conexión referencia ligas inexistentes.' })
      continue
    }
    if (upper.level >= lower.level) {
      issues.push({
        path,
        message: 'La conexión baja de nivel: la liga superior debe tener menor nivel que la inferior.'
      })
    }
    if (conn.promoteCount < 0 || conn.relegateCount < 0) {
      issues.push({ path, message: 'Los ascensos y descensos no pueden ser negativos.' })
    }
  }

  const lowerConns = connections.filter((c) => c.upperLeagueId === league.id && c.relegateCount > 0)
  if (lowerConns.length > 1) {
    issues.push({ path, message: `${league.name} no puede bajar a más de una liga.` })
  }
}