import type { Player, PlayerAttrs } from '@/domain/types'
import { POSITION_SHORT, playerOverall, playerTier, STAT_LABELS } from '@/domain/ratings'

interface PlayerCardProps {
  player: Player
}

const STAT_ORDER: (keyof PlayerAttrs)[] = ['ritmo', 'tiro', 'pase', 'regate']

export function PlayerCard({ player }: PlayerCardProps) {
  const ovr = playerOverall(player)
  const tier = playerTier(ovr)
  const statKeys: (keyof PlayerAttrs)[] =
    player.position === 'GK'
      ? [...STAT_ORDER, 'atajadas', 'defensa', 'fisico']
      : [...STAT_ORDER, 'defensa', 'fisico']
  const stats = statKeys.filter((key) => player.attrs[key] !== undefined)

  return (
    <div className={`fut-card tier-${tier}`}>
      <div className="fut-card-top">
        <span className="fut-ovr">{ovr}</span>
        <span className="fut-pos">{POSITION_SHORT[player.position]}</span>
      </div>
      <div className="fut-card-name">{player.name}</div>
      <div className="fut-card-meta">
        {player.nationality ? `${player.nationality} · ` : ''}
        {player.age} años{player.number ? ` · #${player.number}` : ''}
      </div>
      <div className="fut-stats">
        {stats.map((key) => (
          <div className="fut-stat" key={key}>
            <span className="fut-stat-label">{STAT_LABELS[key]}</span>
            <span className="fut-stat-value">{player.attrs[key]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}