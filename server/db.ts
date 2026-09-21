import Database from 'better-sqlite3'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  favorite_club TEXT NOT NULL,
  created_at TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user'
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);

CREATE TABLE IF NOT EXISTS catalog (
  user_id TEXT PRIMARY KEY,
  entries TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS global_catalog (
  id TEXT PRIMARY KEY,
  entries TEXT NOT NULL DEFAULT '[]'
);
`

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db
  const file = process.env.DB_PATH
    ? resolve(process.cwd(), process.env.DB_PATH)
    : resolve(process.cwd(), 'data.db')
  db = new Database(file)
  db.pragma('journal_mode = WAL')
  db.exec(SCHEMA)
  migrate(db)
  return db
}

export function newServerId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${Date.now().toString(36)}${rand}`
}

export const GLOBAL_CATALOG_ID = 'catalog'

export function readGlobalCatalog(): unknown[] {
  const row = getDb().prepare('SELECT entries FROM global_catalog WHERE id = ?').get(GLOBAL_CATALOG_ID) as
    | { entries: string }
    | undefined
  if (!row) return []
  try {
    const entries = JSON.parse(row.entries)
    return Array.isArray(entries) ? entries : []
  } catch {
    return []
  }
}

export function writeGlobalCatalog(entries: unknown[]): void {
  getDb()
    .prepare('INSERT INTO global_catalog (id, entries) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET entries = excluded.entries')
    .run(GLOBAL_CATALOG_ID, JSON.stringify(entries))
}

function migrate(db: Database.Database): void {
  const userCols = db.pragma('table_info(users)') as Array<{ name: string }>
  if (!userCols.some((c) => c.name === 'role')) {
    db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'")
  }

  const globalCount = db.prepare('SELECT COUNT(*) AS n FROM global_catalog').get() as { n: number }
  if (globalCount.n === 0) seedGlobalCatalog(db)
}

function seedGlobalCatalog(db: Database.Database): void {
  const legacyRows = db.prepare('SELECT entries FROM catalog').all() as Array<{ entries: string }>
  let merged: RawEntry[] = []
  for (const row of legacyRows) {
    try {
      const parsed = JSON.parse(row.entries)
      if (Array.isArray(parsed)) merged.push(...(parsed as RawEntry[]))
    } catch {
      // fila de catálogo corrupta: se ignora
    }
  }
  merged = mergeCatalogEntries(merged)

  if (merged.length === 0) {
    const seedFile = resolve(process.cwd(), 'server/seed-catalog.json')
    if (existsSync(seedFile)) {
      try {
        const seed = JSON.parse(readFileSync(seedFile, 'utf8'))
        if (Array.isArray(seed)) merged = seed as RawEntry[]
      } catch {
        // sin seed disponible
      }
    }
  }

  writeGlobalCatalog(merged)
  db.exec('DROP TABLE IF EXISTS catalog')
}

type RawEntry = Record<string, unknown> & { name?: unknown; id?: unknown }

function entryNameKey(entry: RawEntry): string {
  return String(entry.name ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function entryHasCrest(entry: RawEntry): boolean {
  const direct = typeof entry.crestData === 'string' ? entry.crestData : ''
  if (direct.startsWith('data:')) return true
  const url = typeof entry.crestUrl === 'string' ? entry.crestUrl : ''
  return url.startsWith('data:')
}

function preferCrest(current: RawEntry, candidate: RawEntry): boolean {
  return !entryHasCrest(current) && entryHasCrest(candidate)
}

/** Une catálogos por usuario en uno solo: dedupe por id (y por nombre), priorizando entradas con escudo. */
export function mergeCatalogEntries(entries: RawEntry[]): RawEntry[] {
  const byId = new Map<string, RawEntry>()
  const byName = new Map<string, RawEntry>()
  const idNames = new Set<string>()

  for (const entry of entries) {
    if (typeof entry !== 'object' || entry === null) continue
    const key = entryNameKey(entry)
    if (!key) continue
    if (typeof entry.id === 'string' && entry.id) {
      const current = byId.get(entry.id)
      if (!current) {
        byId.set(entry.id, entry)
        idNames.add(key)
      } else if (preferCrest(current, entry)) {
        byId.set(entry.id, entry)
      }
    } else {
      const current = byName.get(key)
      if (!current) byName.set(key, entry)
      else if (preferCrest(current, entry)) byName.set(key, entry)
    }
  }

  const out: RawEntry[] = [...byId.values()]
  for (const [key, entry] of byName) {
    if (!idNames.has(key)) out.push(entry)
  }
  return out
}