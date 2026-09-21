import { useMemo } from 'react'
import { useApp } from '@/state/AppContext'
import { Button } from '@/components/ui'
import { StandingsTable } from '@/components/StandingsTable'
import { GeneralTable } from '@/components/GeneralTable'
import { getLeagueClubs, primaryTournament } from '@/domain/validation'
import { createEmptyStandingRows, sumStandingTables } from '@/domain/standings'
import type { Tournament } from '@/domain/types'

export function TablesView() {
  const { state, setOpenTarget } = useApp()

  const sorted = useMemo(
    () => state.leagues.filter((l) => l.kind !== 'copa').sort((a, b) => a.level - b.level),
    [state.leagues]
  )

  if (sorted.length === 0) {
    return (
      <div className="card hero">
        <h1>Todavía no hay ligas</h1>
        <p>Creá una liga desde la pestaña Pirámide o cargá el ejemplo para ver las tablas.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {sorted.map((league) => {
        const tournament = primaryTournament(league)
        const clubs = getLeagueClubs(state.clubs, league.id).sort((a, b) => a.name.localeCompare(b.name, 'es'))
        const conn = state.connections.find((c) => c.upperLeagueId === league.id)
        const downLeague = conn ? state.leagues.find((l) => l.id === conn.lowerLeagueId) : undefined
        const general = league.generalTable && league.generalTable.tournamentIds.length >= 2
        const generalRows =
          general && league.generalTable
            ? sumStandingTables(
                league.generalTable.tournamentIds
                  .map((id) => league.tournaments.find((t) => t.id === id))
                  .filter((t): t is Tournament => !!t)
                  .map(() => createEmptyStandingRows(clubs.map((c) => ({ clubId: c.id, zoneId: c.zoneId ?? undefined }))))
              )
            : null

        return (
          <div className="card league-card" key={league.id}>
            <div className="league-card-head">
              <span className="level-badge">N{league.level}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <button className="league-card-name" onClick={() => setOpenTarget({ leagueId: league.id })}>
                  {league.name}
                </button>
                <div className="league-chips">
                  {tournament && <span className="chip neutral">{tournament.name}</span>}
                  {conn && (
                    <span className="chip up" title={`Ascienden desde ${downLeague?.name ?? '?'}`}>
                      ↑ {conn.promoteCount} asc.
                    </span>
                  )}
                  {conn && (
                    <span className="chip down" title={`Descienden a ${downLeague?.name ?? '?'}`}>
                      ↓ {conn.relegateCount} desc.
                    </span>
                  )}
                  <span className="chip neutral">{clubs.length} clubes</span>
                </div>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setOpenTarget({ leagueId: league.id })}>
                Ver liga
              </Button>
            </div>
            <div style={{ marginTop: 10 }}>
              <StandingsTable
                tournament={tournament}
                clubs={clubs}
                bands={tournament.bands}
              />
            </div>
            {generalRows && (
              <div style={{ marginTop: 16 }}>
                <div className="chip neutral" style={{ marginBottom: 6 }}>Tabla general</div>
                <GeneralTable rows={generalRows} clubs={clubs} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}