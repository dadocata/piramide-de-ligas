import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import { apiGet, apiPatch, apiPost } from '@/data/api'

export type Role = 'user' | 'admin'

export interface AuthUser {
  username: string
  fullName: string
  favoriteClub: string
  role: Role
}

export interface RegisterPayload {
  fullName: string
  username: string
  password: string
  favoriteClub: string
  code?: string
}

export interface UpdateAccountPayload {
  favoriteClub?: string
  username?: string
  password?: string
  currentPassword?: string
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => Promise<void>
  updateAccount: (payload: UpdateAccountPayload) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    apiGet<{ user: AuthUser }>('/api/auth/me')
      .then((data) => {
        if (active) setUser(data.user)
      })
      .catch(() => {
        if (active) setUser(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    const data = await apiPost<{ user: AuthUser }>('/api/auth/login', { username, password })
    setUser(data.user)
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    const data = await apiPost<{ user: AuthUser }>('/api/auth/register', payload)
    setUser(data.user)
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiPost('/api/auth/logout')
    } finally {
      setUser(null)
    }
  }, [])

  const updateAccount = useCallback(async (payload: UpdateAccountPayload) => {
    const data = await apiPatch<{ user: AuthUser }>('/api/auth/me', payload)
    setUser(data.user)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, logout, updateAccount }),
    [user, loading, login, register, logout, updateAccount]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}