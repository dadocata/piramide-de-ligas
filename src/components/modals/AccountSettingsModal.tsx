import { useMemo, useState } from 'react'
import type { CatalogEntry } from '@/data/catalog-types'
import { useAuth } from '@/auth/AuthContext'
import { useApp } from '@/state/AppContext'
import { apiErrorMessage } from '@/data/api'
import { buildCatalogEntries } from '@/seed/afaLite'
import { Banner, Button, Field, Modal, Select, TextInput } from '@/components/ui'
import { sortDivisions } from '@/domain/divisions'

interface AccountSettingsModalProps {
  onClose: () => void
}

export function AccountSettingsModal({ onClose }: AccountSettingsModalProps) {
  const { user, updateAccount } = useAuth()
  const { catalog } = useApp()
  const [favoriteClub, setFavoriteClub] = useState(user?.favoriteClub ?? '')
  const [username, setUsername] = useState(user?.username ?? '')
  const [password, setPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const favorites = useMemo(() => {
    const list: CatalogEntry[] = catalog.length > 0 ? catalog : buildCatalogEntries()
    const map = new Map<string, CatalogEntry[]>()
    for (const entry of list) {
      const group = entry.division?.trim() || 'Otras categorías'
      if (!map.has(group)) map.set(group, [])
      map.get(group)?.push(entry)
    }
    const byKey = new Map([...map.entries()])
    return [...sortDivisions(map.keys())].map((key): [string, CatalogEntry[]] => [key, byKey.get(key) ?? []])
  }, [catalog])

  const usernameChanged = username.trim() !== (user?.username ?? '')
  const passwordChanged = password.length > 0
  const needsVerification = usernameChanged || passwordChanged

  async function save() {
    setError(null)
    const payload: { favoriteClub?: string; username?: string; password?: string; currentPassword?: string } = {}
    if (favoriteClub.trim() && favoriteClub.trim() !== (user?.favoriteClub ?? '')) {
      payload.favoriteClub = favoriteClub.trim()
    }
    if (usernameChanged) payload.username = username.trim()
    if (passwordChanged) payload.password = password
    if (needsVerification) {
      if (!currentPassword) {
        setError('Ingresá tu contraseña actual para confirmar los cambios.')
        return
      }
      payload.currentPassword = currentPassword
    }
    if (Object.keys(payload).length === 0) {
      setError('No hay cambios para guardar.')
      return
    }
    setBusy(true)
    try {
      await updateAccount(payload)
      onClose()
    } catch (err) {
      setError(apiErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title="Ajustes de cuenta"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button variant="primary" onClick={() => void save()} disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </>
      }
    >
      {error && <Banner>{error}</Banner>}

      <Field label="Equipo favorito">
        <Select value={favoriteClub} onChange={(e) => setFavoriteClub(e.target.value)}>
          <option value="">Elegí un club…</option>
          {favorites.map(([group, entries]) => (
            <optgroup key={group} label={group}>
              {entries.map((entry) => (
                <option key={entry.id} value={entry.name}>{entry.name}</option>
              ))}
            </optgroup>
          ))}
        </Select>
        <div className="inline-hint">Se puede cambiar libremente, sin confirmación.</div>
      </Field>

      <Field label="Nombre de usuario">
        <TextInput value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        <div className="inline-hint">Entre 3 y 20 caracteres (letras, números, _ o -). Si lo cambiás, usalo al iniciar sesión.</div>
      </Field>

      <Field label="Nueva contraseña (opcional)">
        <div className="password-row">
          <TextInput
            type={show ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            autoComplete="new-password"
          />
          <Button type="button" size="sm" variant="ghost" onClick={() => setShow((v) => !v)}>
            {show ? 'Ocultar' : 'Ver'}
          </Button>
        </div>
      </Field>

      {needsVerification && (
        <Field label="Contraseña actual">
          <TextInput
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Para confirmar los cambios"
            autoComplete="current-password"
          />
        </Field>
      )}
    </Modal>
  )
}