import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { apiErrorMessage, apiGet } from '@/data/api'
import { buildCatalogEntries } from '@/seed/afaLite'
import { Banner, Button, Field, Select, TextInput } from '@/components/ui'
import { APP_NAME } from '@/domain/constants'
import { sortDivisions } from '@/domain/divisions'

export function AuthView() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [favoriteClub, setFavoriteClub] = useState('')
  const [registerCode, setRegisterCode] = useState('')
  const [requiresCode, setRequiresCode] = useState(false)
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    apiGet<{ requiresCode: boolean }>('/api/auth/config')
      .then((data) => setRequiresCode(data.requiresCode))
      .catch(() => setRequiresCode(false))
  }, [])

  const clubGroups = useMemo(() => {
    const map = new Map<string, ReturnType<typeof buildCatalogEntries>>()
    for (const entry of buildCatalogEntries()) {
      const group = entry.division?.trim() || 'Otras categorías'
      if (!map.has(group)) map.set(group, [])
      map.get(group)?.push(entry)
    }
    const byKey = new Map([...map.entries()])
    return sortDivisions(map.keys()).map(
      (key): [string, ReturnType<typeof buildCatalogEntries>] => [key, byKey.get(key) ?? []]
    )
  }, [])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (mode === 'login') {
      if (!username.trim() || !password) {
        setError('Completá usuario y contraseña.')
        return
      }
      setBusy(true)
      try {
        await login(username.trim(), password)
      } catch (err) {
        setError(apiErrorMessage(err))
      } finally {
        setBusy(false)
      }
      return
    }

    if (fullName.trim().length < 2) setError('Ingresá tu nombre.')
    else if (username.trim().length < 3) setError('El nombre de usuario debe tener al menos 3 caracteres.')
    else if (password.length < 6) setError('La contraseña debe tener al menos 6 caracteres.')
    else if (!favoriteClub) setError('Elegí de qué club sos hincha.')
    else if (requiresCode && !registerCode.trim()) setError('Ingresá el código de registro.')
    else {
      setBusy(true)
      try {
        await register({
          fullName: fullName.trim(),
          username: username.trim(),
          password,
          favoriteClub,
          ...(requiresCode ? { code: registerCode.trim() } : {})
        })
      } catch (err) {
        setError(apiErrorMessage(err))
      } finally {
        setBusy(false)
      }
    }
  }

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={(e) => void submit(e)}>
        <h1 className="auth-title">{APP_NAME}</h1>
        <p className="muted" style={{ marginTop: 4, marginBottom: 18 }}>
          {mode === 'login'
            ? 'Iniciá sesión para armar tu pirámide de ligas.'
            : 'Creá tu cuenta para armar tu pirámide de ligas.'}
        </p>

        {mode === 'register' && (
          <Field label="Nombre">
            <TextInput value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ej: Martín" autoFocus />
          </Field>
        )}
        <Field label="Nombre de usuario">
          <TextInput
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="ej: martin_fan"
            autoComplete="username"
            autoFocus={mode === 'login'}
          />
        </Field>
        <Field label="Contraseña">
          <div className="password-row">
            <TextInput
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            <Button type="button" size="sm" variant="ghost" onClick={() => setShow((v) => !v)}>
              {show ? 'Ocultar' : 'Ver'}
            </Button>
          </div>
        </Field>
        {mode === 'register' && (
          <>
            <Field label="¿De qué club sos hincha?">
              <Select value={favoriteClub} onChange={(e) => setFavoriteClub(e.target.value)}>
                <option value="">Elegí un club…</option>
                {clubGroups.map(([group, entries]) => (
                  <optgroup key={group} label={group}>
                    {entries.map((entry) => (
                      <option key={entry.id} value={entry.name}>{entry.name}</option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>
            {requiresCode && (
              <Field label="Código de registro">
                <TextInput value={registerCode} onChange={(e) => setRegisterCode(e.target.value)} placeholder="Código" />
              </Field>
            )}
          </>
        )}

        {error && <Banner>{error}</Banner>}

        <Button variant="primary" size="lg" type="submit" disabled={busy} style={{ width: '100%', marginTop: 8 }}>
          {busy ? 'Un momento…' : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
        </Button>

        <div className="auth-switch">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setMode((m) => (m === 'login' ? 'register' : 'login'))
              setError(null)
            }}
          >
            {mode === 'login' ? '¿No tenés cuenta? Crear cuenta' : 'Ya tengo cuenta — Iniciar sesión'}
          </Button>
        </div>
      </form>
    </div>
  )
}