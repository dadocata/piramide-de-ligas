import { useMemo } from 'react'
import type { Club, KnockoutMatch, KnockoutRound, MatchSource } from '@/domain/types'
import { BYE } from '@/domain/fixtures'

interface BracketViewProps {
  rounds: KnockoutRound[]
  seedOrder: string[]
  clubs: Club[]
  legs: 1 | 2
}

const ROUND_NAMES = ['', 'Final', 'Semifinal', 'Cuartos', 'Octavos', 'Dieciseisavos']

function roundLabel(round: number, maxRound: number): string {
  const fromTop = maxRound - round + 1
  return ROUND_NAMES[fromTop] ?? `Ronda ${round}`
}

export function BracketView({ rounds, seedOrder, clubs, legs }: BracketViewProps) {
  const byId = useMemo(() => new Map(clubs.map((c) => [c.id, c])), [clubs])

  if (rounds.length === 0) {
    return (
      <div className="empty-note" style={{ marginTop: 12 }}>
        No hay cruces para mostrar.
      </div>
    )
  }

  const maxRound = rounds[rounds.length - 1].round

  return (
    <div className="bracket">
      {rounds.map((r) => (
        <div className="bracket-round" key={r.round}>
          <div className="bracket-round-name">
            {roundLabel(r.round, maxRound)}
            {r.round === 1 && legs === 2 && <span className="muted"> · ida y vuelta</span>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {r.matches.map((m) => (
              <BracketMatch key={m.id} match={m} byId={byId} seedOrder={seedOrder} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function BracketMatch({
  match,
  byId,
  seedOrder
}: {
  match: KnockoutMatch
  byId: Map<string, Club>
  seedOrder: string[]
}) {
  const home = sourceName(match.home, byId, seedOrder)
  const away = sourceName(match.away, byId, seedOrder)
  const played = match.homeGoals != null && match.awayGoals != null

  return (
    <div className="card bracket-match">
      <div className="bracket-line">
        <span className="fixture-team">{home}</span>
        <span className="fixture-score">
          {played ? `${match.homeGoals} – ${match.awayGoals}` : 'vs'}
        </span>
      </div>
      {played && match.homeGoals2 != null && match.awayGoals2 != null && (
        <div className="bracket-line">
          <span className="fixture-team">{home}</span>
          <span className="fixture-score">{`${match.awayGoals2} – ${match.homeGoals2} (vuelta)`}</span>
        </div>
      )}
      <div className="bracket-line">
        <span className="fixture-team">{away}</span>
      </div>
    </div>
  )
}

function sourceName(source: MatchSource, byId: Map<string, Club>, seedOrder: string[]): string {
  if (source.kind === 'seed') {
    const id = seedOrder[source.position - 1]
    if (!id) return '?'
    if (id === BYE) return 'Libre'
    return byId.get(id)?.name ?? '?'
  }
  return `Ganador R${source.round} #${source.index + 1}`
}