import { PROJECT_VERSION, type Project } from '@/domain/types'
import { apiDelete, apiGet, apiPost, apiPut } from './api'
import { migrateProject } from './migrate'

export interface StoredProject {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  project: Project
}

export interface ProjectMeta {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface CreatedProject {
  id: string
  createdAt: string
  updatedAt: string
}

interface ProjectResponse extends ProjectMeta {
  project: Project
}

export async function createStoredProject(project: Project): Promise<CreatedProject> {
  return apiPost<CreatedProject>('/api/projects', { name: project.name, data: project })
}

export async function updateStoredProject(id: string, project: Project): Promise<string> {
  const res = await apiPut<{ updatedAt: string }>(`/api/projects/${id}`, {
    name: project.name,
    data: project
  })
  return res.updatedAt
}

export async function loadStoredProject(id: string): Promise<StoredProject | null> {
  const record = await apiGet<ProjectResponse>(`/api/projects/${id}`)
  if (!record) return null
  if (record.project.version !== PROJECT_VERSION) {
    record.project = migrateProject(record.project)
    await updateStoredProject(id, record.project)
  }
  return {
    id: record.id,
    name: record.name,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    project: record.project
  }
}

export async function listProjectMetas(): Promise<ProjectMeta[]> {
  return apiGet<ProjectMeta[]>('/api/projects')
}

export async function removeStoredProject(id: string): Promise<void> {
  await apiDelete<void>(`/api/projects/${id}`)
}