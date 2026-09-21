import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode
} from 'react'
import type { Project } from '@/domain/types'
import {
  emptyState,
  editorReducer,
  projectFromState,
  stateFromProject,
  type Action,
  type EditorState
} from './editorState'
import type { CatalogEntry } from '@/data/catalog-types'
import {
  createStoredProject,
  listProjectMetas,
  loadStoredProject,
  removeStoredProject,
  updateStoredProject,
  type ProjectMeta
} from '@/data/projectRepo'
import { listCatalog, putCatalogEntry, removeCatalogEntry } from '@/data/catalogRepo'
import { exportProjectToFile, fileToProject } from '@/data/projectFiles'
import { syncLocalToServer } from '@/data/sync'
import { buildSampleProject } from '@/seed/sampleProject'
import { useAuth } from '@/auth/AuthContext'

export type Screen = 'home' | 'editor' | 'catalog'

export interface OpenTarget {
  leagueId: string
  tournamentId?: string
}

export type ModalState =
  | { kind: 'none' }
  | { kind: 'league'; leagueId?: string; level?: number; defaultKind?: 'division' | 'copa' }
  | { kind: 'club'; clubId?: string; leagueId?: string }
  | { kind: 'connection'; upperLeagueId?: string; connectionId?: string }
  | { kind: 'picker'; leagueId: string }
  | { kind: 'cupClubPicker'; leagueId: string }

interface AppContextValue {
  state: EditorState
  dispatch: Dispatch<Action>
  dirty: boolean
  lastSavedAt: string | null
  projectId: string | null
  screen: Screen
  setScreen: (screen: Screen) => void
  openTarget: OpenTarget | null
  setOpenTarget: (target: OpenTarget | null) => void
  modal: ModalState
  setModal: (modal: ModalState) => void
  catalog: CatalogEntry[]
  catalogLoading: boolean
  catalogUpsert: (entry: CatalogEntry) => Promise<void>
  catalogRemove: (id: string) => Promise<void>
  projects: ProjectMeta[]
  refreshProjects: () => Promise<void>
  newProject: () => Promise<void>
  loadSample: () => Promise<void>
  openProject: (id: string) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  saveNow: () => Promise<void>
  exportProject: () => void
  importProject: (file: File) => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

function signatureOf(state: EditorState): string {
  return JSON.stringify([state.projectName, state.leagues, state.clubs, state.connections, state.players])
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const username = user?.username ?? null
  const [state, dispatch] = useReducer(editorReducer, undefined, () => emptyState(''))
  const [dirty, setDirty] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [screen, setScreen] = useState<Screen>('home')
  const [openTarget, setOpenTarget] = useState<OpenTarget | null>(null)
  const [modal, setModal] = useState<ModalState>({ kind: 'none' })
  const [catalog, setCatalog] = useState<CatalogEntry[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [projects, setProjects] = useState<ProjectMeta[]>([])

  const lastSavedSignature = useRef(signatureOf(state))
  const projectIdRef = useRef<string | null>(null)

  useEffect(() => {
    projectIdRef.current = projectId
  }, [projectId])

  const persist = useCallback(async (next: EditorState) => {
    const project = projectFromState(next)
    let id = projectIdRef.current
    let savedAt = project.updatedAt
    if (id) {
      savedAt = await updateStoredProject(id, project)
    } else {
      const created = await createStoredProject(project)
      id = created.id
      savedAt = created.updatedAt
      projectIdRef.current = id
      setProjectId(id)
    }
    lastSavedSignature.current = signatureOf(next)
    setDirty(false)
    setLastSavedAt(savedAt)
    setProjects((prev) => {
      const meta = { id, name: project.name, createdAt: project.createdAt, updatedAt: savedAt }
      const rest = prev.filter((p) => p.id !== id)
      return [meta, ...rest].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    })
  }, [])

  useEffect(() => {
    const sig = signatureOf(state)
    if (sig !== lastSavedSignature.current) {
      setDirty(true)
      const timer = window.setTimeout(() => {
        void persist(state)
      }, 1200)
      return () => window.clearTimeout(timer)
    }
  }, [state, persist])

  const refreshCatalog = useCallback(async () => {
    setCatalogLoading(true)
    try {
      setCatalog(await listCatalog())
    } finally {
      setCatalogLoading(false)
    }
  }, [])

  const refreshProjects = useCallback(async () => {
    setProjects(await listProjectMetas())
  }, [])

  useEffect(() => {
    if (!username) return
    let active = true
    void (async () => {
      try {
        await syncLocalToServer(username)
        if (!active) return
        await refreshCatalog()
        if (!active) return
        await refreshProjects()
      } catch {
        // Sin conexión o sesión vencida: se reintenta en el próximo montaje.
      }
    })()
    return () => {
      active = false
    }
  }, [username, refreshCatalog, refreshProjects])

  const applyProject = useCallback(
    async (project: Project, id: string | null) => {
      const next = stateFromProject(project)
      lastSavedSignature.current = signatureOf(next)
      setDirty(false)
      setLastSavedAt(project.updatedAt)
      dispatch({ type: 'LOAD', state: next })
      projectIdRef.current = id
      setProjectId(id)
      setScreen('editor')
      setOpenTarget(null)
      setModal({ kind: 'none' })
      await refreshProjects()
    },
    [refreshProjects]
  )

  const newProject = useCallback(async () => {
    const empty = emptyState('Proyecto sin nombre')
    lastSavedSignature.current = signatureOf(empty)
    dispatch({ type: 'LOAD', state: empty })
    setDirty(false)
    lastSavedSignature.current = signatureOf(empty)
    projectIdRef.current = null
    setProjectId(null)
    setScreen('editor')
    setOpenTarget(null)
    setModal({ kind: 'none' })
  }, [])

  const loadSample = useCallback(async () => {
    const project = buildSampleProject()
    await applyProject(project, null)
  }, [applyProject])

  const openProject = useCallback(
    async (id: string) => {
      const record = await loadStoredProject(id)
      if (!record) {
        await refreshProjects()
        return
      }
      await applyProject(record.project, id)
    },
    [applyProject, refreshProjects]
  )

  const deleteProject = useCallback(
    async (id: string) => {
      await removeStoredProject(id)
      await refreshProjects()
      if (id === projectIdRef.current) {
        projectIdRef.current = null
        setProjectId(null)
        setScreen('home')
      }
    },
    [refreshProjects]
  )

  const saveNow = useCallback(() => persist(state), [state, persist])

  const exportProject = useCallback(() => {
    exportProjectToFile(projectFromState(state))
  }, [state])

  const importProject = useCallback(
    async (file: File) => {
      const project = await fileToProject(file)
      await applyProject(project, null)
    },
    [applyProject]
  )

  const catalogUpsert = useCallback(
    async (entry: CatalogEntry) => {
      await putCatalogEntry(entry)
      await refreshCatalog()
    },
    [refreshCatalog]
  )

  const catalogRemove = useCallback(
    async (id: string) => {
      await removeCatalogEntry(id)
      await refreshCatalog()
    },
    [refreshCatalog]
  )

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      dispatch,
      dirty,
      lastSavedAt,
      projectId,
      screen,
      setScreen,
      openTarget,
      setOpenTarget,
      modal,
      setModal,
      catalog,
      catalogLoading,
      catalogUpsert,
      catalogRemove,
      projects,
      refreshProjects,
      newProject,
      loadSample,
      openProject,
      deleteProject,
      saveNow,
      exportProject,
      importProject
    }),
    [
      state,
      dispatch,
      dirty,
      lastSavedAt,
      projectId,
      screen,
      openTarget,
      modal,
      catalog,
      catalogLoading,
      catalogUpsert,
      catalogRemove,
      projects,
      refreshProjects,
      newProject,
      loadSample,
      openProject,
      deleteProject,
      saveNow,
      exportProject,
      importProject
    ]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return ctx
}