import { useMemo } from 'react'
import type { Club } from '@/domain/types'
import type { PromedioRow } from '@/domain/standings'
import { CrestImage } from '@/components/CrestImage'
import { useApp } from '@/state/AppContext'

interface PromediosTableProps {
  rows: PromedioRow[]
  clubs: Club[]
  descensoCount?: number
}

export function PromediosTable({ rows, clubs, descensoCount = 0 }: PromediosTableProps) {
  const { setModal } = useApp()
  const byId = useMemo(() => new Map(clubs.map((c) => [c.id, c])), [clubs])
  const lastRelegated = rows.length - Math.min(descensoCount, rows.length)

  return (
    <div className="standings-wrap">
      <table className="standings-table">
        <thead>
          <tr>
            <th className="pos">#</th>
            <th>Club</th>
            <th className="num">Pts</th>
            <th className="num">PJ</th>
            <th className="num">Prom.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const club = byId.get(row.clubId)
            if (!club) return null
            const desc = index >= lastRelegated
            return (
              <tr key={row.clubId} className={desc ? 'band-red' : ''}>
                <td className="pos">{index + 1}</td>
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
                <td className="num" style={{ fontWeight: 700 }}>{row.promedio.toFixed(3)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="empty-note" style={{ marginTop: 12 }}>
          No hay clubes para promediar.
        </div>
      )}
    </div>
  )
}