export interface CatalogEntry {
  id: string
  name: string
  shortName?: string
  division?: string
  barrio?: string
  localidad?: string
  provincia?: string
  crestData?: string
}

export interface StoredCatalogMeta {
  version: 1
  installedAt: string
  count: number
}