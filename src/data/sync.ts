import type { Project } from '@/domain/types'
import { apiGet, apiPost } from './api'
import { dbClear, dbGetAll, STORE_PROJECTS } from './db'

interface LocalProjectRecord {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  project: Project
}

function syncFlag(username: string): string {
  return `piramide:synced:${username}`
}

async function readLocalProjects(): Promise<LocalProjectRecord[]> {
  return dbGetAll<LocalProjectRecord>(STORE_PROJECTS)
}

export async function hasSynced(username: string): Promise<boolean> {
  return localStorage.getItem(syncFlag(username)) === '1'
}

/**
 * Hace un push único de los proyectos guardados en el navegador (IndexedDB)
 * hacia el servidor, la primera vez que el usuario inicia sesión.
 */
export async function syncLocalToServer(username: string): Promise<void> {
  if (await hasSynced(username)) return

  const remoteProjects = await apiGet<Array<{ id: string }>>('/api/projects').catch(() => [])

  if (remoteProjects.length === 0) {
    const local = await readLocalProjects()
    for (const record of local) {
      await apiPost<{ id: string }>('/api/projects', {
        name: record.project.name,
        data: record.project
      })
    }
    await dbClear(STORE_PROJECTS)
  }

  localStorage.setItem(syncFlag(username), '1')
}

export function clearSyncFlag(username: string): void {
  localStorage.removeItem(syncFlag(username))
}