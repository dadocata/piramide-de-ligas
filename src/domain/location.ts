export interface LocationParts {
  barrio?: string
  localidad?: string
  provincia?: string
}

export function formatLocation(loc: LocationParts | null | undefined): string {
  if (!loc) return ''
  return [loc.barrio, loc.localidad, loc.provincia].filter(Boolean).join(', ')
}