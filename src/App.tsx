import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AppProvider, useApp } from '@/state/AppContext'
import { Button } from '@/components/ui'
import { AuthProvider, useAuth } from '@/auth/AuthContext'
import { HomeView } from '@/views/HomeView'
import { EditorView } from '@/views/EditorView'
import { CatalogView } from '@/views/CatalogView'
import { AuthView } from '@/views/AuthView'
import { AccountSettingsModal } from '@/components/modals/AccountSettingsModal'
import { APP_NAME } from '@/domain/constants'

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  )
}

function Root() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="shell">
        <header className="topbar">
          <div className="brand">
            <span className="brand-mark">▲</span>
            <span>{APP_NAME}</span>
          </div>
        </header>
<main className="main">
          <div className="empty-note">Cargando…</div>
        </main>
      </div>
    )
  }

  if (!user) return <AuthView />

  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}

function Shell() {
  const { screen, state } = useApp()
  const hasProject = state.leagues.length > 0 || state.clubs.length > 0

  return (
    <div className="shell">
      <TopBar />
      <main className={screen === 'editor' && hasProject ? 'main main--editor' : 'main'}>
        {screen === 'home' && <HomeView />}
        {screen === 'editor' && <EditorView />}
        {screen === 'catalog' && <CatalogView />}
      </main>
    </div>
  )
}

function TopBar() {
  const { screen, setScreen, state, dirty, projectId, saveNow, exportProject } = useApp()
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const hasProject = projectId != null || state.leagues.length > 0 || state.clubs.length > 0

  useEffect(() => {
    if (!menuOpen) return
    function onDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  return (
    <header className="topbar">
      <div className="brand" onClick={() => setScreen('home')}>
        <span className="brand-mark">▲</span>
        <span>{APP_NAME}</span>
      </div>

      <nav className="nav">
        <button className={`nav-button ${screen === 'home' ? 'active' : ''}`} onClick={() => setScreen('home')}>
          Inicio
        </button>
        <button className={`nav-button ${screen === 'editor' ? 'active' : ''}`} onClick={() => setScreen('editor')}>
          Editor
        </button>
        <button className={`nav-button ${screen === 'catalog' ? 'active' : ''}`} onClick={() => setScreen('catalog')}>
          Biblioteca
        </button>
      </nav>

      <div className="topbar-right">
        {hasProject && (
          <>
            <span className="project-label">
              <span className={`dirty-dot ${dirty ? '' : 'saved'}`} />
              <span className="project-name">{state.projectName || 'Proyecto sin nombre'}</span>
            </span>
            <Button size="sm" onClick={saveNow}>Guardar</Button>
            <Button size="sm" variant="ghost" onClick={exportProject}>Exportar</Button>
          </>
        )}
        <div className="account-menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="account-btn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            title="Ajustes de cuenta"
          >
            <span>{user?.fullName || user?.username}</span>
            <span className="account-caret">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </span>
          </button>
          {menuOpen && (
            <div className="account-menu" role="menu">
              <button
                type="button"
                className="account-menu-item"
                onClick={() => {
                  setMenuOpen(false)
                  setSettingsOpen(true)
                }}
              >
                Ajustes de cuenta
              </button>
              <button type="button" className="account-menu-item danger" onClick={() => void logout()}>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
        {settingsOpen &&
          createPortal(<AccountSettingsModal onClose={() => setSettingsOpen(false)} />, document.body)}
      </div>
    </header>
  )
}