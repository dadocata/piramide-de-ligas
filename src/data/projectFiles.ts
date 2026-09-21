import type { Project } from '@/domain/types'
import { migrateProject } from './migrate'

const DOWNLOAD_PREFIX = 'piramide-'

export function exportProjectToFile(project: Project): void {
  const json = JSON.stringify(project, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${DOWNLOAD_PREFIX}${slug(project.name)}.json`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function projectFileError(message: string): Error {
  return new Error(message)
}

export async function fileToProject(file: File): Promise<Project> {
  const text = await file.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw projectFileError('El archivo no es un JSON válido de proyecto.')
  }
  const project = migrateProject(parsed)
  const isPlausible =
    Array.isArray(project.leagues) || Array.isArray(project.clubs)
  if (!isPlausible) {
    throw projectFileError('El archivo no tiene el formato de proyecto de Pirámide de Ligas.')
  }
  return project
}

function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'proyecto'
  )
}