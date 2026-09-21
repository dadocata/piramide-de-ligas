import { useMemo, useState } from 'react'
import type { CatalogEntry } from '@/data/catalog-types'
import { createClub } from '@/domain/factories'
import { useApp } from '@/state/AppContext'
import { Button, Modal, TextInput } from '@/components/ui'
import { CrestImage } from '@/components/CrestImage'
import { getLeagueClubs, primaryTournament } from '@/domain/validation'
import { formatLocation } from '@/domain/location'
import { sortDivisions } from '@/domain/divisions'

interface MultiClubPickerProps {
  leagueId: string
  onClose: () => void
}

function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

export function MultiClubPicker({ leagueId, onClose }: MultiClubPickerProps) {
  const { state, dispatch, catalog } = useApp()
  const league = state.leagues.find((l) => l.id === leagueId)
  const [query, setQuery] = useState('')
  const [divisions, setDivisions] = useState<string[]>([])
  const [provincias, setProvincias] = useState<string[]>([])
  const [selected, setSelected] = useState<Set<string>>(() => {
    const init = new Set<string>()
    for (const e of catalog) {
      const club = state.clubs.find((c) => c.leagueId === leagueId && normalizeName(c.name) === normalizeName(e.name))
      if (club) init.add(e.id)
    }
    return init
  })

  const leagueClubs = useMemo(() => getLeagueClubs(state.clubs, leagueId), [state.clubs, leagueId])

  const foreignByName = useMemo(() => {
    const map = new Map<string, string>()
    for (const club of state.clubs) {
      if (club.leagueId === leagueId) continue
      const leagueLabel = state.leagues.find((l) => l.id === club.leagueId)?.name ?? 'otra liga'
      map.set(normalizeName(club.name), leagueLabel)
    }
    return map
  }, [state.clubs, state.leagues, leagueId])

  const leagueByName = useMemo(() => {
    const set = new Set<string>()
    for (const club of leagueClubs) set.add(normalizeName(club.name))
    return set
  }, [leagueClubs])

  const catalogByName = useMemo(() => {
    const set = new Set<string>()
    for (const e of catalog) set.add(normalizeName(e.name))
    return set
  }, [catalog])

  const unmanaged = useMemo(
    () => leagueClubs.filter((c) => !catalogByName.has(normalizeName(c.name))),
    [leagueClubs, catalogByName]
  )

  const filterOptions = useMemo(() => {
    const provs = new Set<string>()
    const divs = new Set<string>()
    for (const e of catalog) {
      if (e.provincia?.trim()) provs.add(e.provincia.trim())
      if (e.division?.trim()) divs.add(e.division.trim())
    }
    const sort = (a: string, b: string) => a.localeCompare(b, 'es')
    return {
      provincias: [...provs].sort(sort),
      divisions: sortDivisions(divs)
    }
  }, [catalog])

  const filtered = useMemo(() => {
    const q = normalizeName(query)
    return catalog.filter((entry) => {
      if (q && !normalizeName(entry.name).includes(q)) return false
      if (divisions.length > 0 && !(entry.division && divisions.includes(entry.division.trim().toLowerCase()))) return false
      if (provincias.length > 0 && !(entry.provincia && provincias.includes(entry.provincia.trim().toLowerCase()))) return false
      return true
    })
  }, [catalog, query, divisions, provincias])

  const selectable = filtered.filter((e) => !foreignByName.has(normalizeName(e.name)))
  const totalSelectable = useMemo(
    () => catalog.filter((e) => !foreignByName.has(normalizeName(e.name))),
    [catalog, foreignByName]
  )
  const foreignCount = filtered.length - selectable.length
  const activeFilterCount = divisions.length + provincias.length

  function clearFilters() {
    setDivisions([])
    setProvincias([])
  }

  function toggle(entry: CatalogEntry, disabled: boolean) {
    if (disabled) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(entry.id)) next.delete(entry.id)
      else next.add(entry.id)
      return next
    })
  }

  const selectedNames = useMemo(() => {
    const set = new Set<string>()
    for (const id of selected) {
      const e = catalog.find((x) => x.id === id)
      if (e) set.add(normalizeName(e.name))
    }
    return set
  }, [selected, catalog])

  const additions = useMemo(
    () => catalog.filter((e) => selected.has(e.id) && !leagueByName.has(normalizeName(e.name))),
    [catalog, selected, leagueByName]
  )
  const removals = useMemo(
    () => leagueClubs.filter((c) => !selectedNames.has(normalizeName(c.name))),
    [leagueClubs, selectedNames]
  )
  const hasChanges = additions.length > 0 || removals.length > 0

  function apply() {
    if (additions.length > 0) {
      const tournament = league ? primaryTournament(league) : undefined
      const zones = tournament?.setup.zones ?? []
      const clubs = additions.map((entry, index) => {
        const zoneId =
          zones.length > 0 ? zones[Math.floor((index * zones.length) / additions.length)].id : undefined
        return createClub(leagueId, entry.name, {
          shortName: entry.shortName,
          barrio: entry.barrio,
          localidad: entry.localidad,
          provincia: entry.provincia,
          crestData: entry.crestData,
          zoneId
        })
      })
      dispatch({ type: 'ADD_CLUBS', clubs })
    }
    if (removals.length > 0) {
      dispatch({ type: 'REMOVE_CLUBS', ids: removals.map((c) => c.id) })
    }
    onClose()
  }

  const selectedInLeague = leagueClubs.length

  return (
    <Modal
      title={`Clubes de «${league?.name ?? ''}»`}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={apply} disabled={!hasChanges}>
            Aplicar{hasChanges ? ` (＋${additions.length} · −${removals.length})` : ''}
          </Button>
        </>
      }
    >
      <div className="search">
        <TextInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar club en el catálogo…"
        />
      </div>

      {catalog.length > 0 && (
        <div className="picker-filters">
          <div className="filters-head">
            <span className="small muted">Filtros</span>
            {activeFilterCount > 0 && (
              <button className="filter-clear" onClick={clearFilters}>Limpiar filtros</button>
            )}
          </div>
          {filterOptions.divisions.length > 0 && (
            <details className="filter-collapse">
              <summary>
                División{divisions.length > 0 && <span className="count-badge">{divisions.length}</span>}
              </summary>
              <div className="text-chips">
                {filterOptions.divisions.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`text-chip ${divisions.includes(d.toLowerCase()) ? 'active' : ''}`}
                    onClick={() => setDivisions(toggleValue(divisions, d.toLowerCase()))}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </details>
          )}
          {filterOptions.provincias.length > 0 && (
            <details className="filter-collapse">
              <summary>
                Provincia{provincias.length > 0 && <span className="count-badge">{provincias.length}</span>}
              </summary>
              <div className="text-chips">
                {filterOptions.provincias.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`text-chip ${provincias.includes(p.toLowerCase()) ? 'active' : ''}`}
                    onClick={() => setProvincias(toggleValue(provincias, p.toLowerCase()))}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      <div className="picker-count">
        {selectedInLeague} en esta liga · {selectable.length} disponibles
        {activeFilterCount > 0 && totalSelectable.length !== selectable.length
          ? ` (mostrando ${selectable.length} de ${totalSelectable.length})`
          : ''}
        {foreignCount > 0 ? ` · ${foreignCount} en otras categorías` : ''}
      </div>

      <div className="picker-section" style={{ maxHeight: 380, overflowY: 'auto' }}>
        {catalog.length === 0 && (
          <span className="inline-hint">El catálogo está vacío. Instalá el catálogo de ejemplo desde la Biblioteca.</span>
        )}
        {filtered.map((entry) => {
          const name = normalizeName(entry.name)
          const inOther = foreignByName.get(name)
          const disabled = Boolean(inOther)
          const checked = selected.has(entry.id)
          return (
            <div
              key={entry.id}
              className={`picker-row ${checked ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
              onClick={() => toggle(entry, disabled)}
            >
              <span className="picker-check">{checked ? '✓' : ''}</span>
              <CrestImage data={entry.crestData} name={entry.name} />
              <span style={{ fontWeight: 600 }}>{entry.name}</span>
              {entry.localidad || entry.provincia || entry.division ? (
                <span className="picker-info">
                  {[entry.division, formatLocation(entry)].filter(Boolean).join(' · ')}
                </span>
              ) : null}
              {disabled && inOther && <span className="picker-info">ya está en «{inOther}»</span>}
            </div>
          )
        })}
      </div>

      {unmanaged.length > 0 && (
        <span className="inline-hint">
          {unmanaged.length} club{unmanaged.length === 1 ? '' : 'es'} de esta liga no está
          {unmanaged.length === 1 ? '' : 'n'} en el catálogo y no se puede
          {unmanaged.length === 1 ? '' : 'n'} quitar desde acá.
        </span>
      )}

      {league && (
        <span className="inline-hint">
          Marcá los clubes que deben estar en la liga: desmarcar un club existente lo quita.
          Los agregados se distribuirán en las zonas del torneo principal si las tiene.
        </span>
      )}
    </Modal>
  )
}