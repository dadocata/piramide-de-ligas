import { useState } from 'react'
import type { League } from '@/domain/types'
import { useApp } from '@/state/AppContext'

export function SideNav() {
  const { state } = useApp()
  const [rootCollapsed, setRootCollapsed] = useState(false)
  const [collapsedLeagues, setCollapsedLeagues] = useState<Record<string, boolean>>({})

  const divisions = state.leagues
    .filter((l) => l.kind !== 'copa')
    .sort((a, b) => a.level - b.level)
  const copas = state.leagues.filter((l) => l.kind === 'copa')
  const nationalCups = copas.filter((c) => c.cup?.scope !== 'regional')

  function toggleLeague(id: string) {
    setCollapsedLeagues((m) => ({ ...m, [id]: !m[id] }))
  }

  return (
    <aside className="side-nav">
      <button className={`side-nav-root ${rootCollapsed ? '' : 'open'}`} onClick={() => setRootCollapsed((v) => !v)}>
        <span className="side-chevron">▾</span>
        <span className="side-nav-root-label">AFA</span>
      </button>

      {!rootCollapsed && (
        <>
          {nationalCups.length > 0 && <div className="side-nav-cup-heading">Copas</div>}
          {nationalCups.map((cup) => (
            <LeagueEntry
              key={cup.id}
              league={cup}
              collapsed={Boolean(collapsedLeagues[cup.id])}
              onToggle={toggleLeague}
            />
          ))}

          {divisions.map((league) => {
            const collapsed = Boolean(collapsedLeagues[league.id])
            const regionalFor = copas.filter(
              (c) => c.cup?.scope === 'regional' && c.cup?.feeders.some((f) => f.leagueId === league.id)
            )

            return (
              <div key={league.id}>
                <LeagueEntry league={league} collapsed={collapsed} onToggle={toggleLeague} />

                {!collapsed && regionalFor.length > 0 && (
                  <div className="side-nav-tournaments">
                    <div className="side-nav-cup-heading in">Copas regionales</div>
                    {regionalFor.map((cup) => (
                      <div key={cup.id} className="side-nav-cup">
                        <LeagueEntry
                          league={cup}
                          collapsed={Boolean(collapsedLeagues[cup.id])}
                          onToggle={toggleLeague}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}
    </aside>
  )
}

function LeagueEntry({
  league,
  collapsed,
  onToggle
}: {
  league: League
  collapsed: boolean
  onToggle: (id: string) => void
}) {
  const { openTarget, setOpenTarget } = useApp()
  const isCopa = league.kind === 'copa'
  const isActive = openTarget?.leagueId === league.id
  const hasTournaments = league.tournaments.length > 0

  return (
    <div className="side-nav-league">
      <div className={`side-nav-row ${isCopa ? 'cup' : ''} ${isActive ? 'active' : ''}`}>
        <span className="side-nav-logo">
          {league.logoData && <img src={league.logoData} alt={league.name} />}
        </span>
        <button
          className="side-nav-name"
          onClick={() => setOpenTarget({ leagueId: league.id })}
          title={league.name}
        >
          {league.name}
        </button>
        {isCopa && (
          <span className="side-nav-cup-tag">
            {league.cup?.scope === 'regional' ? 'Regional' : 'Nacional'}
          </span>
        )}
        {hasTournaments && (
          <button
            className="side-nav-toggle"
            onClick={(ev) => {
              ev.stopPropagation()
              onToggle(league.id)
            }}
            aria-label={collapsed ? 'Mostrar torneos' : 'Ocultar torneos'}
          >
            <span className={`side-chevron ${collapsed ? '' : 'open'}`}>▾</span>
          </button>
        )}
      </div>

      {!collapsed && hasTournaments && (
        <div className="side-nav-tournaments">
          {league.tournaments.map((t) => {
            const tActive = isActive && openTarget?.tournamentId === t.id
            return (
              <button
                key={t.id}
                className={`side-nav-tournament ${tActive ? 'active' : ''}`}
                onClick={() => setOpenTarget({ leagueId: league.id, tournamentId: t.id })}
                title={t.name}
              >
                {t.name}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}