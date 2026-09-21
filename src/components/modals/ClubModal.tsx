import { useState } from 'react'
import type { Club } from '@/domain/types'
import { useApp } from '@/state/AppContext'
import { Banner, Button, Field, Modal, Select, TextInput } from '@/components/ui'
import { primaryTournament } from '@/domain/validation'
import { readImageFile } from '@/data/image'
import { createPlayer } from '@/domain/factories'
import { ROSTERS } from '@/seed/rosters'
import { CrestImage } from '@/components/CrestImage'
import { PlayerCard } from '@/components/PlayerCard'

interface ClubModalProps {
  clubId: string
  onClose: () => void
}

export function ClubModal({ clubId, onClose }: ClubModalProps) {
  const { state, dispatch } = useApp()
  const found = clubId ? state.clubs.find((c) => c.id === clubId) : undefined
  if (!found) return null
  const existing: Club = found
  const league = state.leagues.find((l) => l.id === existing.leagueId)

  const [name, setName] = useState(existing.name)
  const [barrio, setBarrio] = useState(existing.barrio ?? '')
  const [localidad, setLocalidad] = useState(existing.localidad ?? '')
  const [provincia, setProvincia] = useState(existing.provincia ?? '')
  const [crestData, setCrestData] = useState(existing.crestData ?? '')
  const [zone, setZone] = useState(existing.zoneId ?? '')
  const [error, setError] = useState<string | null>(null)

  const tournament = league ? primaryTournament(league) : undefined
  const zones = tournament?.setup.zones ?? []
  const squad = state.players.filter((p) => p.clubId === existing.id)
  const hasRoster = Boolean(ROSTERS[existing.name])

  function save() {
    if (!name.trim()) {
      setError('El club necesita un nombre.')
      return
    }
    const club: Club = {
      id: existing.id,
      leagueId: existing.leagueId,
      name: name.trim(),
      barrio: barrio.trim() || undefined,
      localidad: localidad.trim() || undefined,
      provincia: provincia.trim() || undefined,
      crestData: crestData || undefined,
      zoneId: zones.length > 0 ? (zone || undefined) : undefined
    }
    dispatch({ type: 'UPDATE_CLUB', club })
    onClose()
  }

  function generateSquad() {
    const roster = ROSTERS[existing.name]
    if (!roster) {
      setError('Todavía no tenemos el plantel real de este club. Por ahora solo "River Plate" tiene datos.')
      return
    }
    if (squad.length > 0 && !confirm('Esto reemplazará el plantel actual del club. ¿Continuar?')) return
    dispatch({
      type: 'GENERATE_SQUAD',
      clubId: existing.id,
      players: roster.map((row) => createPlayer(existing.id, row))
    })
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
      title={`Editar club — ${existing.name}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save}>Guardar club</Button>
        </>
      }
    >
      {error && <Banner>{error}</Banner>}
      {league && <span className="badge">{league.name}</span>}
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
      <Field label="Escudo (PNG)">
        <div className="crest-upload">
          <CrestImage data={crestData} name={name || 'Club'} size="lg" />
          <label className="btn ghost sm">
            <input type="file" accept="image/png,image/webp,image/jpeg" onChange={(e) => void onUpload(e.target.files?.[0])} hidden />
            {crestData ? 'Reemplazar' : 'Subir escudo'}
          </label>
          {crestData && (
            <Button variant="ghost" size="sm" onClick={() => setCrestData('')}>Quitar</Button>
          )}
        </div>
      </Field>
      {zones.length > 0 && (
        <Field label={`Zona en «${tournament?.name}»`}>
          <Select value={zone} onChange={(e) => setZone(e.target.value)}>
            <option value="">Sin zona</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{z.label}</option>
            ))}
          </Select>
        </Field>
      )}

      <div className="divider" />
      <div className="squad-head">
        <span className="badge">{squad.length > 0 ? `Plantel — ${squad.length} jugadores` : 'Plantel'}</span>
        {hasRoster ? (
          <Button variant="secondary" size="sm" onClick={generateSquad}>
            {squad.length > 0 ? 'Regenerar plantel' : 'Generar plantel'}
          </Button>
        ) : (
          <span className="inline-hint">Sin plantel real disponible aún (solo River Plate).</span>
        )}
      </div>
      {squad.length > 0 && (
        <div className="fut-grid">
          {squad.map((player) => (
            <PlayerCard key={player.id} player={player} />
          ))}
        </div>
      )}
    </Modal>
  )
}