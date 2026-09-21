import { useMemo } from 'react'
import type { Club, StandingBand, Tournament } from '@/domain/types'
import { useApp } from '@/state/AppContext'
import { CrestImage } from '@/components/CrestImage'
import { createEmptyStandingRows, sortedWithTiebreaker, sortStandings } from '@/domain/standings'

interface StandingsTableProps {
  tournament: Tournament
  clubs: Club[]
  bands: StandingBand[]
}

export function StandingsTable({ tournament, clubs, bands }: StandingsTableProps) {
  const { setModal } = useApp()
  const byId = useMemo(() => new Map(clubs.map((c) => [c.id, c])), [clubs])

  const rows = createEmptyStandingRows(
    clubs.map((c) => ({ clubId: c.id, zoneId: c.zoneId ?? undefined }))
  )
  const sorted = sortStandings(rows)
  const zones = tournament.format.kind === 'grupos' ? tournament.setup.zones : []

  let groups: StandingGroup[]
  if (zones.length > 0) {
    groups = zones.map((zone) => {
      const zoneClubs = clubs.filter((c) => c.zoneId === zone.id)
      const zoneRows = createEmptyStandingRows(zoneClubs.map((c) => ({ clubId: c.id, zoneId: c.zoneId })))
      return {
        label: zone.label,
        rows: sortedWithTiebreaker(zoneRows, tournament.tiebreakerOrder)
      }
    })
    const unzoned = clubs.filter((c) => !c.zoneId)
    if (unzoned.length > 0) {
      groups.push({
        label: 'Sin zona',
        rows: sortedWithTiebreaker(
          createEmptyStandingRows(unzoned.map((c) => ({ clubId: c.id }))),
          tournament.tiebreakerOrder
        )
      })
    }
  } else {
    groups = [{ label: undefined, rows: sorted }]
  }

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
          {groups.map((group) => (
            <GroupRows
              key={group.label ?? '__main__'}
              group={group}
              byId={byId}
              bands={bands}
              onOpenClub={(clubId) => setModal({ kind: 'club', clubId })}
            />
          ))}
        </tbody>
      </table>
      {clubs.length === 0 && (
        <div className="empty-note" style={{ marginTop: 12 }}>
          Esta liga no tiene clubes. Agregalos con «＋ clubes» desde el catálogo.
        </div>
      )}
    </div>
  )
}

interface StandingGroup {
  label?: string
  rows: ReturnType<typeof sortStandings>
}

function bandClass(bands: StandingBand[], index: number): string {
  const position = index + 1
  const band = bands.find((b) => position >= b.from && position <= b.to)
  return band ? `band-${band.color}` : ''
}

function GroupRows({
  group,
  byId,
  bands,
  onOpenClub
}: {
  group: StandingGroup
  byId: Map<string, Club>
  bands: StandingBand[]
  onOpenClub: (clubId: string) => void
}) {
  return (
    <>
      {group.label && (
        <tr className="zone-header">
          <td colSpan={10}>{group.label}</td>
        </tr>
      )}
      {group.rows.map((row, index) => {
        const club = byId.get(row.clubId)
        if (!club) return null
        const cls = bandClass(bands, index)
        const dif = row.goalsFor - row.goalsAgainst
        return (
          <tr key={row.clubId} className={cls}>
            <td className="pos">{index + 1}</td>
            <td>
              <button className="club-cell" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }} onClick={() => onOpenClub(row.clubId)}>
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
    </>
  )
}