import { useState } from 'react'
import { createConnection } from '@/domain/factories'
import { useApp } from '@/state/AppContext'
import { Banner, Button, Modal, NumberInput, Select } from '@/components/ui'
import type { LeagueConnection } from '@/domain/types'

interface ConnectionModalProps {
  upperLeagueId?: string
  connectionId?: string
  onClose: () => void
}

export function ConnectionModal({ upperLeagueId = '', connectionId, onClose }: ConnectionModalProps) {
  const { state, dispatch } = useApp()
  const sorted = [...state.leagues].sort((a, b) => a.level - b.level)
  const editExisting = connectionId ? state.connections.find((c) => c.id === connectionId) : undefined

  const [upper, setUpper] = useState(editExisting?.upperLeagueId ?? (upperLeagueId || sorted[0]?.id || ''))
  const [lower, setLower] = useState(editExisting?.lowerLeagueId ?? '')
  const [promote, setPromote] = useState(editExisting?.promoteCount ?? 1)
  const [relegate, setRelegate] = useState(editExisting?.relegateCount ?? 1)
  const [error, setError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, { promoteCount: number; relegateCount: number }>>({})

  const upperLeague = state.leagues.find((l) => l.id === upper)
  const lowerLeague = state.leagues.find((l) => l.id === lower)
  const lowerCandidates = sorted.filter(
    (l) => l.id !== upper && (upperLeague ? l.level > upperLeague.level : true)
  )

  function formError(): string | null {
    if (!upper || !lower) return 'Seleccioná la liga superior y la inferior.'
    if (upper === lower) return 'Las ligas deben ser distintas.'
    if (upperLeague && lowerLeague && upperLeague.level >= lowerLeague.level) {
      return 'La liga superior debe tener un nivel menor que la inferior.'
    }
    const already = state.connections.some(
      (c) => c.id !== editExisting?.id && c.upperLeagueId === upper && c.lowerLeagueId === lower
    )
    if (already) return 'Esa conexión ya existe.'
    return null
  }

  function save() {
    const err = formError()
    setError(err)
    if (err) return
    if (editExisting) {
      dispatch({
        type: 'UPDATE_CONNECTION',
        connection: {
          ...editExisting,
          upperLeagueId: upper,
          lowerLeagueId: lower,
          promoteCount: promote,
          relegateCount: relegate
        }
      })
    } else {
      dispatch({
        type: 'ADD_CONNECTION',
        connection: createConnection(upper, lower, promote, relegate)
      })
    }
    onClose()
  }

  function saveDraft(conn: LeagueConnection) {
    const draft = drafts[conn.id] ?? { promoteCount: conn.promoteCount, relegateCount: conn.relegateCount }
    dispatch({ type: 'UPDATE_CONNECTION', connection: { ...conn, ...draft } })
    setDrafts((d) => {
      const next = { ...d }
      delete next[conn.id]
      return next
    })
  }

  return (
    <Modal
      title="Conectar ligas (ascenso / descenso)"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save}>
            {editExisting ? 'Guardar cambios' : 'Conectar'}
          </Button>
        </>
      }
    >
      {error && <Banner>{error}</Banner>}

      <div className="field-row">
        <div className="field">
          <label>Liga superior</label>
          <Select value={upper} onChange={(e) => setUpper(e.target.value)}>
            {sorted.map((l) => (
              <option key={l.id} value={l.id}>N{l.level} · {l.name}</option>
            ))}
          </Select>
        </div>
        <div className="field">
          <label>Liga inferior</label>
          <Select value={lower} onChange={(e) => setLower(e.target.value)}>
            <option value="">— elegir —</option>
            {lowerCandidates.map((l) => (
              <option key={l.id} value={l.id}>N{l.level} · {l.name}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>↑ Ascensos (suben de la inferior a la superior)</label>
          <NumberInput min={0} value={promote} onChange={(e) => setPromote(Number(e.target.value))} />
        </div>
        <div className="field">
          <label>↓ Descensos (bajan de la superior a la inferior)</label>
          <NumberInput min={0} value={relegate} onChange={(e) => setRelegate(Number(e.target.value))} />
        </div>
      </div>

      <div className="divider" />

      <span style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--text-2)' }}>Conexiones existentes</span>
      <div className="list">
        {state.connections.length === 0 && <span className="inline-hint">Todavía no hay conexiones.</span>}
        {state.connections.map((conn) => {
          const up = state.leagues.find((l) => l.id === conn.upperLeagueId)
          const down = state.leagues.find((l) => l.id === conn.lowerLeagueId)
          const draft = drafts[conn.id] ?? conn
          return (
            <div className="list-item" key={conn.id}>
              <span style={{ fontWeight: 600 }}>{up?.name ?? '?'}</span>
              <span className="muted">↕</span>
              <span style={{ fontWeight: 600 }}>{down?.name ?? '?'}</span>
              <span className="spacer" />
              <span className="muted" title="Ascensos">↑</span>
              <NumberInput
                min={0}
                value={draft.promoteCount}
                onChange={(e) =>
                  setDrafts((d) => ({
                    ...d,
                    [conn.id]: { promoteCount: Number(e.target.value), relegateCount: draft.relegateCount }
                  }))
                }
                style={{ width: 62 }}
              />
              <span className="muted" title="Descensos">↓</span>
              <NumberInput
                min={0}
                value={draft.relegateCount}
                onChange={(e) =>
                  setDrafts((d) => ({
                    ...d,
                    [conn.id]: { promoteCount: draft.promoteCount, relegateCount: Number(e.target.value) }
                  }))
                }
                style={{ width: 62 }}
              />
              <button
                className="icon-btn"
                onClick={() => saveDraft(conn)}
                aria-label="Guardar cambios"
                title="Guardar cambios"
              >
                ✓
              </button>
              <button
                className="icon-btn danger"
                onClick={() => dispatch({ type: 'REMOVE_CONNECTION', id: conn.id })}
                aria-label="Eliminar conexión"
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}