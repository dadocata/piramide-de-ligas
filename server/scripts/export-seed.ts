import Database from 'better-sqlite3'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

interface ProjectRow {
  id: string
  name: string
  created_at: string
  updated_at: string
  data: string
}

const source = process.env.SEED_SOURCE_DB
  ? resolve(process.cwd(), process.env.SEED_SOURCE_DB)
  : resolve(process.cwd(), 'data.db')
const output = resolve(process.cwd(), 'server/seed-user-data.json')

const db = new Database(source, { readonly: true })

const projectRows = db.prepare('SELECT id, name, created_at, updated_at, data FROM projects').all() as ProjectRow[]
const catalogRow = db.prepare("SELECT entries FROM global_catalog WHERE id = 'catalog'").get() as
  | { entries: string }
  | undefined

const projects: unknown[] = []
for (const row of projectRows) {
  try {
    const project = JSON.parse(row.data)
    if (typeof project !== 'object' || project === null) continue
    projects.push({
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      project
    })
  } catch {
    console.warn(`Proyecto "${row.name}" con data inválida: se omite.`)
  }
}

let catalog: unknown[] = []
if (catalogRow) {
  try {
    const parsed = JSON.parse(catalogRow.entries)
    if (Array.isArray(parsed)) catalog = parsed
  } catch {
    console.warn('Catálogo global con JSON inválido: se exporta vacío.')
  }
}

const seed = {
  version: 1,
  exportedAt: new Date().toISOString(),
  catalog,
  projects
}

writeFileSync(output, JSON.stringify(seed))

const bytes = Buffer.byteLength(JSON.stringify(seed))
console.log(`Exportados ${projects.length} proyecto(s) y ${catalog.length} entradas de catálogo.`)
console.log(`Escrito ${output} (~${(bytes / 1024 / 1024).toFixed(2)} MB).`)
db.close()