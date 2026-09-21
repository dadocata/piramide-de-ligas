import bcrypt from 'bcryptjs'
import { getDb, newServerId } from './db.js'

function validUsername(username: string): boolean {
  return /^[a-z0-9_-]{3,20}$/.test(username)
}

/**
 * Garantiza la existencia del usuario administrador configurado por env vars:
 *   ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_FULL_NAME, ADMIN_FAVORITE_CLUB
 * Si el usuario ya existe, lo promueve a admin.
 */
export function ensureAdmin(): void {
  const username = process.env.ADMIN_USERNAME?.trim().toLowerCase() ?? ''
  if (!username) return

  const password = process.env.ADMIN_PASSWORD ?? ''
  if (!validUsername(username)) {
    console.warn('ADMIN_USERNAME inválido (3-20 caracteres: letras, números, _ o -). No se garantizó el admin.')
    return
  }
  if (password.length < 6) {
    console.warn('ADMIN_PASSWORD debe tener al menos 6 caracteres. No se garantizó el admin.')
    return
  }

  const db = getDb()
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username) as { id: string } | undefined

  if (existing) {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', existing.id)
    console.log(`Admin garantizado: "${username}" (ya existente, promovido).`)
    return
  }

  const fullName = process.env.ADMIN_FULL_NAME?.trim() || 'Administrador'
  const favoriteClub = process.env.ADMIN_FAVORITE_CLUB?.trim() || '—'
  const id = newServerId('u')
  const now = new Date().toISOString()
  db.prepare(
    'INSERT INTO users (id, username, password_hash, full_name, favorite_club, created_at, role) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, username, bcrypt.hashSync(password, 12), fullName, favoriteClub, now, 'admin')
  console.log(`Admin creado: "${username}".`)
}