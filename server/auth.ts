import { Router } from 'express'
import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import type { NextFunction, Request, Response } from 'express'
import { getDb, newServerId } from './db.js'
import { configNumber } from './env.js'

export const COOKIE_NAME = 'pid_sid'

export interface UserRow {
  id: string
  username: string
  password_hash: string
  full_name: string
  favorite_club: string
  created_at: string
  role: string
}

export interface PublicUser {
  username: string
  fullName: string
  favoriteClub: string
  role: 'user' | 'admin'
}

export interface AuthedRequest extends Request {
  authUser?: UserRow
}

const attempts = new Map<string, number[]>()

function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= limit) {
    attempts.set(key, recent)
    return true
  }
  recent.push(now)
  attempts.set(key, recent)
  return false
}

export function publicUser(row: UserRow): PublicUser {
  return {
    username: row.username,
    fullName: row.full_name,
    favoriteClub: row.favorite_club,
    role: row.role === 'admin' ? 'admin' : 'user'
  }
}

export function isAdminUser(row: UserRow): boolean {
  return row.role === 'admin'
}

export function isProd(): boolean {
  return process.env.NODE_ENV === 'production'
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd(),
    path: '/',
    maxAge: configNumber('SESSIONS_DAYS', 30) * 24 * 60 * 60 * 1000
  })
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'lax', secure: isProd(), path: '/' })
}

export function createSession(userId: string): string {
  const token = randomBytes(32).toString('hex')
  const expiresAt = Date.now() + configNumber('SESSIONS_DAYS', 30) * 24 * 60 * 60 * 1000
  getDb()
    .prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .run(token, userId, expiresAt)
  return token
}

export function deleteSession(token: string): void {
  getDb().prepare('DELETE FROM sessions WHERE token = ?').run(token)
}

export function sessionUser(token: string | undefined): UserRow | null {
  if (!token) return null
  const db = getDb()
  const row = db
    .prepare(
      'SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?'
    )
    .get(token, Date.now()) as UserRow | undefined
  if (!row) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
    return null
  }
  return row
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = (req as Request & { cookies?: Record<string, string> }).cookies?.[COOKIE_NAME]
  const user = sessionUser(token)
  if (!user) {
    res.status(401).json({ error: 'Debés iniciar sesión.' })
    return
  }
  ;(req as AuthedRequest).authUser = user
  next()
}

function validUsername(username: string): boolean {
  return /^[a-z0-9_-]{3,20}$/.test(username)
}

export const authRouter = Router()

authRouter.get('/config', (_req, res) => {
  res.json({ requiresCode: Boolean(process.env.REGISTER_CODE) })
})

authRouter.post('/register', (req, res) => {
  if (isRateLimited(`register:${req.ip}`, 10, 15 * 60 * 1000)) {
    res.status(429).json({ error: 'Demasiados intentos. Probá en unos minutos.' })
    return
  }
  const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : ''
  const username = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  const favoriteClub = typeof req.body?.favoriteClub === 'string' ? req.body.favoriteClub.trim() : ''

  if (fullName.length < 2) {
    res.status(400).json({ error: 'Ingresá tu nombre.' })
    return
  }
  if (!validUsername(username)) {
    res
      .status(400)
      .json({ error: 'El nombre de usuario debe tener entre 3 y 20 caracteres (letras, números, _ o -).' })
    return
  }
  if (password.length < 6) {
    res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' })
    return
  }
  if (!favoriteClub) {
    res.status(400).json({ error: 'Elegí de qué club sos hincha.' })
    return
  }

  const registerCode = process.env.REGISTER_CODE
  if (registerCode && req.body?.code !== registerCode) {
    res.status(403).json({ error: 'El código de registro no es válido.' })
    return
  }

  const db = getDb()
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (exists) {
    res.status(409).json({ error: 'Ese nombre de usuario ya está en uso.' })
    return
  }

  const row: UserRow = {
    id: newServerId('u'),
    username,
    password_hash: bcrypt.hashSync(password, 12),
    full_name: fullName,
    favorite_club: favoriteClub,
    created_at: new Date().toISOString(),
    role: 'user'
  }
  db.prepare(
    'INSERT INTO users (id, username, password_hash, full_name, favorite_club, created_at, role) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(row.id, row.username, row.password_hash, row.full_name, row.favorite_club, row.created_at, row.role)

  const token = createSession(row.id)
  setSessionCookie(res, token)
  res.status(201).json({ user: publicUser(row) })
})

authRouter.post('/login', (req, res) => {
  if (isRateLimited(`login:${req.ip}`, 10, 15 * 60 * 1000)) {
    res.status(429).json({ error: 'Demasiados intentos. Probá en unos minutos.' })
    return
  }
  const username = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''

  const row = getDb()
    .prepare('SELECT * FROM users WHERE username = ?')
    .get(username) as UserRow | undefined
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    res.status(401).json({ error: 'Usuario o contraseña incorrectos.' })
    return
  }

  const token = createSession(row.id)
  setSessionCookie(res, token)
  res.json({ user: publicUser(row) })
})

authRouter.post('/logout', (req, res) => {
  const token = (req as Request & { cookies?: Record<string, string> }).cookies?.[COOKIE_NAME]
  if (token) {
    deleteSession(token)
    clearSessionCookie(res)
  }
  res.status(204).end()
})

authRouter.get('/me', requireAuth, (req, res) => {
  const user = (req as AuthedRequest).authUser as UserRow
  res.json({ user: publicUser(user) })
})

authRouter.patch('/me', requireAuth, (req, res) => {
  const user = (req as AuthedRequest).authUser as UserRow
  const body = (req.body ?? {}) as Record<string, unknown>
  const favoriteClub = body.favoriteClub
  const username = body.username
  const password = body.password
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''

  const touchingCredentials = username !== undefined || password !== undefined
  if (touchingCredentials) {
    if (!currentPassword) {
      res.status(400).json({ error: 'Ingresá tu contraseña actual para confirmar los cambios.' })
      return
    }
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      res.status(403).json({ error: 'La contraseña actual no es correcta.' })
      return
    }
  }

  const db = getDb()
  let changed = false

  if (favoriteClub !== undefined) {
    const club = typeof favoriteClub === 'string' ? favoriteClub.trim() : ''
    if (!club) {
      res.status(400).json({ error: 'Elegí de qué club sos hincha.' })
      return
    }
    db.prepare('UPDATE users SET favorite_club = ? WHERE id = ?').run(club, user.id)
    user.favorite_club = club
    changed = true
  }

  if (username !== undefined) {
    const name = typeof username === 'string' ? username.trim().toLowerCase() : ''
    if (!validUsername(name)) {
      res
        .status(400)
        .json({ error: 'El nombre de usuario debe tener entre 3 y 20 caracteres (letras, números, _ o -).' })
      return
    }
    const taken = db.prepare('SELECT id FROM users WHERE username = ?').get(name) as { id: string } | undefined
    if (taken && taken.id !== user.id) {
      res.status(409).json({ error: 'Ese nombre de usuario ya está en uso.' })
      return
    }
    db.prepare('UPDATE users SET username = ? WHERE id = ?').run(name, user.id)
    user.username = name
    changed = true
  }

  if (password !== undefined) {
    const pass = typeof password === 'string' ? password : ''
    if (pass.length < 6) {
      res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' })
      return
    }
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(pass, 12), user.id)
    changed = true
  }

  if (!changed) {
    res.status(400).json({ error: 'No se recibió ningún dato para actualizar.' })
    return
  }

  res.json({ user: publicUser(user) })
})