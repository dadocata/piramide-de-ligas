import express from 'express'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { NextFunction, Request, Response } from 'express'
import { getDb, newServerId, readGlobalCatalog, writeGlobalCatalog } from './db.js'
import { AuthedRequest, authRouter, isAdminUser, requireAuth } from './auth.js'

interface ProjectRow {
  id: string
  user_id: string
  name: string
  created_at: string
  updated_at: string
  data: string
}

const userOf = (req: Request): string => (req as AuthedRequest).authUser!.id

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, (err?: unknown) => {
    if (err) return
    const user = (req as AuthedRequest).authUser!
    if (!isAdminUser(user)) {
      res.status(403).json({ error: 'Necesitás permisos de administrador.' })
      return
    }
    next()
  })
}

export function createApp(): express.Express {
  const app = express()
  app.set('trust proxy', 1)
  app.use(helmet({ contentSecurityPolicy: false }))
  app.use(express.json({ limit: '25mb' }))
  app.use(cookieParser())

  app.use('/api/auth', authRouter)

  const projects = express.Router()
  projects.use(requireAuth)
  projects.get('/', (req, res) => {
    const rows = getDb()
      .prepare('SELECT id, name, created_at, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC')
      .all(userOf(req)) as Pick<ProjectRow, 'id' | 'name' | 'created_at' | 'updated_at'>[]
    res.json(rows.map((r) => ({ id: r.id, name: r.name, createdAt: r.created_at, updatedAt: r.updated_at })))
  })
  projects.post('/', (req, res) => {
    const data = req.body?.data
    if (!data || typeof data !== 'object') {
      res.status(400).json({ error: 'Faltan los datos del proyecto.' })
      return
    }
    const name = typeof req.body?.name === 'string' && req.body.name.trim() ? req.body.name.trim() : 'Proyecto sin nombre'
    const id = newServerId('p')
    const now = new Date().toISOString()
    getDb()
      .prepare('INSERT INTO projects (id, user_id, name, created_at, updated_at, data) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, userOf(req), name, now, now, JSON.stringify(data))
    res.status(201).json({ id, createdAt: now, updatedAt: now })
  })
  projects.get('/:id', (req, res) => {
    const row = getDb()
      .prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
      .get(req.params.id, userOf(req)) as ProjectRow | undefined
    if (!row) {
      res.status(404).json({ error: 'No se encontró el proyecto.' })
      return
    }
    res.json({
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      project: JSON.parse(row.data)
    })
  })
  projects.put('/:id', (req, res) => {
    const data = req.body?.data
    if (!data || typeof data !== 'object') {
      res.status(400).json({ error: 'Faltan los datos del proyecto.' })
      return
    }
    const row = getDb()
      .prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?')
      .get(req.params.id, userOf(req)) as ProjectRow | undefined
    if (!row) {
      res.status(404).json({ error: 'No se encontró el proyecto.' })
      return
    }
    const name = typeof req.body?.name === 'string' && req.body.name.trim() ? req.body.name.trim() : row.name
    const updatedAt = new Date().toISOString()
    getDb()
      .prepare('UPDATE projects SET name = ?, updated_at = ?, data = ? WHERE id = ?')
      .run(name, updatedAt, JSON.stringify(data), row.id)
    res.json({ updatedAt })
  })
  projects.delete('/:id', (req, res) => {
    getDb().prepare('DELETE FROM projects WHERE id = ? AND user_id = ?').run(req.params.id, userOf(req))
    res.status(204).end()
  })
  app.use('/api/projects', projects)

  const catalog = express.Router()
  catalog.use(requireAuth)
  catalog.get('/', (_req, res) => {
    res.json({ entries: readGlobalCatalog() })
  })
  catalog.put('/', requireAdmin, (req, res) => {
    if (!Array.isArray(req.body?.entries)) {
      res.status(400).json({ error: 'Faltan los datos del catálogo.' })
      return
    }
    const submitted = req.body.entries as Array<{ id?: unknown }>
    const seen = new Set<string>()
    const deduped: unknown[] = []
    for (const entry of submitted) {
      if (typeof entry?.id === 'string') {
        if (seen.has(entry.id)) continue
        seen.add(entry.id)
      }
      deduped.push(entry)
    }
    writeGlobalCatalog(deduped)
    res.status(204).end()
  })
  app.use('/api/catalog', catalog)

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada.' })
  })

  const distDir = resolve(process.cwd(), 'dist')
  const indexFile = join(distDir, 'index.html')
  if (existsSync(indexFile)) {
    app.use(express.static(distDir))
    app.use((req, res, next) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        res.sendFile(indexFile)
        return
      }
      next()
    })
  }

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err)
    res.status(500).json({ error: 'Error interno del servidor.' })
  })

  return app
}