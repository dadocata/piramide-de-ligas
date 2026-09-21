import { useMemo, useRef, useState } from 'react'
import type { CatalogEntry } from '@/data/catalog-types'
import { useApp } from '@/state/AppContext'
import { useAuth } from '@/auth/AuthContext'
import { Banner, Button, Field, Modal, Select, TextInput } from '@/components/ui'
import { CrestImage } from '@/components/CrestImage'
import { formatLocation } from '@/domain/location'
import { DIVISION_ORDER, sortDivisions } from '@/domain/divisions'
import { readImageFile } from '@/data/image'

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
}

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

function slugName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function newCatalogId(name: string): string {
  return `cat_${slugName(name)}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

const EMPTY_ENTRY: CatalogEntry = {
  id: '',
  name: ''
}

export function CatalogView() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const { catalog, catalogLoading, catalogRemove, setScreen } = useApp()
  const [query, setQuery] = useState('')
  const [provincias, setProvincias] = useState<string[]>([])
  const [divisions, setDivisions] = useState<string[]>([])
  const [editing, setEditing] = useState<CatalogEntry | null>(null)
  const [viewing, setViewing] = useState<CatalogEntry | null>(null)

  const locationOptions = useMemo(() => {
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
    const q = norm(query)
    return catalog.filter((e) => {
      if (q && !norm(e.name).includes(q)) return false
      if (provincias.length > 0 && !(e.provincia && provincias.includes(e.provincia.trim().toLowerCase()))) return false
      if (divisions.length > 0 && !(e.division && divisions.includes(e.division.trim().toLowerCase()))) return false
      return true
    })
  }, [catalog, query, provincias, divisions])

  const activeCount =
    (query.trim() ? 1 : 0) +
    provincias.length +
    divisions.length

  function clearFilters() {
    setQuery('')
    setProvincias([])
    setDivisions([])
  }

  function openAdd() {
    setEditing({ ...EMPTY_ENTRY, id: newCatalogId('nuevo club') })
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Biblioteca de clubes</h1>
          <p className="page-sub">
            {isAdmin
              ? <>Clubes del catálogo compartido ({filtered.length} de {catalog.length}). {isAdmin && '(modo administrador)'}</>
              : <>Clubes disponibles para agregar a tus ligas ({filtered.length} de {catalog.length}).</>
            }
          </p>
        </div>
        <div className="row">
          {isAdmin && (
            <Button variant="primary" size="lg" onClick={openAdd}>
              ＋ Agregar club
            </Button>
          )}
          <Button variant="ghost" onClick={() => setScreen('editor')}>← Volver</Button>
        </div>
      </div>

      <div className="card filters">
        <div className="filters-head">
          <span className="small muted">Filtros</span>
          {activeCount > 0 && (
            <button className="filter-clear" onClick={clearFilters}>Limpiar filtros</button>
          )}
        </div>

        <div className="row" style={{ marginTop: 10 }}>
          <div className="search">
            <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filtrar por nombre…" />
          </div>
          <Button variant="ghost" onClick={() => setScreen('editor')}>← Volver</Button>
        </div>

        <details className="filter-collapse">
          <summary>
            División{divisions.length > 0 && <span className="count-badge">{divisions.length}</span>}
          </summary>
          <div className="text-chips">
            {locationOptions.divisions.length === 0 && <span className="small muted">Sin datos</span>}
            {locationOptions.divisions.map((d) => (
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

        <details className="filter-collapse">
          <summary>
            Provincia{provincias.length > 0 && <span className="count-badge">{provincias.length}</span>}
          </summary>
          <div className="text-chips">
            {locationOptions.provincias.length === 0 && <span className="small muted">Sin datos</span>}
            {locationOptions.provincias.map((p) => (
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
      </div>

      {catalogLoading ? (
        <div className="empty-note">Cargando catálogo…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-note">
          {catalog.length === 0
            ? isAdmin
              ? 'No hay clubes. Agregá clubes o restaurá el catálogo de ejemplo para empezar.'
              : 'Todavía no hay clubes en la biblioteca.'
            : activeCount > 0
              ? 'No hay clubes que coincidan con los filtros.'
              : 'No hay clubes para mostrar.'}
        </div>
      ) : (
        <div className="card">
          <ul className="list">
            {filtered.map((entry) => (
              <li className="list-item" key={entry.id}>
                <CrestImage data={entry.crestData} name={entry.name} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{entry.name}</div>
                  <div className="small muted">
                    {[entry.division, formatLocation(entry)].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>
                {isAdmin ? (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(entry)}>Editar</Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        if (confirm(`¿Quitar «${entry.name}» de la biblioteca?`)) void catalogRemove(entry.id)
                      }}
                    >
                      Quitar
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setViewing(entry)}>VER</Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {viewing && <ViewModal entry={viewing} onClose={() => setViewing(null)} />}
      {editing && <EntryModal entry={editing} isNew={editing.name === ''} onClose={() => setEditing(null)} />}
    </>
  )
}

function ViewModal({ entry, onClose }: { entry: CatalogEntry; onClose: () => void }) {
  return (
    <Modal
      title={`Club — ${entry.name}`}
      onClose={onClose}
      footer={
        <Button variant="ghost" onClick={onClose}>Cerrar</Button>
      }
    >
      <div className="crest-upload">
        <CrestImage data={entry.crestData} name={entry.name || 'Club'} size="lg" />
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 600, fontSize: 16 }}>{entry.name}</div>
        {entry.shortName && <div className="small muted" style={{ marginTop: 2 }}>{entry.shortName}</div>}
      </div>
      <div style={{ marginTop: 12, lineHeight: 1.8 }}>
        <div>División: {entry.division || '—'}</div>
        <div>Barrio: {entry.barrio || '—'}</div>
        <div>Localidad: {entry.localidad || '—'}</div>
        <div>Provincia: {entry.provincia || '—'}</div>
      </div>
    </Modal>
  )
}

function EntryModal({ entry, isNew, onClose }: { entry: CatalogEntry; isNew?: boolean; onClose: () => void }) {
  const { catalogUpsert } = useApp()
  const [name, setName] = useState(entry.name)
  const [division, setDivision] = useState(entry.division ?? '')
  const [barrio, setBarrio] = useState(entry.barrio ?? '')
  const [localidad, setLocalidad] = useState(entry.localidad ?? '')
  const [provincia, setProvincia] = useState(entry.provincia ?? '')
  const [crestData, setCrestData] = useState(entry.crestData ?? '')
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  function save() {
    if (!name.trim()) {
      setError('El club necesita un nombre.')
      return
    }
    const id = isNew ? newCatalogId(name.trim()) : entry.id
    const next: CatalogEntry = {
      id,
      name: name.trim(),
      division: division.trim() || undefined,
      barrio: barrio.trim() || undefined,
      localidad: localidad.trim() || undefined,
      provincia: provincia.trim() || undefined,
      crestData: crestData || undefined
    }
    void catalogUpsert(next)
    onClose()
  }

  async function onUpload(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen.')
      return
    }
    try {
      setCrestData(await readImageFile(file))
    } catch {
      setError('No se pudo procesar la imagen.')
    }
  }

  return (
    <Modal
      title={`${isNew ? 'Agregar club a la biblioteca' : 'Editar club de la biblioteca'} — ${name || 'Nuevo club'}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save}>{isNew ? 'Agregar' : 'Guardar'}</Button>
        </>
      }
    >
      {error && <Banner>{error}</Banner>}
      <Field label="Nombre">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: River Plate" autoFocus />
      </Field>
      <div className="field-row-3">
        <Field label="Barrio (opcional)">
          <TextInput value={barrio} onChange={(e) => setBarrio(e.target.value)} placeholder="Liniers" />
        </Field>
        <Field label="Localidad">
          <TextInput value={localidad} onChange={(e) => setLocalidad(e.target.value)} placeholder="Buenos Aires" />
        </Field>
        <Field label="Provincia">
          <TextInput value={provincia} onChange={(e) => setProvincia(e.target.value)} placeholder="CABA" />
        </Field>
      </div>
      <div className="field-row">
        <Field label="División">
          <Select
            value={division}
            onChange={(e) => setDivision(e.target.value)}
          >
            <option value="">Sin especificar</option>
            {DIVISION_ORDER.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Escudo (PNG)">
        <div className="crest-upload">
          <CrestImage data={crestData} name={name || 'Club'} size="lg" />
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/webp,image/jpeg"
            hidden
            onChange={(e) => void onUpload(e.target.files?.[0])}
          />
          <Button size="sm" variant="ghost" onClick={() => fileInput.current?.click()}>
            {crestData ? 'Reemplazar' : 'Subir escudo'}
          </Button>
          {crestData && (
            <Button size="sm" variant="ghost" onClick={() => setCrestData('')}>Quitar</Button>
          )}
        </div>
      </Field>
    </Modal>
  )
}