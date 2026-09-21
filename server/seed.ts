import Database from 'better-sqlite3'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { newServerId, writeGlobalCatalog } from './db.js'

interface SeedProject {
  id?: unknown
  name?: unknown
  createdAt?: unknown
  updatedAt?: unknown
  project?: unknown
}

/**
 * Importa los datos del usuario (catálogo + proyectos) exportados con
 * `npm run export-seed` al arrancar con una base de datos vacía (caso Render free).
 * Solo actúa si la tabla projects está vacía, para no pisar datos existentes.
 */
export function seedUserData(db: Database.Database, userId: string | undefined): void {
  if (!userId) return
  const seedFile = resolve(process.cwd(), 'server/seed-user-data.json')
  if (!existsSync(seedFile)) return

  const empty = db.prepare('SELECT COUNT(*) AS n FROM projects').get() as { n: number }
  if (empty.n > 0) return

  let seed: unknown
  try {
    seed = JSON.parse(readFileSync(seedFile, 'utf8'))
  } catch {
    console.warn('seed-user-data.json inválido: no se importó.')
    return
  }
  if (typeof seed !== 'object' || seed === null) return

  const catalog = Array.isArray((seed as { catalog?: unknown }).catalog)
    ? (seed as { catalog: unknown[] }).catalog
    : []
  const projects = Array.isArray((seed as { projects?: unknown }).projects)
    ? (seed as { projects: SeedProject[] }).projects
    : []

  if (catalog.length > 0) {
    writeGlobalCatalog(catalog)
  }

  const insert = db.prepare(
    'INSERT INTO projects (id, user_id, name, created_at, updated_at, data) VALUES (?, ?, ?, ?, ?, ?)'
  )
  const now = new Date().toISOString()
  const importProjects = db.transaction(() => {
    let imported = 0
    for (const p of projects) {
      if (typeof p !== 'object' || p === null || typeof p.project !== 'object' || p.project === null) continue
      const id = typeof p.id === 'string' && p.id ? p.id : newServerId('p')
      const name = typeof p.name === 'string' && p.name.trim() ? p.name.trim() : 'Proyecto sin nombre'
      const createdAt = typeof p.createdAt === 'string' ? p.createdAt : now
      const updatedAt = typeof p.updatedAt === 'string' ? p.updatedAt : now
      insert.run(id, userId, name, createdAt, updatedAt, JSON.stringify(p.project))
      imported++
    }
    return imported
  })

  const imported = importProjects()
  console.log(`Seed de usuario: ${imported} proyecto(s) y ${catalog.length} entradas de catálogo.`)
}