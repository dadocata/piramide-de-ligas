import { useMemo } from 'react'
import type { Club, StandingBand } from '@/domain/types'
import { sortStandings, type StandingRow } from '@/domain/standings'
import { CrestImage } from '@/components/CrestImage'
import { useApp } from '@/state/AppContext'

interface GeneralTableProps {
  rows: StandingRow[]
  clubs: Club[]
  bands?: StandingBand[]
  emptyNote?: string
}

export function GeneralTable({ rows, clubs, bands = [], emptyNote }: GeneralTableProps) {
  const { setModal } = useApp()
  const byId = useMemo(() => new Map(clubs.map((c) => [c.id, c])), [clubs])
  const sorted = sortStandings(rows)

  return (
    <div className="standings-wrap">
      <table className="standings-table">
        <thead>
          <tr>
            <th className="pos">#</th>
            <th>Club</th>
            <th className="num">Pts</th>
            <th className="num">PJ</th>
            <th className="num">G</th>
            <th className="num">E</th>
            <th className="num">P</th>
            <th className="num">GF</th>
            <th className="num">GC</th>
            <th className="num">DIF</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, index) => {
            const club = byId.get(row.clubId)
            if (!club) return null
            const position = index + 1
            const band = bands.find((b) => position >= b.from && position <= b.to)
            const dif = row.goalsFor - row.goalsAgainst
            return (
              <tr key={row.clubId} className={band ? `band-${band.color}` : ''}>
                <td className="pos">{position}</td>
                <td>
                  <button
                    className="club-cell"
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    onClick={() => setModal({ kind: 'club', clubId: row.clubId })}
                  >
                    <CrestImage data={club.crestData} name={club.name} />
                    <span className="name">{club.name}</span>
                  </button>
                </td>
                <td className="num" style={{ fontWeight: 700 }}>{row.points}</td>
                <td className="num">{row.played}</td>
                <td className="num">{row.wins}</td>
                <td className="num">{row.draws}</td>
                <td className="num">{row.losses}</td>
                <td className="num">{row.goalsFor}</td>
                <td className="num">{row.goalsAgainst}</td>
                <td className="num">{dif > 0 ? `+${dif}` : dif}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {rows.length === 0 && emptyNote && (
        <div className="empty-note" style={{ marginTop: 12 }}>{emptyNote}</div>
      )}
    </div>
  )
}