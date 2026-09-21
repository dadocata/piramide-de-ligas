import {
  PROJECT_VERSION,
  type Club,
  type League,
  type LeagueConnection,
  type Player,
  type Project
} from '@/domain/types'

export interface EditorState {
  projectName: string
  leagues: League[]
  clubs: Club[]
  connections: LeagueConnection[]
  players: Player[]
}

export function emptyState(projectName: string): EditorState {
  return { projectName, leagues: [], clubs: [], connections: [], players: [] }
}

export function stateFromProject(project: Project): EditorState {
  return {
    projectName: project.name,
    leagues: project.leagues,
    clubs: project.clubs,
    connections: project.connections,
    players: project.players ?? []
  }
}

export function projectFromState(state: EditorState, existing?: Pick<Project, 'createdAt' | 'updatedAt'>): Project {
  const now = new Date().toISOString()
  return {
    version: PROJECT_VERSION,
    name: state.projectName || 'Proyecto sin nombre',
    leagues: state.leagues,
    clubs: state.clubs,
    connections: state.connections,
    players: state.players,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  }
}

export type Action =
  | { type: 'SET_PROJECT_NAME'; name: string }
  | { type: 'ADD_LEAGUE'; league: League }
  | { type: 'UPDATE_LEAGUE'; league: League }
  | { type: 'REMOVE_LEAGUE'; id: string }
  | { type: 'ADD_CLUBS'; clubs: Club[] }
  | { type: 'UPDATE_CLUB'; club: Club }
  | { type: 'REMOVE_CLUB'; id: string }
  | { type: 'REMOVE_CLUBS'; ids: string[] }
  | { type: 'GENERATE_SQUAD'; clubId: string; players: Player[] }
  | { type: 'UPDATE_PLAYER'; player: Player }
  | { type: 'ADD_CONNECTION'; connection: LeagueConnection }
  | { type: 'UPDATE_CONNECTION'; connection: LeagueConnection }
  | { type: 'REMOVE_CONNECTION'; id: string }
  | { type: 'LOAD'; state: EditorState }

export function editorReducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'SET_PROJECT_NAME':
      return { ...state, projectName: action.name }
    case 'ADD_LEAGUE':
      return { ...state, leagues: [...state.leagues, action.league] }
    case 'UPDATE_LEAGUE':
      return {
        ...state,
        leagues: state.leagues.map((l) => (l.id === action.league.id ? action.league : l))
      }
    case 'REMOVE_LEAGUE':
      return {
        ...state,
        leagues: state.leagues.filter((l) => l.id !== action.id),
        clubs: state.clubs.filter((c) => c.leagueId !== action.id),
        connections: state.connections.filter(
          (c) => c.upperLeagueId !== action.id && c.lowerLeagueId !== action.id
        ),
        players: state.players.filter((p) => state.clubs.find((c) => c.leagueId === action.id)?.id !== p.clubId)
      }
    case 'ADD_CLUBS':
      return { ...state, clubs: [...state.clubs, ...action.clubs] }
    case 'UPDATE_CLUB':
      return {
        ...state,
        clubs: state.clubs.map((c) => (c.id === action.club.id ? action.club : c))
      }
    case 'REMOVE_CLUB':
      return {
        ...state,
        clubs: state.clubs.filter((c) => c.id !== action.id),
        players: state.players.filter((p) => p.clubId !== action.id)
      }
    case 'REMOVE_CLUBS': {
      const remove = new Set(action.ids)
      return {
        ...state,
        clubs: state.clubs.filter((c) => !remove.has(c.id)),
        players: state.players.filter((p) => !remove.has(p.clubId))
      }
    }
    case 'GENERATE_SQUAD':
      return {
        ...state,
        players: [
          ...state.players.filter((p) => p.clubId !== action.clubId),
          ...action.players
        ]
      }
    case 'UPDATE_PLAYER':
      return {
        ...state,
        players: state.players.map((p) => (p.id === action.player.id ? action.player : p))
      }
    case 'ADD_CONNECTION':
      return { ...state, connections: [...state.connections, action.connection] }
    case 'UPDATE_CONNECTION':
      return {
        ...state,
        connections: state.connections.map((c) => (c.id === action.connection.id ? action.connection : c))
      }
    case 'REMOVE_CONNECTION':
      return { ...state, connections: state.connections.filter((c) => c.id !== action.id) }
    case 'LOAD':
      return action.state
    default:
      return state
  }
}