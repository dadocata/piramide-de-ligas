import { useMemo } from 'react'
import { useApp } from '@/state/AppContext'
import { Button } from '@/components/ui'
import { cupParticipantClubs } from '@/domain/validation'
import type { LeagueRounds, TournamentFormat } from '@/domain/types'

function roundsLabel(vueltas: LeagueRounds): string {
  if (vueltas === 0.5) return 'media vuelta'
  if (vueltas === 1) return '1 vuelta'
  if (vueltas === 2) return 'ida y vuelta'
  return `${vueltas} vueltas`
}

function formatLabel(f: TournamentFormat): string {
  if (f.kind === 'liga') return `Tabla completa · ${roundsLabel(f.vueltas)}`
  if (f.kind === 'grupos') return `Zonas + interzonales · ${roundsLabel(f.vueltas)}`
  if (f.kind === 'copa') {
    if (f.fase === 'directo') return `Llaves de eliminación directa (${f.legs === 1 ? 'a un partido' : 'ida y vuelta'})`
    return `Grupos (${roundsLabel(f.vueltas)}) + llaves · avanzan ${f.avPorGrupo} por grupo`
  }
  if (f.kind === 'reducido') return `Liga + reducido · juegan los puestos ${f.fromPos}° a ${f.toPos}°`
  return 'Eliminación directa'
}

export function CupsView() {
  const { state, setModal, setOpenTarget, dispatch } = useApp()

  const cups = useMemo(
    () => state.leagues.filter((l) => l.kind === 'copa'),
    [state.leagues]
  )

  if (cups.length === 0) {
    return (
      <div className="card hero">
        <h1>Copas</h1>
        <p>
          Creá copas nacionales o regionales, conectalas a una o más divisiones y elegí si van por
          tabla, grupos o eliminación directa.
        </p>
        <div className="hero-actions">
          <Button variant="primary" size="lg" onClick={() => setModal({ kind: 'league', defaultKind: 'copa' })}>
            ＋ Agregar copa
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>Copas</h1>
        <Button variant="primary" size="sm" onClick={() => setModal({ kind: 'league', defaultKind: 'copa' })}>
          ＋ Agregar copa
        </Button>
      </div>

      {cups.map((league) => {
        const main = league.tournaments[0]
        const participants = cupParticipantClubs(league, state.clubs)
        const feeders = league.cup
          ? league.cup.feeders
              .map((f) => state.leagues.find((l) => l.id === f.leagueId))
              .filter((l): l is NonNullable<typeof l> => !!l)
          : []

        return (
          <div className="card league-card" key={league.id}>
            <div className="league-card-head">
              <span className="chip neutral">
                {league.cup?.scope === 'regional' ? 'Copa regional' : 'Copa nacional'}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <button className="league-card-name" onClick={() => setOpenTarget({ leagueId: league.id })}>
                  {league.name}
                </button>
                <div className="league-chips">
                  <span className="chip neutral">
                    {feeders.length > 0 ? `Clubes de ${feeders.map((f) => f.name).join(', ')}` : 'Sin divisiones conectadas'}
                  </span>
                  <span className="chip neutral">{participants.length} participantes</span>
                  {main && <span className="chip neutral">{formatLabel(main.format)}</span>}
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setModal({ kind: 'cupClubPicker', leagueId: league.id })}
              >
                ＋ clubes
              </Button>
              <Button size="sm" onClick={() => setModal({ kind: 'league', leagueId: league.id })}>
                Editar
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() =>
                  confirm(`¿Eliminar la copa «${league.name}»?`) &&
                  dispatch({ type: 'REMOVE_LEAGUE', id: league.id })
                }
              >
                Eliminar
              </Button>
            </div>
          </div>
        )
      })}
    </div>
  )
}