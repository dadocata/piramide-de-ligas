export type TiebreakerType =
  | 'points'
  | 'goalDifference'
  | 'goalsFor'

export const TIEBREAKERS: TiebreakerType[] = ['points', 'goalDifference', 'goalsFor']

export const TIEBREAKER_LABELS: Record<TiebreakerType, string> = {
  points: 'Puntos',
  goalDifference: 'Diferencia de gol',
  goalsFor: 'Goles a favor'
}

export interface ZoneDef {
  id: string
  label: string
}

export interface InterzonalConfig {
  zoneA: string
  zoneB: string
  /**
   * Cantidad de rivales de la otra zona que enfrenta cada equipo por vuelta.
   * Ausente = cruce total (todos contra todos entre las zonas).
   */
  cruces?: number
}

export interface LeagueSetup {
  zones: ZoneDef[]
  interzonals: InterzonalConfig[]
}

export type BandColor = 'green' | 'red' | 'yellow' | 'orange' | 'blue' | 'purple'

export const BAND_COLORS: BandColor[] = ['green', 'red', 'yellow', 'orange', 'blue', 'purple']

export const BAND_COLOR_LABELS: Record<BandColor, string> = {
  green: 'Verde',
  red: 'Rojo',
  yellow: 'Amarillo',
  orange: 'Naranja',
  blue: 'Azul',
  purple: 'Violeta'
}

export interface StandingBand {
  id: string
  from: number
  to: number
  color: BandColor
}

export type RoundTripCount = 1 | 2
export type LeagueRounds = 0.5 | 1 | 2 | 3 | 4

export const LEAGUE_ROUNDS: LeagueRounds[] = [0.5, 1, 2, 3, 4]

export type TournamentFormat =
  | { kind: 'liga'; vueltas: LeagueRounds }
  | { kind: 'grupos'; vueltas: LeagueRounds; interleaved?: boolean; interleaveEvery?: number }
  | { kind: 'copa'; fase: 'grupos' | 'directo'; vueltas: LeagueRounds; legs: RoundTripCount; avPorGrupo: number }
  | { kind: 'reducido'; vueltas: LeagueRounds; fromPos: number; toPos: number; legs: RoundTripCount }
  | { kind: 'eliminacion'; legs: RoundTripCount }

export type TournamentFormatKind = TournamentFormat['kind']

export const FORMAT_KINDS: TournamentFormatKind[] = ['liga', 'grupos', 'copa', 'reducido', 'eliminacion']

export const FORMAT_LABELS: Record<TournamentFormatKind, string> = {
  liga: 'Tabla simple (todos contra todos)',
  grupos: 'Por zonas / grupos',
  copa: 'Copa (grupos o eliminación directa)',
  reducido: 'Liga + reducido (puestos desde–hasta)',
  eliminacion: 'Eliminación directa'
}

export interface Tournament {
  id: string
  name: string
  format: TournamentFormat
  tiebreakerOrder: TiebreakerType[]
  setup: LeagueSetup
  bands: StandingBand[]
}

export interface SeasonRecord {
  year: string
  standings: Array<{ clubId: string; points: number; played: number }>
}

export interface LeagueRelegation {
  method: 'tabla' | 'promedio'
  promedio?: {
    seasonsCount: number
    seasons: SeasonRecord[]
  }
}

export interface LeaguePromotion {
  promoteCount: number
  relegationCount: number
}

export type LeagueKind = 'division' | 'copa'

export type CupScope = 'nacional' | 'regional'

export interface CupFeeder {
  id: string
  leagueId: string
}

export interface CupParticipant {
  clubId: string
  zoneId?: string
}

export interface CupConfig {
  scope: CupScope
  feeders: CupFeeder[]
  participants: CupParticipant[]
}

export interface League {
  id: string
  name: string
  kind?: LeagueKind
  cup?: CupConfig
  level: number
  tournaments: Tournament[]
  logoData?: string
  x?: number
  y?: number
  generalTable?: { tournamentIds: string[] }
  relegation?: LeagueRelegation
}

export interface Club {
  id: string
  leagueId: string
  name: string
  shortName?: string
  barrio?: string
  localidad?: string
  provincia?: string
  crestData?: string
  zoneId?: string
}

export interface LeagueConnection {
  id: string
  upperLeagueId: string
  lowerLeagueId: string
  promoteCount: number
  relegateCount: number
}

export type PlayerPosition = 'GK' | 'CB' | 'LB' | 'RB' | 'DM' | 'CM' | 'AM' | 'LW' | 'RW' | 'SS' | 'ST'

export const PLAYER_POSITIONS: PlayerPosition[] = ['GK', 'CB', 'LB', 'RB', 'DM', 'CM', 'AM', 'LW', 'RW', 'SS', 'ST']

export const POSITION_LABELS: Record<PlayerPosition, string> = {
  GK: 'Arquero',
  CB: 'Defensor central',
  LB: 'Lateral izquierdo',
  RB: 'Lateral derecho',
  DM: 'Mediocampista defensivo',
  CM: 'Mediocampista central',
  AM: 'Mediocampista ofensivo',
  LW: 'Extremo izquierdo',
  RW: 'Extremo derecho',
  SS: 'Segundo delantero',
  ST: 'Delantero centro'
}

export interface PlayerAttrs {
  ritmo: number
  tiro: number
  pase: number
  regate: number
  defensa: number
  fisico: number
  atajadas?: number
}

export interface Player {
  id: string
  clubId: string
  name: string
  position: PlayerPosition
  age: number
  number?: number
  nationality?: string
  marketValue?: number
  attrs: PlayerAttrs
}

export interface FixtureMatch {
  id: string
  homeClubId: string
  awayClubId: string
  played: boolean
  homeGoals?: number
  awayGoals?: number
  homeGoals2?: number
  awayGoals2?: number
}

export interface FixtureRound {
  id: string
  name: string
  matches: FixtureMatch[]
}

export type MatchSource =
  | { kind: 'seed'; position: number }
  | { kind: 'winner'; round: number; index: number }

export interface KnockoutMatch {
  id: string
  round: number
  index: number
  home: MatchSource
  away: MatchSource
  homeGoals?: number
  awayGoals?: number
  homeGoals2?: number
  awayGoals2?: number
}

export interface KnockoutRound {
  round: number
  matches: KnockoutMatch[]
}

export const PROJECT_VERSION = 10

export interface Project {
  version: typeof PROJECT_VERSION
  name: string
  leagues: League[]
  clubs: Club[]
  connections: LeagueConnection[]
  players: Player[]
  createdAt: string
  updatedAt: string
}