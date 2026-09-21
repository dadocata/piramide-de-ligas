import { useMemo } from 'react'
import type { Club, FixtureMatch, FixtureRound } from '@/domain/types'

interface FixtureViewProps {
  rounds: FixtureRound[]
  clubs: Club[]
}

export function FixtureView({ rounds, clubs }: FixtureViewProps) {
  const byId = useMemo(() => new Map(clubs.map((c) => [c.id, c])), [clubs])

  if (rounds.length === 0) {
    return (
      <div className="empty-note" style={{ marginTop: 12 }}>
        No se puede generar fixture con menos de 2 clubes.
      </div>
    )
  }

  return (
    <div className="fixture-list">
      {rounds.map((round) => (
        <div className="card card-pad fixture-round" key={round.id}>
          <div className="fixture-round-name">{round.name}</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {round.matches.map((match) => (
              <FixtureRow key={match.id} match={match} byId={byId} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function FixtureRow({ match, byId }: { match: FixtureMatch; byId: Map<string, Club> }) {
  const home = byId.get(match.homeClubId)?.name ?? '?'
  const away = byId.get(match.awayClubId)?.name ?? '?'
  const score = match.played && match.homeGoals != null && match.awayGoals != null
    ? `${match.homeGoals} – ${match.awayGoals}`
    : 'vs'
  return (
    <div className={`fixture-match ${match.played ? 'played' : ''}`}>
      <span className="fixture-team">{home}</span>
      <span className="fixture-score">{score}</span>
      <span className="fixture-team">{away}</span>
    </div>
  )
}