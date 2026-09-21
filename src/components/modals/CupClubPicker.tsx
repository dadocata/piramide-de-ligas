import { useMemo, useState } from 'react'
import type { Club, CupParticipant } from '@/domain/types'
import { Button, Modal, TextInput } from '@/components/ui'
import { CrestImage } from '@/components/CrestImage'
import { formatLocation } from '@/domain/location'
import { useApp } from '@/state/AppContext'
import { cupEligibleClubs } from '@/domain/validation'

export function CupParticipantsModal({ leagueId, onClose }: { leagueId: string; onClose: () => void }) {
  const { state, dispatch } = useApp()
  const league = state.leagues.find((l) => l.id === leagueId)
  if (!league || !league.cup) return null
  const eligible = cupEligibleClubs(league, state.clubs)
  return (
    <CupClubPicker
      eligible={eligible}
      initial={league.cup.participants}
      leagueName={league.name}
      onPick={(participants) =>
        dispatch({ type: 'UPDATE_LEAGUE', league: { ...league, cup: { ...league.cup!, participants } } })
      }
      onClose={onClose}
    />
  )
}

interface CupClubPickerProps {
  eligible: Club[]
  initial: CupParticipant[]
  leagueName: string
  onPick: (participants: CupParticipant[]) => void
  onClose: () => void
}

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

export function CupClubPicker({ eligible, initial, leagueName, onPick, onClose }: CupClubPickerProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(() => {
    const init = new Set<string>()
    for (const p of initial) init.add(p.clubId)
    return init
  })
  const zoneOf = useMemo(() => new Map(initial.map((p) => [p.clubId, p.zoneId])), [initial])

  const byDivision = useMemo(() => {
    const map = new Map<string, Club[]>()
    for (const club of eligible) {
      const div = club.localidad ? `${club.localidad}${club.provincia ? `, ${club.provincia}` : ''}` : club.provincia || 'Otros'
      const list = map.get(div) ?? []
      list.push(club)
      map.set(div, list)
    }
    for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name, 'es'))
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es')) as Array<[string, Club[]]>
  }, [eligible])

  const filtered = useMemo(() => {
    const q = norm(query)
    if (!q) return byDivision
    return byDivision
      .map(([div, clubs]) => [div, clubs.filter((c) => norm(c.name).includes(q))] as [string, Club[]])
      .filter(([, clubs]) => clubs.length > 0)
  }, [byDivision, query])

  function toggle(clubId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(clubId)) next.delete(clubId)
      else next.add(clubId)
      return next
    })
  }

  function apply() {
    const participants: CupParticipant[] = eligible
      .filter((c) => selected.has(c.id))
      .map((c) => ({ clubId: c.id, zoneId: zoneOf.get(c.id) }))
    onPick(participants)
    onClose()
  }

  return (
    <Modal
      title={`Participantes de «${leagueName}»`}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={apply} disabled={selected.size === 0}>
            Aplicar ({selected.size})
          </Button>
        </>
      }
    >
      <div className="search">
        <TextInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar entre los clubes de las divisiones conectadas…"
        />
      </div>

      <div className="picker-count">
        {eligible.length} clubes elegibles · {selected.size} seleccionados
      </div>

      <div className="picker-section" style={{ maxHeight: 380, overflowY: 'auto' }}>
        {eligible.length === 0 && (
          <span className="inline-hint">
            Todavía no hay clubes elegibles. Conectá divisiones a la copa desde la pestaña General.
          </span>
        )}
        {filtered.map(([div, clubs]) => (
          <div key={div}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', margin: '10px 0 4px' }}>
              {div}
            </div>
            {clubs.map((club) => {
              const checked = selected.has(club.id)
              return (
                <div
                  key={club.id}
                  className={`picker-row ${checked ? 'selected' : ''}`}
                  onClick={() => toggle(club.id)}
                >
                  <span className="picker-check">{checked ? '✓' : ''}</span>
                  <CrestImage data={club.crestData} name={club.name} />
                  <span style={{ fontWeight: 600 }}>{club.name}</span>
                  {club.localidad || club.provincia ? (
                    <span className="picker-info">{formatLocation(club)}</span>
                  ) : null}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </Modal>
  )
}