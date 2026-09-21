import type { CatalogEntry } from './catalog-types'
import { apiGet, apiPut } from './api'

export async function listCatalog(): Promise<CatalogEntry[]> {
  const res = await apiGet<{ entries: CatalogEntry[] }>('/api/catalog')
  const entries = Array.isArray(res?.entries) ? res.entries : []
  return entries.map(normalizeEntry).sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

export function normalizeEntry(entry: CatalogEntry): CatalogEntry {
  const next = { ...entry }
  const legacy = entry as unknown as Record<string, unknown>
  next.crestData = undefined
  if (typeof entry.crestData === 'string' && entry.crestData.startsWith('data:')) {
    next.crestData = entry.crestData
  } else if (typeof legacy.crestUrl === 'string' && legacy.crestUrl.startsWith('data:')) {
    next.crestData = legacy.crestUrl as string
  }
  delete legacy.crestUrl
  delete (next as Record<string, unknown>).crestUrl
  return next
}

async function saveAll(entries: CatalogEntry[]): Promise<void> {
  await apiPut<void>('/api/catalog', { entries })
}

export async function putCatalogEntry(entry: CatalogEntry): Promise<void> {
  const entries = await listCatalog()
  const index = entries.findIndex((e) => e.id === entry.id)
  if (index >= 0) entries[index] = entry
  else entries.push(entry)
  await saveAll(entries)
}

export async function removeCatalogEntry(id: string): Promise<void> {
  const entries = await listCatalog()
  await saveAll(entries.filter((e) => e.id !== id))
}