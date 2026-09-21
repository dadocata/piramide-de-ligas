export const DIVISION_ORDER = [
  'Primera División',
  'Primera Nacional',
  'Primera B',
  'Primera C',
  'Torneo Federal A'
] as const

function norm(value: string): string {
  return value.trim().toLowerCase()
}

export function sortDivisions(divisions: Iterable<string>): string[] {
  const index = new Map<string, number>()
  DIVISION_ORDER.forEach((d, i) => index.set(norm(d), i))

  const known: string[] = []
  const unknown: string[] = []
  for (const raw of divisions) {
    const value = raw.trim()
    if (!value) continue
    const bucket = index.has(norm(value)) ? known : unknown
    bucket.push(value)
  }

  known.sort((a, b) => (index.get(norm(a)) ?? 0) - (index.get(norm(b)) ?? 0))
  unknown.sort((a, b) => a.localeCompare(b, 'es'))
  return [...known, ...unknown]
}