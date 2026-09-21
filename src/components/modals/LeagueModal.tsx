import { useMemo, useState } from 'react'
import type { BandColor, CupFeeder, CupParticipant, CupScope, InterzonalConfig, League, LeagueKind, LeagueRounds, SeasonRecord, StandingBand, Tournament, TournamentFormat, ZoneDef } from '@/domain/types'
import { BAND_COLORS, BAND_COLOR_LABELS, FORMAT_KINDS, FORMAT_LABELS, LEAGUE_ROUNDS } from '@/domain/types'
import { newId } from '@/domain/ids'
import { createCupFeeder, createCupTournament, createTournament } from '@/domain/factories'
import { fixtureSize } from '@/domain/fixtures'
import { useApp } from '@/state/AppContext'
import { Banner, Button, Field, Modal, NumberInput, Select, TextInput } from '@/components/ui'
import { getLeagueClubs } from '@/domain/validation'
import { nextLeaguePosition } from '@/domain/layout'
import { readImageFile } from '@/data/image'
import { CrestImage } from '@/components/CrestImage'
import { CupClubPicker } from './CupClubPicker'

interface TournamentDraft {
  id: string
  name: string
  format: TournamentFormat
  tiebreakerOrder: string[]
  zones: ZoneDef[]
  interzonals: InterzonalConfig[]
  bands: StandingBand[]
}

interface LeagueModalProps {
  leagueId?: string
  defaultLevel?: number
  defaultKind?: LeagueKind
  onClose: () => void
}

const TIEBREAKER_OPTIONS = [
  { value: 'points', label: 'Puntos' },
  { value: 'goalDifference', label: 'Diferencia de gol' },
  { value: 'goalsFor', label: 'Goles a favor' }
]

export function LeagueModal({ leagueId, defaultLevel = 1, defaultKind, onClose }: LeagueModalProps) {
  const { state, dispatch } = useApp()
  const existing = leagueId ? state.leagues.find((l) => l.id === leagueId) : undefined

  const [tab, setTab] = useState<'general' | 'torneos'>('general')
  const [name, setName] = useState(existing?.name ?? '')
  const [level, setLevel] = useState(existing?.level ?? defaultLevel)
  const [logoData, setLogoData] = useState(existing?.logoData ?? '')
  const [tournaments, setTournaments] = useState<TournamentDraft[]>(() =>
    (existing?.tournaments ?? [defaultKind === 'copa' ? createCupTournament('Torneo') : createTournament('Torneo Apertura')]).map(toDraft)
  )
  const [zoneAssign, setZoneAssign] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    if (existing) {
      for (const club of getLeagueClubs(state.clubs, existing.id)) {
        if (club.zoneId) map[club.id] = club.zoneId
      }
    }
    return map
  })
  const [relegationMethod, setRelegationMethod] = useState<'tabla' | 'promedio'>(
    existing?.relegation?.method ?? 'tabla'
  )
  const [promedioSeasonsCount, setPromedioSeasonsCount] = useState<number>(
    existing?.relegation?.promedio?.seasonsCount ?? 3
  )
  const [promedioSeasons, setPromedioSeasons] = useState<SeasonRecord[]>(
    existing?.relegation?.promedio?.seasons ?? []
  )
  const [generalEnabled, setGeneralEnabled] = useState(() => {
    const g = existing?.generalTable
    return !!g && g.tournamentIds.length >= 2
  })
  const [generalIds, setGeneralIds] = useState<string[]>(existing?.generalTable?.tournamentIds ?? [])
  const [errors, setErrors] = useState<string[]>([])
  const [kind] = useState<LeagueKind>(existing?.kind ?? defaultKind ?? 'division')
  const [cupScope, setCupScope] = useState<CupScope>(existing?.cup?.scope ?? 'nacional')
  const [feeders, setFeeders] = useState<CupFeeder[]>(existing?.cup?.feeders ?? [])
  const [participants, setParticipants] = useState<CupParticipant[]>(existing?.cup?.participants ?? [])
  const [pickerOpen, setPickerOpen] = useState(false)

  const isCopa = kind === 'copa'
  const feederIds = useMemo(() => new Set(feeders.map((f) => f.leagueId)), [feeders])
  const eligibleClubs = useMemo(
    () => (isCopa ? state.clubs.filter((c) => feederIds.has(c.leagueId)) : []),
    [isCopa, feederIds, state.clubs]
  )
  const divisionLeagues = useMemo(
    () => state.leagues.filter((l) => l.kind !== 'copa'),
    [state.leagues]
  )
  const cupZones = isCopa && tournaments[0]?.format.kind === 'copa' && tournaments[0].format.fase === 'grupos'
    ? tournaments[0].zones
    : []

  const leagueClubs = useMemo(
    () => (leagueId ? getLeagueClubs(state.clubs, leagueId) : []),
    [state.clubs, leagueId]
  )
  const formatClubs = useMemo(
    () => (isCopa ? participants.map((p) => ({ id: p.clubId, zoneId: p.zoneId })) : leagueClubs),
    [isCopa, participants, leagueClubs]
  )
  const links = useMemo(
    () =>
      state.connections.flatMap((c) => {
        if (c.upperLeagueId !== leagueId && c.lowerLeagueId !== leagueId) return []
        const upper = state.leagues.find((l) => l.id === c.upperLeagueId)
        const lower = state.leagues.find((l) => l.id === c.lowerLeagueId)
        return [{ conn: c, upper, lower }]
      }),
    [state.connections, state.leagues, leagueId]
  )
  const primary = tournaments[0]
  const showZones = hasPrimaryZones(tournaments)
  const finalGeneralIds = generalIds.filter((id) => tournaments.some((t) => t.id === id))
  const validGeneral = generalEnabled && finalGeneralIds.length >= 2

  function validate(): string[] {
    const errs: string[] = []
    if (!name.trim()) errs.push('La liga debe tener un nombre.')
    if (!isCopa && (level < 1 || level > 10)) errs.push('El nivel debe estar entre 1 y 10.')
    if (tournaments.length === 0) errs.push('La liga necesita al menos un torneo.')
    if (isCopa && feeders.length === 0) {
      errs.push('La copa necesita estar conectada a al menos una división.')
    }
    if (isCopa) {
      const eligible = new Set(eligibleClubs.map((c) => c.id))
      for (const p of participants) {
        if (!eligible.has(p.clubId)) {
          errs.push('Un participante no pertenece a las divisiones conectadas a la copa.')
          break
        }
      }
      if (participants.length > 0 && participants.length < 2) {
        errs.push('La copa necesita al menos 2 participantes.')
      }
      if (cupZones.length > 0) {
        for (const p of participants) {
          if (!p.zoneId) {
            errs.push('Todos los participantes deben tener grupo asignado (se usa el formato de la copa).')
            break
          }
        }
      }
    }
    for (const t of tournaments) {
      if (!t.name.trim()) errs.push('Todos los torneos deben tener un nombre.')
      if (t.format.kind === 'reducido') {
        const count = t.format.toPos - t.format.fromPos + 1
        if (t.format.fromPos < 1 || t.format.toPos < t.format.fromPos || count < 2) {
          errs.push(`«${t.name}»: el reducido necesita un rango de puestos válido con al menos 2 equipos.`)
        }
      }
      if (t.format.kind === 'copa' && t.format.fase === 'grupos' && t.format.avPorGrupo < 1) {
        errs.push(`«${t.name}»: la copa necesita al menos 1 clasificado por grupo.`)
      }
      for (const z of t.zones) if (!z.label.trim()) errs.push('Las zonas deben tener un nombre.')
      for (const i of t.interzonals) if (i.zoneA === i.zoneB) errs.push('Un interzonal no puede enfrentar a una zona consigo misma.')
      for (const b of t.bands) {
        if (b.from < 1 || b.to < b.from) errs.push(`«${t.name}»: las marcas de posición van desde un número ≥ 1 y «hasta» mayor o igual que «desde».`)
      }
    }
    if (!isCopa && generalEnabled && finalGeneralIds.length < 2) {
      errs.push('La tabla general necesita sumar al menos 2 torneos.')
    }
    if (!isCopa && relegationMethod === 'promedio' && leagueClubs.length === 0) {
      errs.push('El descenso por promedio necesita que la liga tenga clubes.')
    }
    if (!isCopa && showZones) {
      for (const club of leagueClubs) {
        if (zoneAssign[club.id] && !primary.zones.some((z) => z.id === zoneAssign[club.id])) {
          errs.push(`«${club.name}» tiene una zona inválida.`)
        }
      }
    }
    return errs
  }

  async function onUpload(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErrors(['El archivo debe ser una imagen.'])
      return
    }
    try {
      setLogoData(await readImageFile(file))
    } catch {
      setErrors(['No se pudo procesar la imagen.'])
    }
  }

  function save() {
    const errs = validate()
    setErrors(errs)
    if (errs.length > 0) return

    const league: League = {
      id: existing?.id ?? newId('l'),
      name: name.trim(),
      kind,
      level: isCopa ? 1 : level,
      x: existing?.x,
      y: existing?.y,
      logoData: logoData || undefined,
      tournaments: tournaments.map(toTournament),
      cup: isCopa ? { scope: cupScope, feeders, participants } : undefined,
      generalTable: !isCopa && validGeneral ? { tournamentIds: finalGeneralIds } : undefined,
      relegation:
        !isCopa && relegationMethod === 'promedio'
          ? {
              method: 'promedio',
              promedio: {
                seasonsCount: promedioSeasonsCount,
                seasons: promedioSeasons
              }
            }
          : undefined
    }

    if (!existing && !isCopa) {
      const pos = nextLeaguePosition(state.leagues, level)
      league.x = pos.x
      league.y = pos.y
    }

    dispatch(existing ? { type: 'UPDATE_LEAGUE', league } : { type: 'ADD_LEAGUE', league })

    if (!isCopa) {
      for (const club of leagueClubs) {
        const zoneId = zoneAssign[club.id] ?? undefined
        if (club.zoneId !== zoneId) {
          dispatch({ type: 'UPDATE_CLUB', club: { ...club, zoneId } })
        }
      }
    }
    onClose()
  }

  return (
    <Modal
      title={
        existing
          ? (isCopa ? `Editar copa — ${existing.name}` : `Editar liga — ${existing.name}`)
          : (isCopa ? 'Nueva copa' : 'Nueva liga')
      }
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save}>Guardar liga</Button>
        </>
      }
    >
      <div className="modal-tabs">
        <button className={`modal-tab ${tab === 'general' ? 'active' : ''}`} onClick={() => setTab('general')}>General</button>
        <button className={`modal-tab ${tab === 'torneos' ? 'active' : ''}`} onClick={() => setTab('torneos')}>Torneos</button>
      </div>

      {errors.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {errors.map((e) => (
            <Banner key={e}>{e}</Banner>
          ))}
        </div>
      )}

      {tab === 'general' && (
        <>
          <Field label="Logo de la liga (PNG)">
            <div className="crest-upload">
              <CrestImage data={logoData} name={name || 'Liga'} size="lg" />
              <label className="btn ghost sm">
                <input type="file" accept="image/png,image/webp,image/jpeg" onChange={(e) => void onUpload(e.target.files?.[0])} hidden />
                {logoData ? 'Reemplazar' : 'Subir logo'}
              </label>
              {logoData && (
                <Button variant="ghost" size="sm" onClick={() => setLogoData('')}>Quitar</Button>
              )}
            </div>
          </Field>
          <Field label="Tipo de competencia">
            <div className="row" style={{ gap: 8 }}>
              <span className="chip neutral">
                {isCopa ? 'Copa' : 'División'}
              </span>
              {isCopa ? (
                <span className="inline-hint">
                  Se muestra en la columna de copas de la pirámide, conectada a las divisiones que elijas
                  en «Dependencias». También se lista en el menú y en la pestaña «Copas». El tipo queda
                  fijo al crear la copa; creá una división aparte si lo necesitás.
                </span>
              ) : (
                <span className="inline-hint">
                  El tipo queda fijado por el botón que usaste para crearla. Una «Copa» se define desde
                  «＋ Crear copa» o la pestaña «Copas».
                </span>
              )}
            </div>
          </Field>
          <Field label="Nombre de la liga">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Primera División" />
          </Field>
          {!isCopa && (
            <Field label="Nivel (1 = más alta)">
              <NumberInput min={1} max={10} value={level} onChange={(e) => setLevel(Number(e.target.value))} />
            </Field>
          )}

          {!isCopa && (
            <div className="field">
              <span style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--text-2)' }}>
                Ascensos y descensos
              </span>
              {links.length === 0 ? (
                <span className="inline-hint">
                  Definí los ascensos y descensos al conectar esta liga con otra desde la pirámide (⛓ Conectar ligas).
                </span>
              ) : (
                <div className="list">
                  {links.map(({ conn, upper, lower }) => (
                    <div className="list-item" key={conn.id}>
                      <span style={{ fontWeight: 600, flex: 1 }}>
                        {upper && lower ? `${upper.name} ↔ ${lower.name}` : 'Conexión'}
                      </span>
                      {upper?.id === leagueId && (
                        <span className="chip up">↑ {conn.promoteCount} ascienden desde {lower?.name ?? '?'}</span>
                      )}
                      {lower?.id === leagueId && (
                        <span className="chip down">↓ {conn.relegateCount} descienden desde {upper?.name ?? '?'}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {isCopa && (
            <>
              <Field label="Alcance">
                <Select value={cupScope} onChange={(e) => setCupScope(e.target.value as CupScope)} style={{ width: 'auto' }}>
                  <option value="nacional">Nacional</option>
                  <option value="regional">Regional</option>
                </Select>
              </Field>

              <div className="field">
                <span style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--text-2)' }}>
                  Dependencias — divisiones que alimentan la copa
                </span>
                {feeders.length === 0 ? (
                  <span className="inline-hint">Conectá una o más divisiones para habilitar sus clubes en la copa.</span>
                ) : (
                  <div className="list">
                    {feeders.map((feeder) => {
                      const fed = divisionLeagues.find((l) => l.id === feeder.leagueId)
                      const count = state.clubs.filter((c) => c.leagueId === feeder.leagueId).length
                      return (
                        <div className="list-item" key={feeder.id}>
                          <span style={{ fontWeight: 600, flex: 1 }}>{fed?.name ?? 'División'}</span>
                          {fed && <span className="chip neutral">N{fed.level}</span>}
                          <span className="chip neutral">{count} clubes</span>
                          <button
                            className="icon-btn danger"
                            onClick={() =>
                              setFeeders((fs) => fs.filter((f) => f.id !== feeder.id))
                            }
                            aria-label="Desconectar división"
                          >
                            ✕
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
                <Select
                  value=""
                  onChange={(e) => {
                    const id = e.target.value
                    if (id && !feederIds.has(id)) setFeeders((fs) => [...fs, createCupFeeder(id)])
                  }}
                  style={{ width: 'auto', marginTop: 6 }}
                >
                  <option value="">＋ Conectar división…</option>
                  {divisionLeagues
                    .filter((l) => !feederIds.has(l.id))
                    .map((l) => (
                      <option key={l.id} value={l.id}>{l.name} (N{l.level})</option>
                    ))}
                </Select>
              </div>

              {tournaments[0] && (
                <MainTournamentEditor
                  draft={tournaments[0]}
                  clubs={formatClubs}
                  onChange={(next) => setTournaments((ts) => ts.map((x, i) => (i === 0 ? next : x)))}
                />
              )}

              <div className="field">
                <span style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--text-2)' }}>
                  Participantes ({participants.length})
                </span>
                {participants.length === 0 ? (
                  <span className="inline-hint">
                    Sumá los clubes habilitados por las divisiones conectadas con «＋ Agregar clubes».
                  </span>
                ) : (
                  <div className="list">
                    {participants.map((participant) => {
                      const club = state.clubs.find((c) => c.id === participant.clubId)
                      if (!club) return null
                      return (
                        <div className="list-item" key={participant.clubId}>
                          <span style={{ fontWeight: 600, flex: 1, minWidth: 0 }}>{club.name}</span>
                          {cupZones.length > 0 && (
                            <Select
                              value={participant.zoneId ?? ''}
                              onChange={(e) =>
                                setParticipants((ps) =>
                                  ps.map((p) => (p.clubId === participant.clubId ? { ...p, zoneId: e.target.value || undefined } : p))
                                )
                              }
                              style={{ width: 'auto' }}
                            >
                              <option value="">Sin grupo</option>
                              {cupZones.map((z) => (
                                <option key={z.id} value={z.id}>{z.label}</option>
                              ))}
                            </Select>
                          )}
                          <button
                            className="icon-btn danger"
                            onClick={() =>
                              setParticipants((ps) => ps.filter((p) => p.clubId !== participant.clubId))
                            }
                            aria-label="Quitar participante"
                          >
                            ✕
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
                <Button size="sm" style={{ marginTop: 6 }} onClick={() => setPickerOpen(true)}>
                  ＋ Agregar clubes
                </Button>
                {pickerOpen && (
                  <CupClubPicker
                    eligible={eligibleClubs}
                    initial={participants}
                    leagueName={name.trim() || 'Copa'}
                    onPick={setParticipants}
                    onClose={() => setPickerOpen(false)}
                  />
                )}
              </div>
            </>
          )}

          {!isCopa && showZones && (
            <div className="field">
              <span style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--text-2)' }}>
                Zona de cada club en «{primary.name}»
              </span>
              {leagueClubs.length === 0 ? (
                <span className="inline-hint">Los clubes se asignan desde la pirámide o el catálogo.</span>
              ) : (
                <div className="list">
                  {leagueClubs.map((club) => (
                    <div className="list-item" key={club.id}>
                      <span style={{ fontWeight: 600, flex: 1 }}>{club.name}</span>
                      <Select
                        value={zoneAssign[club.id] ?? ''}
                        onChange={(e) => setZoneAssign((m) => ({ ...m, [club.id]: e.target.value }))}
                        style={{ width: 'auto' }}
                      >
                        <option value="">Sin zona</option>
                        {primary.zones.map((z) => (
                          <option key={z.id} value={z.id}>{z.label}</option>
                        ))}
                      </Select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!isCopa && (
            <>
              <div className="divider" />

              <Field label="Sistema de descenso">
                <Select
                  value={relegationMethod}
                  onChange={(e) => setRelegationMethod(e.target.value as 'tabla' | 'promedio')}
                >
                  <option value="tabla">Por tabla (posiciones de la temporada)</option>
                  <option value="promedio">Por promedio (de N temporadas)</option>
                </Select>
              </Field>

              {relegationMethod === 'promedio' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Field label="Temporadas que se promedian">
                    <Select
                      value={promedioSeasonsCount}
                      onChange={(e) => setPromedioSeasonsCount(Number(e.target.value))}
                      style={{ width: 'auto' }}
                    >
                      <option value={2}>2 temporadas</option>
                      <option value={3}>3 temporadas</option>
                    </Select>
                  </Field>
                  {leagueClubs.length === 0 ? (
                    <span className="inline-hint">
                      Agregá clubes a la liga primero; el promedio suma la temporada actual con las anteriores que cargues acá.
                    </span>
                  ) : (
                    <PromedioSeasonsEditor
                      clubs={leagueClubs}
                      seasons={promedioSeasons}
                      onChange={setPromedioSeasons}
                    />
                  )}
                </div>
              )}

              {tournaments.length >= 2 && (
                <div className="field">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={generalEnabled}
                      onChange={(e) => {
                        const on = e.target.checked
                        setGeneralEnabled(on)
                        setGeneralIds(on ? tournaments.map((t) => t.id) : [])
                      }}
                    />
                    <span style={{ fontWeight: 650 }}>Tabla general (suma de torneos de la temporada)</span>
                  </label>
                  {generalEnabled && (
                    <>
                      <span className="inline-hint">Elegí qué torneos suman para armar la tabla anual.</span>
                      <div className="list">
                        {tournaments.map((t) => (
                          <label className="list-item" key={t.id} style={{ cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={generalIds.includes(t.id)}
                              onChange={(e) =>
                                setGeneralIds((ids) =>
                                  e.target.checked
                                    ? [...ids, t.id]
                                    : ids.filter((id) => id !== t.id)
                                )
                              }
                            />
                            <span style={{ fontWeight: 600, flex: 1 }}>{t.name}</span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {tab === 'torneos' && (
        <>
          {tournaments.map((t, index) => (
            <TournamentEditor
              key={t.id}
              draft={t}
              clubs={formatClubs}
              onChange={(next) => setTournaments((ts) => ts.map((x, i) => (i === index ? next : x)))}
              onRemove={tournaments.length > 1 ? () => setTournaments((ts) => ts.filter((_, i) => i !== index)) : undefined}
            />
          ))}
          <Button
            size="sm"
            onClick={() => setTournaments((ts) => [...ts, toDraft(createTournament('Nuevo torneo'))])}
          >
            ＋ Agregar torneo
          </Button>
        </>
      )}
    </Modal>
  )
}

function FormatFields({
  draft,
  clubs,
  onChange
}: {
  draft: TournamentDraft
  clubs: Array<{ id: string; zoneId?: string }>
  onChange: (next: TournamentDraft) => void
}) {
  const f = draft.format
  const hasVueltas =
    f.kind === 'liga' ||
    f.kind === 'grupos' ||
    (f.kind === 'copa' && f.fase === 'grupos') ||
    f.kind === 'reducido'

  const copaGrupos = f.kind === 'copa' && f.fase === 'grupos'

  const isEstimable = f.kind !== 'eliminacion' && !(f.kind === 'copa' && f.fase === 'directo')

  const estimate = useMemo(() => {
    if (!isEstimable || clubs.length < 2) return null
    if (f.kind === 'copa') {
      let rounds = 0
      let matches = 0
      for (const zone of draft.zones) {
        const zoneClubs = clubs.filter((c) => c.zoneId === zone.id)
        if (zoneClubs.length < 2) continue
        const size = fixtureSize(zoneClubs, [zone], [], { vueltas: f.vueltas })
        rounds += size.rounds
        matches += size.matches
      }
      return rounds === 0 ? null : { rounds, matches }
    }
    const zoneDef = f.kind === 'grupos' ? draft.zones : []
    const inz = f.kind === 'grupos' ? draft.interzonals : []
    const size = fixtureSize(clubs, zoneDef, inz, { vueltas: f.vueltas })
    return size.rounds === 0 ? null : size
  }, [isEstimable, clubs, f, draft.zones, draft.interzonals])

  function setFormat(kind: TournamentFormat['kind']) {
    const current = draft.format
    if (current.kind === kind) return
    if (kind === 'liga' || kind === 'grupos') {
      onChange({ ...draft, format: { kind, vueltas: current.kind === 'reducido' ? current.vueltas : 2 } })
    } else if (kind === 'reducido') {
      const vueltas = current.kind === 'liga' || current.kind === 'grupos' ? current.vueltas : 2
      onChange({ ...draft, format: { kind, vueltas, fromPos: 1, toPos: 4, legs: 2 } })
    } else if (kind === 'copa') {
      onChange({ ...draft, format: { kind: 'copa', fase: 'grupos', vueltas: 2, legs: 2, avPorGrupo: 2 } })
    } else {
      onChange({ ...draft, format: { kind, legs: current.kind === 'reducido' ? current.legs : 2 } })
    }
  }

  return (
    <>
      <Field label="Formato">
        <Select value={f.kind} onChange={(e) => setFormat(e.target.value as TournamentFormat['kind'])}>
          {FORMAT_KINDS.map((kind) => (
            <option key={kind} value={kind}>{FORMAT_LABELS[kind]}</option>
          ))}
        </Select>
      </Field>

      {isEstimable &&
        (estimate ? (
          <span
            className="inline-hint"
            style={estimate.matches >= 600 ? { color: 'var(--warn)' } : undefined}
          >
            Genera ≈ {estimate.matches.toLocaleString('es-AR')} partidos en {estimate.rounds} fechas.
            {estimate.matches >= 600 &&
              f.kind !== 'copa' &&
              f.vueltas > 1 &&
              ' Con tantos equipos, considerá usar 1 vuelta o dividir en grupos.'}
          </span>
        ) : (
          <span className="inline-hint">
            Sumá al menos 2 clubes a la liga para ver cuántos partidos genera el torneo.
          </span>
        ))}

      {f.kind === 'copa' && (
        <>
          <Field label="Fase de grupos">
            <Select
              value={f.fase}
              onChange={(e) => onChange({ ...draft, format: { ...f, fase: e.target.value as 'grupos' | 'directo' } })}
              style={{ width: 'auto' }}
            >
              <option value="grupos">Fase de grupos + llaves</option>
              <option value="directo">Eliminación directa desde el inicio</option>
            </Select>
          </Field>
          {copaGrupos && (
            <div className="row">
              <Field label="Vueltas en la fase de grupos">
                <Select
                  value={f.vueltas}
                  onChange={(e) => onChange({ ...draft, format: { ...f, vueltas: Number(e.target.value) as LeagueRounds } })}
                  style={{ width: 'auto' }}
                >
                  {LEAGUE_ROUNDS.map((v) => (
                    <option key={v} value={v}>{vueltasLabel(v)}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Clasificados por grupo a las llaves">
                <NumberInput
                  min={1}
                  value={f.avPorGrupo}
                  onChange={(e) => {
                    const v = Math.max(1, Number(e.target.value) || 1)
                    onChange({ ...draft, format: { ...f, avPorGrupo: v } })
                  }}
                  style={{ width: 90 }}
                />
              </Field>
            </div>
          )}
          <Field label="Partidos por cruce en las llaves finales">
            <Select
              value={f.legs}
              onChange={(e) => onChange({ ...draft, format: { ...f, legs: Number(e.target.value) as 1 | 2 } })}
              style={{ width: 'auto' }}
            >
              <option value={1}>A un partido</option>
              <option value={2}>Ida y vuelta</option>
            </Select>
          </Field>
        </>
      )}

      {hasVueltas && !copaGrupos && (
        <Field label="Vueltas">
          <Select
            value={
              f.kind === 'reducido'
                ? f.vueltas
                : (f.kind === 'liga' || f.kind === 'grupos')
                  ? f.vueltas
                  : 2
            }
            onChange={(e) => {
              const vueltas = Number(e.target.value) as LeagueRounds
              if (f.kind === 'liga') onChange({ ...draft, format: { kind: 'liga', vueltas } })
              else if (f.kind === 'grupos') onChange({ ...draft, format: { ...f, vueltas } })
              else if (f.kind === 'reducido') onChange({ ...draft, format: { ...f, vueltas } })
            }}
            style={{ width: 'auto' }}
          >
            {LEAGUE_ROUNDS.map((v) => (
              <option key={v} value={v}>{vueltasLabel(v)}</option>
            ))}
          </Select>
        </Field>
      )}

      {f.kind === 'reducido' && (
        <>
          <div className="row">
            <Field label="Puestos que juegan el reducido ">
              <div className="row" style={{ alignItems: 'center' }}>
                <span className="muted">Desde</span>
                <NumberInput
                  min={1}
                  value={f.fromPos}
                  onChange={(e) => {
                    const fromPos = Math.max(1, Number(e.target.value) || 1)
                    const toPos = Math.max(fromPos, f.toPos)
                    onChange({ ...draft, format: { ...f, fromPos, toPos } })
                  }}
                  style={{ width: 70 }}
                />
                <span className="muted">hasta</span>
                <NumberInput
                  min={f.fromPos}
                  value={f.toPos}
                  onChange={(e) => {
                    const toPos = Math.max(f.fromPos, Number(e.target.value) || f.fromPos)
                    onChange({ ...draft, format: { ...f, toPos } })
                  }}
                  style={{ width: 70 }}
                />
              </div>
            </Field>
            <Field label="Partidos por cruce">
              <Select
                value={f.legs}
                onChange={(e) => {
                  const legs = Number(e.target.value) as 1 | 2
                  onChange({ ...draft, format: { ...f, legs } })
                }}
                style={{ width: 'auto' }}
              >
                <option value={1}>A un partido</option>
                <option value={2}>Ida y vuelta</option>
              </Select>
            </Field>
          </div>
          <span className="inline-hint">
            Solamente los puestos «Desde–hasta» juegan el reducido: si el 1° y el 2° ascienden
            directo, poné Desde 3 hasta 8 para que no lo jueguen.
          </span>
        </>
      )}

      {f.kind === 'eliminacion' && (
        <Field label="Partidos por cruce">
          <Select
            value={f.legs}
            onChange={(e) => {
              const legs = Number(e.target.value) as 1 | 2
              onChange({ ...draft, format: { kind: 'eliminacion', legs } })
            }}
            style={{ width: 'auto' }}
          >
            <option value={1}>A un partido</option>
            <option value={2}>Ida y vuelta</option>
          </Select>
        </Field>
      )}
    </>
  )
}

function vueltasLabel(v: LeagueRounds): string {
  if (v === 0.5) return 'Media vuelta'
  if (v === 1) return '1 vuelta'
  return `${v} vueltas`
}

function MainTournamentEditor({
  draft,
  clubs,
  onChange
}: {
  draft: TournamentDraft
  clubs: Array<{ id: string; zoneId?: string }>
  onChange: (next: TournamentDraft) => void
}) {
  return (
    <div className="field">
      <span style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--text-2)' }}>
        Torneo principal
      </span>
      <TextInput
        value={draft.name}
        onChange={(e) => onChange({ ...draft, name: e.target.value })}
        placeholder="Nombre del torneo (ej: Copa Argentina)"
        style={{ fontWeight: 650 }}
      />
      <span className="inline-hint">
        Elegí acá si la copa es por tabla (liga), por grupos + llaves, eliminación directa o reducido.
        Podés agregar más torneos en «Torneos».
      </span>
      <FormatFields draft={draft} clubs={clubs} onChange={onChange} />
    </div>
  )
}

function TournamentEditor({
  draft,
  clubs,
  onChange,
  onRemove
}: {
  draft: TournamentDraft
  clubs: Array<{ id: string; zoneId?: string }>
  onChange: (next: TournamentDraft) => void
  onRemove?: () => void
}) {
  const [zonesOpen, setZonesOpen] = useState(draft.zones.length > 0)
  const isGrupos = draft.format.kind === 'grupos' || (draft.format.kind === 'copa' && draft.format.fase === 'grupos')

  return (
    <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="row">
        <TextInput
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          placeholder="Nombre del torneo"
          style={{ fontWeight: 650 }}
        />
        {onRemove && (
          <button className="icon-btn danger" onClick={onRemove} aria-label="Quitar torneo">✕</button>
        )}
      </div>

      <FormatFields draft={draft} clubs={clubs} onChange={onChange} />

      <Field label="Desempates (en orden)">
        <div style={{ display: 'flex', gap: 8 }}>
          {TIEBREAKER_OPTIONS.map((opt) => {
            const active = draft.tiebreakerOrder.includes(opt.value)
            return (
              <button
                key={opt.value}
                type="button"
                className={`tab-chip ${active ? 'active' : ''}`}
                onClick={() =>
                  onChange({
                    ...draft,
                    tiebreakerOrder: active
                      ? draft.tiebreakerOrder.filter((v) => v !== opt.value)
                      : [...draft.tiebreakerOrder, opt.value]
                  })
                }
              >
                {opt.label}
                {active && <span className="muted"> · {draft.tiebreakerOrder.indexOf(opt.value) + 1}</span>}
              </button>
            )
          })}
        </div>
      </Field>

      <Field label="Colores de posiciones en la tabla">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {draft.bands.length === 0 && (
            <span className="inline-hint">Sin marcas. Agregá una para resaltar posiciones (ej: amarillo del 3° al 10°).</span>
          )}
          {draft.bands.map((band) => (
            <div className="row" key={band.id}>
              <span className="muted">Desde</span>
              <NumberInput
                min={1}
                value={band.from}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    bands: draft.bands.map((b) => (b.id === band.id ? { ...b, from: Number(e.target.value) } : b))
                  })
                }
                style={{ width: 74 }}
              />
              <span className="muted">hasta</span>
              <NumberInput
                min={1}
                value={band.to}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    bands: draft.bands.map((b) => (b.id === band.id ? { ...b, to: Number(e.target.value) } : b))
                  })
                }
                style={{ width: 74 }}
              />
              <Select
                value={band.color}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    bands: draft.bands.map((b) => (b.id === band.id ? { ...b, color: e.target.value as BandColor } : b))
                  })
                }
                style={{ width: 'auto' }}
              >
                {BAND_COLORS.map((c) => (
                  <option key={c} value={c}>{BAND_COLOR_LABELS[c]}</option>
                ))}
              </Select>
              <button
                className="icon-btn danger"
                onClick={() => onChange({ ...draft, bands: draft.bands.filter((b) => b.id !== band.id) })}
                aria-label="Quitar marca"
              >
                ✕
              </button>
            </div>
          ))}
          <Button
            size="sm"
            onClick={() =>
              onChange({
                ...draft,
                bands: [...draft.bands, { id: newId('b'), from: 1, to: 1, color: 'yellow' }]
              })
            }
          >
            ＋ Agregar marca
          </Button>
        </div>
      </Field>

      <div className="divider" />

      {isGrupos && (
        <>
          <div className="row">
            <button className="btn sm" onClick={() => setZonesOpen((v) => !v)}>
              {zonesOpen ? 'Ocultar' : 'Editar'} zonas {draft.zones.length > 0 ? `(${draft.zones.length})` : ''}
            </button>
          </div>

          {zonesOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {draft.zones.map((zone) => (
                <div className="row" key={zone.id}>
                  <TextInput
                    value={zone.label}
                    placeholder="Zona A"
                    onChange={(e) =>
                      onChange({
                        ...draft,
                        zones: draft.zones.map((z) => (z.id === zone.id ? { ...z, label: e.target.value } : z))
                      })
                    }
                  />
                  <button
                    className="icon-btn danger"
                    onClick={() =>
                      onChange({
                        ...draft,
                        zones: draft.zones.filter((z) => z.id !== zone.id),
                        interzonals: draft.interzonals.filter((i) => i.zoneA !== zone.id && i.zoneB !== zone.id)
                      })
                    }
                    aria-label="Quitar zona"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <Button
                size="sm"
                onClick={() =>
                  onChange({ ...draft, zones: [...draft.zones, { id: newId('z'), label: `Zona ${String.fromCharCode(65 + draft.zones.length)}` }] })
                }
              >
                ＋ Agregar zona
              </Button>

              {draft.format.kind === 'grupos' && draft.zones.length >= 2 && (
                <>
                  <div className="divider" />
                  <span style={{ fontSize: 12.5, fontWeight: 650, color: 'var(--text-2)' }}>Interzonales</span>
                  {draft.interzonals.map((inter, idx) => (
                    <div className="row" key={idx}>
                      <Select
                        value={inter.zoneA}
                        onChange={(e) =>
                          onChange({
                            ...draft,
                            interzonals: draft.interzonals.map((x, i) => (i === idx ? { ...x, zoneA: e.target.value } : x))
                          })
                        }
                      >
                        {draft.zones.map((z) => (
                          <option key={z.id} value={z.id}>{z.label}</option>
                        ))}
                      </Select>
                      <span className="muted">vs</span>
                      <Select
                        value={inter.zoneB}
                        onChange={(e) =>
                          onChange({
                            ...draft,
                            interzonals: draft.interzonals.map((x, i) => (i === idx ? { ...x, zoneB: e.target.value } : x))
                          })
                        }
                      >
                        {draft.zones.map((z) => (
                          <option key={z.id} value={z.id}>{z.label}</option>
                        ))}
                      </Select>
                      <span className="muted">Cruces:</span>
                      <NumberInput
                        min={1}
                        placeholder="todas"
                        style={{ width: 70 }}
                        value={inter.cruces ?? ''}
                        onChange={(e) => {
                          const raw = e.target.value.trim()
                          const cruces = raw === '' ? undefined : Math.max(1, Number(raw) || 1)
                          onChange({
                            ...draft,
                            interzonals: draft.interzonals.map((x, i) => (i === idx ? { ...x, cruces } : x))
                          })
                        }}
                      />
                      <button
                        className="icon-btn danger"
                        onClick={() => onChange({ ...draft, interzonals: draft.interzonals.filter((_, i) => i !== idx) })}
                        aria-label="Quitar interzonal"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    onClick={() =>
                      onChange({
                        ...draft,
                        interzonals: [...draft.interzonals, { zoneA: draft.zones[0].id, zoneB: draft.zones[1].id }]
                      })
                    }
                  >
                    ＋ Agregar interzonal
                  </Button>

                  {draft.format.kind === 'grupos' && (
                    <div className="field" style={{ marginTop: 4 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={draft.format.kind === 'grupos' && draft.format.interleaved === true}
                          onChange={(e) => {
                            const f = draft.format
                            if (f.kind !== 'grupos') return
                            onChange({ ...draft, format: { ...f, interleaved: e.target.checked } })
                          }}
                        />
                        <span style={{ fontWeight: 650 }}>Intercalar fechas interzonales entre las de zona</span>
                      </label>
                      {draft.format.interleaved === true && (
                        <div className="row" style={{ marginTop: 6 }}>
                          <span className="muted">Cada</span>
                          <NumberInput
                            min={1}
                            style={{ width: 70 }}
                            value={draft.format.kind === 'grupos' ? draft.format.interleaveEvery ?? 3 : 3}
                            onChange={(e) => {
                              const f = draft.format
                              if (f.kind !== 'grupos') return
                              onChange({
                                ...draft,
                                format: { ...f, interleaveEvery: Math.max(1, Number(e.target.value) || 1) }
                              })
                            }}
                          />
                          <span className="muted">fechas de zona, una interzonal</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function toDraft(t: Tournament): TournamentDraft {
  return {
    id: t.id,
    name: t.name,
    format: t.format,
    tiebreakerOrder: t.tiebreakerOrder,
    zones: t.setup.zones,
    interzonals: t.setup.interzonals,
    bands: t.bands
  }
}

function toTournament(d: TournamentDraft): Tournament {
  const usesZones =
    d.format.kind === 'grupos' || (d.format.kind === 'copa' && d.format.fase === 'grupos')
  return {
    id: d.id,
    name: d.name,
    format: d.format,
    tiebreakerOrder: d.tiebreakerOrder as Tournament['tiebreakerOrder'],
    setup: {
      zones: usesZones ? d.zones : [],
      interzonals: d.format.kind === 'grupos' ? d.interzonals : []
    },
    bands: d.bands
  }
}

function hasPrimaryZones(tournaments: TournamentDraft[]): boolean {
  const first = tournaments[0]
  if (!first) return false
  const usesZones =
    first.format.kind === 'grupos' || (first.format.kind === 'copa' && first.format.fase === 'grupos')
  return usesZones && first.zones.length > 0
}

function PromedioSeasonsEditor({
  clubs,
  seasons,
  onChange
}: {
  clubs: Array<{ id: string; name: string }>
  seasons: SeasonRecord[]
  onChange: (seasons: SeasonRecord[]) => void
}) {
  function updateSeason(index: number, next: SeasonRecord) {
    onChange(seasons.map((s, i) => (i === index ? next : s)))
  }

  function addSeason() {
    const year = `Temporada ${seasons.length + 1}`
    onChange([
      ...seasons,
      {
        year,
        standings: clubs.map((c) => ({ clubId: c.id, points: 0, played: 0 }))
      }
    ])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span className="inline-hint">
        Temporadas anteriores: la actual se suma sola con las posiciones de los torneos cargados.
      </span>
      {seasons.map((season, index) => (
        <div key={index} className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="row">
            <TextInput
              value={season.year}
              onChange={(e) => updateSeason(index, { ...season, year: e.target.value })}
              placeholder="Año / nombre de la temporada"
              style={{ fontWeight: 650 }}
            />
            <button
              className="icon-btn danger"
              onClick={() => onChange(seasons.filter((_, i) => i !== index))}
              aria-label="Quitar temporada"
            >
              ✕
            </button>
          </div>
          <div className="promedio-rows">
            {season.standings.map((row, rIdx) => {
              const club = clubs.find((c) => c.id === row.clubId)
              if (!club) return null
              return (
                <div className="row promedio-row" key={row.clubId}>
                  <span style={{ fontWeight: 600, flex: 1, minWidth: 0 }}>{club.name}</span>
                  <NumberInput
                    min={0}
                    value={row.played}
                    onChange={(e) => {
                      const played = Math.max(0, Number(e.target.value) || 0)
                      updateSeason(index, {
                        ...season,
                        standings: season.standings.map((s, i) =>
                          i === rIdx ? { ...s, played } : s
                        )
                      })
                    }}
                    title="Partidos jugados"
                    style={{ width: 60 }}
                  />
                  <NumberInput
                    min={0}
                    value={row.points}
                    onChange={(e) => {
                      const points = Math.max(0, Number(e.target.value) || 0)
                      updateSeason(index, {
                        ...season,
                        standings: season.standings.map((s, i) =>
                          i === rIdx ? { ...s, points } : s
                        )
                      })
                    }}
                    title="Puntos"
                    style={{ width: 60 }}
                  />
                </div>
              )
            })}
          </div>
        </div>
      ))}
      <Button size="sm" onClick={addSeason}>＋ Agregar temporada anterior</Button>
    </div>
  )
}