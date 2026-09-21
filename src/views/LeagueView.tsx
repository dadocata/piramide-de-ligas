import { useMemo, useState } from 'react'
import { useApp } from '@/state/AppContext'
import { Button } from '@/components/ui'
import { StandingsTable } from '@/components/StandingsTable'
import { GeneralTable } from '@/components/GeneralTable'
import { PromediosTable } from '@/components/PromediosTable'
import { FixtureView } from '@/components/FixtureView'
import { BracketView } from '@/components/BracketView'
import { getLeagueClubs, primaryTournament, cupParticipantClubs } from '@/domain/validation'
import { createEmptyStandingRows, computePromedios, sortStandings, sortedWithTiebreaker, sumStandingTables } from '@/domain/standings'
import { buildPlayoffBracket, cupSeedOrder, generateFixture, generatePlayoffFromStandings } from '@/domain/fixtures'
import type { CupGroupOrder, FixtureOptions } from '@/domain/fixtures'
import type { FixtureRound, KnockoutRound, Tournament } from '@/domain/types'

interface LeagueViewProps {
  leagueId: string
  tournamentId?: string
}

type LeagueSection = 'general' | 'promedio' | `tournament:${string}`

export function LeagueView({ leagueId, tournamentId }: LeagueViewProps) {
  const { state, setOpenTarget, setModal } = useApp()
  const league = state.leagues.find((l) => l.id === leagueId)
  const clubs = useMemo(() => {
    const base =
      league?.kind === 'copa' && league.cup
        ? cupParticipantClubs(league, state.clubs)
        : getLeagueClubs(state.clubs, leagueId)
    const zoneMap =
      league?.kind === 'copa' && league.cup
        ? new Map(league.cup.participants.map((p) => [p.clubId, p.zoneId]))
        : null
    return base
      .map((c) => (zoneMap?.has(c.id) ? { ...c, zoneId: zoneMap.get(c.id) } : c))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }, [league, state.clubs, leagueId])
  const initialSection: LeagueSection = useMemo(() => {
    if (!league) return 'general'
    if (tournamentId && league.tournaments.some((t) => t.id === tournamentId)) return `tournament:${tournamentId}` as LeagueSection
    return `tournament:${primaryTournament(league).id}` as LeagueSection
  }, [league, tournamentId])

  const [section, setSection] = useState<LeagueSection>(initialSection)
  const [fixtures, setFixtures] = useState<FixtureRound[] | null>(null)
  const [bracket, setBracket] = useState<{ rounds: KnockoutRound[]; seedOrder: string[]; legs: 1 | 2 } | null>(null)

  const generalEnabled = !!league?.generalTable && league.generalTable.tournamentIds.length >= 2
  const promedioEnabled = league?.relegation?.method === 'promedio' && !!league.relegation.promedio

  const tournament: Tournament | undefined = league
    ? section.startsWith('tournament:')
      ? league.tournaments.find((t) => t.id === section.slice('tournament:'.length)) ?? primaryTournament(league)
      : primaryTournament(league)
    : undefined

  const conn = league ? state.connections.find((c) => c.upperLeagueId === league.id) : undefined
  const next = conn ? state.leagues.find((l) => l.id === conn.lowerLeagueId) : undefined

  const emptyRows = () =>
    createEmptyStandingRows(clubs.map((c) => ({ clubId: c.id, zoneId: c.zoneId ?? undefined })))

  const generalRows = useMemo(() => {
    if (!generalEnabled || !league?.generalTable) return null
    const tours = league.tournaments.filter((t) => league.generalTable!.tournamentIds.includes(t.id))
    return sumStandingTables(tours.map(() => emptyRows()))
  }, [league, generalEnabled, clubs])

  const promedioRows = useMemo(() => {
    if (!promedioEnabled || !league?.relegation?.promedio) return null
    const tours = league.tournaments.filter((t) => t.format.kind !== 'eliminacion')
    const current = sumStandingTables(tours.map(() => emptyRows()))
    return computePromedios(
      clubs.map((c) => c.id),
      league.relegation.promedio.seasons.map((s) => s.standings),
      current
    )
  }, [league, promedioEnabled, clubs])

  if (!league || !tournament) return null

  function seedOrderFor(): string[] {
    return sortStandings(emptyRows()).map((r) => r.clubId)
  }

  function generateFor(t: Tournament) {
    if (t.format.kind === 'eliminacion') {
      const seeds = seedOrderFor()
      setBracket({ rounds: buildPlayoffBracket(seeds), seedOrder: seeds, legs: t.format.legs })
      setFixtures(null)
      return
    }
    if (t.format.kind === 'copa') {
      if (t.format.fase === 'directo') {
        const seeds = seedOrderFor()
        setBracket({ rounds: buildPlayoffBracket(seeds), seedOrder: seeds, legs: t.format.legs })
        setFixtures(null)
        return
      }
      const zones = t.setup.zones
      const f = t.format
      const groupRounds = zones.flatMap((zone) => {
        const groupClubs = clubs.filter((c) => c.zoneId === zone.id)
        return generateFixture(groupClubs, [zone], [], { vueltas: f.vueltas })
      })
      setFixtures(groupRounds)
      const order: CupGroupOrder[] = zones.map((zone) => {
        const zoneClubs = clubs.filter((c) => c.zoneId === zone.id)
        const zoneRows = createEmptyStandingRows(zoneClubs.map((c) => ({ clubId: c.id, zoneId: c.zoneId })))
        return {
          zoneId: zone.id,
          orderedClubIds: sortedWithTiebreaker(zoneRows, t.tiebreakerOrder)
            .slice(0, f.avPorGrupo)
            .map((r) => r.clubId)
        }
      })
      const seeds = cupSeedOrder(order, f.avPorGrupo)
      setBracket({ rounds: buildPlayoffBracket(seeds), seedOrder: seeds, legs: t.format.legs })
      return
    }
    const zones = t.format.kind === 'grupos' ? t.setup.zones : []
    const interzonals = t.format.kind === 'grupos' ? t.setup.interzonals : []
    const vueltas = (t.format as { vueltas: number }).vueltas
    const opts: FixtureOptions =
      t.format.kind === 'grupos' && t.format.interleaved && interzonals.length > 0
        ? { vueltas, interleaved: true, interleaveEvery: t.format.interleaveEvery }
        : { vueltas }
    setFixtures(generateFixture(clubs, zones, interzonals, opts))
    if (t.format.kind === 'reducido') {
      const f = t.format
      const seeds = seedOrderFor()
      const startIdx = Math.max(1, f.fromPos) - 1
      const endIdx = Math.min(seeds.length, f.toPos)
      const playoffSeeds = seeds.slice(startIdx, endIdx)
      setBracket({
        rounds: generatePlayoffFromStandings(seeds, f.fromPos, f.toPos, f.legs),
        seedOrder: playoffSeeds,
        legs: f.legs
      })
    } else {
      setBracket(null)
    }
  }

  function selectSection(next: LeagueSection) {
    if (next === section) return
    setSection(next)
    setFixtures(null)
    setBracket(null)
  }

  const tabs: Array<{ id: LeagueSection; label: string }> = [
    ...league.tournaments.map((t) => ({ id: `tournament:${t.id}` as LeagueSection, label: t.name })),
    ...(generalEnabled ? [{ id: 'general' as LeagueSection, label: 'Tabla general' }] : []),
    ...(promedioEnabled ? [{ id: 'promedio' as LeagueSection, label: 'Promedios' }] : [])
  ]

  return (
    <div className="league-view">
      <div className="league-head">
        <Button variant="ghost" onClick={() => setOpenTarget(null)}>← Volver</Button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2>{league.name}</h2>
          <div className="league-chips">
            {league.kind === 'copa' ? (
              <span className="chip neutral">
                {league.cup?.scope === 'regional' ? 'Copa regional' : 'Copa nacional'}
              </span>
            ) : (
              <span className="level-badge" style={{ width: 'auto', height: 'auto', padding: '3px 9px', borderRadius: 999 }}>
                Nivel {league.level}
              </span>
            )}
            {conn && <span className="chip up">↑ {conn.promoteCount} ascienden</span>}
            {conn && <span className="chip down">↓ {conn.relegateCount} descienden</span>}
            {next && <span className="chip neutral">Bajan a {next.name}</span>}
            {league.relegation?.method === 'promedio' && <span className="chip neutral">Descenso por promedio</span>}
            {league.kind === 'copa' && league.cup && league.cup.feeders.length > 0 && (
              <span className="chip neutral">
                Participantes de{' '}
                {league.cup.feeders
                  .map((f) => state.leagues.find((l) => l.id === f.leagueId)?.name ?? '?')
                  .join(', ')}
              </span>
            )}
          </div>
        </div>
        <Button size="sm" onClick={() => setModal({ kind: 'league', leagueId })}>Editar liga</Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            setModal(
              league.kind === 'copa'
                ? { kind: 'cupClubPicker', leagueId }
                : { kind: 'picker', leagueId }
            )
          }
        >
          ＋ clubes
        </Button>
      </div>

      <div className="tournament-switch">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`tab-chip ${section === t.id ? 'active' : ''}`}
            onClick={() => selectSection(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {section.startsWith('tournament:') && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <Button size="sm" onClick={() => generateFor(tournament)}>
            {tournament.format.kind === 'eliminacion' ||
            (tournament.format.kind === 'copa' && tournament.format.fase === 'directo')
              ? 'Mostrar bracket'
              : 'Generar fixture'}
          </Button>
          <span className="inline-hint" style={{ alignSelf: 'center' }}>{FORMAT_HINTS[tournament.format.kind]}</span>
        </div>
      )}

      {fixtures && <FixtureView rounds={fixtures} clubs={clubs} />}

      {bracket && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Playoff</div>
          <BracketView rounds={bracket.rounds} seedOrder={bracket.seedOrder} clubs={clubs} legs={bracket.legs} />
        </div>
      )}

      {section === 'general' && generalRows && (
        <GeneralTable rows={generalRows} clubs={clubs} />
      )}

      {section === 'promedio' && promedioRows && (
        <>
          <div className="league-chips" style={{ marginBottom: 8 }}>
            <span className="chip neutral">
              Promedio de {league.relegation?.promedio?.seasonsCount ?? 3} temporadas
            </span>
            {conn && <span className="chip down">Descienden {conn.relegateCount} con peor promedio</span>}
          </div>
          <PromediosTable rows={promedioRows} clubs={clubs} descensoCount={conn?.relegateCount ?? 0} />
        </>
      )}

      {section.startsWith('tournament:') && (
        <StandingsTable tournament={tournament} clubs={clubs} bands={tournament.bands} />
      )}
    </div>
  )
}

const FORMAT_HINTS: Record<Tournament['format']['kind'], string> = {
  liga: 'Todos contra todos según la tabla.',
  grupos: 'Cada zona juega su tabla y se suman los cruces interzonales (configurables).',
  copa: 'Grupos + llaves (avanza el top de cada grupo) o eliminación directa.',
  reducido: 'Temporada regular + playoff entre los puestos configurados (los puestos previos no lo juegan).',
  eliminacion: 'Eliminación directa desde las posiciones de la tabla.'
}