import type { LeaguePromotion } from '@/domain/types'
import type { CatalogEntry } from '@/data/catalog-types'

export interface SeedZone {
  id: string
  label: string
}

export interface SeedClub {
  name: string
  shortName?: string
  barrio?: string
  localidad?: string
  provincia?: string
  zoneId?: string
}

export interface SeedLeague {
  name: string
  level: number
  division: string
  tournamentName: string
  promotion: LeaguePromotion
  zones?: SeedZone[]
  clubs: SeedClub[]
}

export const SEED_NAME = 'Fútbol Argentino 2026'

export const SEED_LEAGUES: SeedLeague[] = [
  {
    name: 'Primera División',
    level: 1,
    division: 'Primera División',
    tournamentName: 'Torneo 2026',
    promotion: { promoteCount: 2, relegationCount: 2 },
    clubs: [
      { name: 'River Plate', shortName: 'RIV', barrio: 'Núñez', localidad: 'Buenos Aires', provincia: 'CABA' },
      { name: 'Boca Juniors', shortName: 'BOC', barrio: 'La Boca', localidad: 'Buenos Aires', provincia: 'CABA' },
      { name: 'Racing Club', shortName: 'RAC', localidad: 'Avellaneda', provincia: 'Buenos Aires' },
      { name: 'Independiente', shortName: 'IND', localidad: 'Avellaneda', provincia: 'Buenos Aires' },
      { name: 'San Lorenzo', shortName: 'SLA', barrio: 'Bajo Flores', localidad: 'Buenos Aires', provincia: 'CABA' },
      { name: 'Vélez Sarsfield', shortName: 'VEL', barrio: 'Liniers', localidad: 'Buenos Aires', provincia: 'CABA' },
      { name: 'Estudiantes de La Plata', shortName: 'EST', localidad: 'La Plata', provincia: 'Buenos Aires' },
      { name: 'Gimnasia de La Plata', shortName: 'GIM', localidad: 'La Plata', provincia: 'Buenos Aires' },
      { name: 'Huracán', shortName: 'HUR', barrio: 'Parque Patricios', localidad: 'Buenos Aires', provincia: 'CABA' },
      { name: 'Lanús', shortName: 'LAN', barrio: 'Lanús Este', localidad: 'Lanús', provincia: 'Buenos Aires' },
      { name: 'Argentinos Juniors', shortName: 'ARG', barrio: 'La Paternal', localidad: 'Buenos Aires', provincia: 'CABA' },
      { name: 'Newell\u2019s Old Boys', shortName: 'NOB', barrio: 'Parque Independencia', localidad: 'Rosario', provincia: 'Santa Fe' },
      { name: 'Rosario Central', shortName: 'ROS', barrio: 'Arroyito', localidad: 'Rosario', provincia: 'Santa Fe' },
      { name: 'Banfield', shortName: 'BAN', localidad: 'Banfield', provincia: 'Buenos Aires' },
      { name: 'Tigre', shortName: 'TIG', localidad: 'Victoria', provincia: 'Buenos Aires' },
      { name: 'Platense', shortName: 'PLA', localidad: 'Florida', provincia: 'Buenos Aires' },
      { name: 'Sarmiento', shortName: 'SAR', localidad: 'Junín', provincia: 'Buenos Aires' },
      { name: 'Talleres', shortName: 'TAL', localidad: 'Córdoba', provincia: 'Córdoba' },
      { name: 'Belgrano', shortName: 'BRG', localidad: 'Córdoba', provincia: 'Córdoba' },
      { name: 'Atlético Tucumán', shortName: 'ATU', localidad: 'San Miguel de Tucumán', provincia: 'Tucumán' },
      { name: 'Unión', shortName: 'UNI', localidad: 'Santa Fe', provincia: 'Santa Fe' },
      { name: 'Central Córdoba', shortName: 'CCS', localidad: 'Santiago del Estero', provincia: 'Santiago del Estero' },
      { name: 'Defensa y Justicia', shortName: 'DEF', localidad: 'Florencio Varela', provincia: 'Buenos Aires' },
      { name: 'Deportivo Riestra', shortName: 'RIE', barrio: 'Villa Soldati', localidad: 'Buenos Aires', provincia: 'CABA' },
      { name: 'Barracas Central', shortName: 'BAR', barrio: 'Barracas', localidad: 'Buenos Aires', provincia: 'CABA' },
      { name: 'Instituto', shortName: 'INS', localidad: 'Córdoba', provincia: 'Córdoba' },
      { name: 'Independiente Rivadavia', shortName: 'IRV', localidad: 'Mendoza', provincia: 'Mendoza' },
      { name: 'Gimnasia y Esgrima de Mendoza', shortName: 'GME', localidad: 'Mendoza', provincia: 'Mendoza' },
      { name: 'Aldosivi', shortName: 'ALD', localidad: 'Mar del Plata', provincia: 'Buenos Aires' },
      { name: 'Asociación Atlética Estudiantes', shortName: 'AAE', localidad: 'Río Cuarto', provincia: 'Córdoba' }
    ]
  },
  {
    name: 'Primera Nacional',
    level: 2,
    division: 'Primera Nacional',
    tournamentName: 'Campeonato 2026',
    promotion: { promoteCount: 2, relegationCount: 4 },
    zones: [
      { id: 'za', label: 'Zona A' },
      { id: 'zb', label: 'Zona B' }
    ],
    clubs: [
      { name: 'All Boys', shortName: 'ALL', barrio: 'Floresta', localidad: 'Buenos Aires', provincia: 'CABA', zoneId: 'za' },
      { name: 'Ferro Carril Oeste', shortName: 'FER', barrio: 'Caballito', localidad: 'Buenos Aires', provincia: 'CABA', zoneId: 'za' },
      { name: 'Deportivo Madryn', shortName: 'MAD', localidad: 'Puerto Madryn', provincia: 'Chubut', zoneId: 'za' },
      { name: 'Chaco For Ever', shortName: 'CFE', localidad: 'Resistencia', provincia: 'Chaco', zoneId: 'za' },
      { name: 'Deportivo Morón', shortName: 'MOR', localidad: 'Morón', provincia: 'Buenos Aires', zoneId: 'za' },
      { name: 'Estudiantes', shortName: 'ESC', localidad: 'Caseros', provincia: 'Buenos Aires', zoneId: 'za' },
      { name: 'Racing', shortName: 'RCA', localidad: 'Córdoba', provincia: 'Córdoba', zoneId: 'za' },
      { name: 'Los Andes', shortName: 'LOA', localidad: 'Lomas de Zamora', provincia: 'Buenos Aires', zoneId: 'za' },
      { name: 'Mitre', shortName: 'MIT', localidad: 'Santiago del Estero', provincia: 'Santiago del Estero', zoneId: 'za' },
      { name: 'Almirante Brown', shortName: 'ALM', localidad: 'San Justo', provincia: 'Buenos Aires', zoneId: 'za' },
      { name: 'Ciudad de Bolívar', shortName: 'BOL', localidad: 'San Carlos de Bolívar', provincia: 'Buenos Aires', zoneId: 'za' },
      { name: 'Colón', shortName: 'COL', localidad: 'Santa Fe', provincia: 'Santa Fe', zoneId: 'za' },
      { name: 'Central Norte', shortName: 'CNR', localidad: 'Salta', provincia: 'Salta', zoneId: 'za' },
      { name: 'Godoy Cruz', shortName: 'GC', localidad: 'Godoy Cruz', provincia: 'Mendoza', zoneId: 'za' },
      { name: 'San Telmo', shortName: 'STE', barrio: 'San Telmo', localidad: 'Buenos Aires', provincia: 'CABA', zoneId: 'za' },
      { name: 'San Miguel', shortName: 'SMG', localidad: 'San Miguel', provincia: 'Buenos Aires', zoneId: 'za' },
      { name: 'Defensores de Belgrano', shortName: 'DFB', barrio: 'Núñez', localidad: 'Buenos Aires', provincia: 'CABA', zoneId: 'za' },
      { name: 'Acassuso', shortName: 'ACA', localidad: 'Boulogne', provincia: 'Buenos Aires', zoneId: 'za' },
      { name: 'Nueva Chicago', shortName: 'CHI', barrio: 'Mataderos', localidad: 'Buenos Aires', provincia: 'CABA', zoneId: 'zb' },
      { name: 'Chacarita Juniors', shortName: 'CHA', barrio: 'Villa Maipú', localidad: 'San Martín', provincia: 'Buenos Aires', zoneId: 'zb' },
      { name: 'Atlanta', shortName: 'ATL', barrio: 'Villa Crespo', localidad: 'Buenos Aires', provincia: 'CABA', zoneId: 'zb' },
      { name: 'San Martín', shortName: 'SMT', localidad: 'San Miguel de Tucumán', provincia: 'Tucumán', zoneId: 'zb' },
      { name: 'Gimnasia y Esgrima de Jujuy', shortName: 'GEJ', localidad: 'San Salvador de Jujuy', provincia: 'Jujuy', zoneId: 'zb' },
      { name: 'Almagro', shortName: 'ALG', localidad: 'Tres de Febrero', provincia: 'Buenos Aires', zoneId: 'zb' },
      { name: 'San Martín', shortName: 'SMS', localidad: 'San Juan', provincia: 'San Juan', zoneId: 'zb' },
      { name: 'Temperley', shortName: 'TEM', localidad: 'Temperley', provincia: 'Buenos Aires', zoneId: 'zb' },
      { name: 'Güemes', shortName: 'GUE', localidad: 'Santiago del Estero', provincia: 'Santiago del Estero', zoneId: 'zb' },
      { name: 'Tristán Suárez', shortName: 'TSU', localidad: 'Tristán Suárez', provincia: 'Buenos Aires', zoneId: 'zb' },
      { name: 'Agropecuario', shortName: 'AGR', localidad: 'Carlos Casares', provincia: 'Buenos Aires', zoneId: 'zb' },
      { name: 'Patronato', shortName: 'PAT', localidad: 'Paraná', provincia: 'Entre Ríos', zoneId: 'zb' },
      { name: 'Gimnasia y Tiro', shortName: 'GYT', localidad: 'Salta', provincia: 'Salta', zoneId: 'zb' },
      { name: 'Deportivo Maipú', shortName: 'MAI', localidad: 'Maipú', provincia: 'Mendoza', zoneId: 'zb' },
      { name: 'Quilmes', shortName: 'QUI', localidad: 'Quilmes', provincia: 'Buenos Aires', zoneId: 'zb' },
      { name: 'Colegiales', shortName: 'CGE', barrio: 'Munro', localidad: 'Vicente López', provincia: 'Buenos Aires', zoneId: 'zb' },
      { name: 'Atlético de Rafaela', shortName: 'RFA', localidad: 'Rafaela', provincia: 'Santa Fe', zoneId: 'zb' },
      { name: 'Ferrocarril Midland', shortName: 'MID', localidad: 'Libertad', provincia: 'Buenos Aires', zoneId: 'zb' }
    ]
  }
]

export const SEED_CATALOG_EXTRA: Array<{ division: string; clubs: SeedClub[] }> = [
  {
    division: 'Primera B',
    clubs: [
      { name: 'Argentino de Merlo', localidad: 'Merlo', provincia: 'Buenos Aires' },
      { name: 'Argentino de Quilmes', localidad: 'Quilmes', provincia: 'Buenos Aires' },
      { name: 'Arsenal', barrio: 'Sarandí', localidad: 'Avellaneda', provincia: 'Buenos Aires' },
      { name: 'Brown de Adrogué', localidad: 'Adrogué', provincia: 'Buenos Aires' },
      { name: 'Comunicaciones', barrio: 'Agronomía', localidad: 'Buenos Aires', provincia: 'CABA' },
      { name: 'Defensores Unidos', localidad: 'Zárate', provincia: 'Buenos Aires' },
      { name: 'Deportivo Armenio', localidad: 'Ingeniero Maschwitz', provincia: 'Buenos Aires' },
      { name: 'Deportivo Camioneros', localidad: '9 de Abril', provincia: 'Buenos Aires' },
      { name: 'Deportivo Laferrere', localidad: 'Laferrere', provincia: 'Buenos Aires' },
      { name: 'Deportivo Merlo', localidad: 'Parque San Martín', provincia: 'Buenos Aires' },
      { name: 'Dock Sud', barrio: 'Dock Sud', localidad: 'Avellaneda', provincia: 'Buenos Aires' },
      { name: 'Excursionistas', barrio: 'Belgrano', localidad: 'Buenos Aires', provincia: 'CABA' },
      { name: 'Flandria', localidad: 'Jáuregui', provincia: 'Buenos Aires' },
      { name: 'Ituzaingó', localidad: 'Ituzaingó', provincia: 'Buenos Aires' },
      { name: 'Liniers', localidad: 'San Justo', provincia: 'Buenos Aires' },
      { name: 'Real Pilar', localidad: 'Pilar', provincia: 'Buenos Aires' },
      { name: 'San Martín (Burzaco)', localidad: 'Burzaco', provincia: 'Buenos Aires' },
      { name: 'Sportivo Italiano', localidad: 'Ciudad Evita', provincia: 'Buenos Aires' },
      { name: 'Talleres (Remedios de Escalada)', localidad: 'Remedios de Escalada', provincia: 'Buenos Aires' },
      { name: 'UAI Urquiza', localidad: 'Villa Lynch', provincia: 'Buenos Aires' },
      { name: 'Villa Dálmine', localidad: 'Campana', provincia: 'Buenos Aires' },
      { name: 'Villa San Carlos', localidad: 'Berisso', provincia: 'Buenos Aires' }
    ]
  },
  {
    division: 'Torneo Federal A',
    clubs: [
      { name: '9 de Julio', localidad: 'Rafaela', provincia: 'Santa Fe' },
      { name: 'Defensores de Belgrano (Villa Ramallo)', localidad: 'Villa Ramallo', provincia: 'Buenos Aires' },
      { name: 'Douglas Haig', localidad: 'Pergamino', provincia: 'Buenos Aires' },
      { name: 'El Linqueño', localidad: 'Lincoln', provincia: 'Buenos Aires' },
      { name: 'Escobar FC', localidad: 'Ingeniero Maschwitz', provincia: 'Buenos Aires' },
      { name: 'Gimnasia y Esgrima (Chivilcoy)', localidad: 'Chivilcoy', provincia: 'Buenos Aires' },
      { name: 'Gimnasia y Esgrima (Concepción del Uruguay)', localidad: 'Concepción del Uruguay', provincia: 'Entre Ríos' },
      { name: 'Independiente (Chivilcoy)', localidad: 'Chivilcoy', provincia: 'Buenos Aires' },
      { name: 'Sportivo Belgrano', localidad: 'San Francisco', provincia: 'Córdoba' },
      { name: 'Sportivo Las Parejas', localidad: 'Las Parejas', provincia: 'Santa Fe' },
      { name: 'Bartolomé Mitre', localidad: 'Posadas', provincia: 'Misiones' },
      { name: 'Boca Unidos', localidad: 'Corrientes', provincia: 'Corrientes' },
      { name: 'Defensores (Puerto Vilelas)', localidad: 'Puerto Vilelas', provincia: 'Chaco' },
      { name: 'Juventud Antoniana', localidad: 'Salta', provincia: 'Salta' },
      { name: 'San Martín (Formosa)', localidad: 'Formosa', provincia: 'Formosa' },
      { name: 'Sarmiento (La Banda)', localidad: 'La Banda', provincia: 'Santiago del Estero' },
      { name: 'Sarmiento (Resistencia)', localidad: 'Resistencia', provincia: 'Chaco' },
      { name: 'Sol de América', localidad: 'Formosa', provincia: 'Formosa' },
      { name: 'Tucumán Central', localidad: 'San Miguel de Tucumán', provincia: 'Tucumán' },
      { name: 'Atlético San Martín', localidad: 'San Martín', provincia: 'Mendoza' },
      { name: 'Atenas', localidad: 'Río Cuarto', provincia: 'Córdoba' },
      { name: 'Costa Brava', localidad: 'General Pico', provincia: 'La Pampa' },
      { name: 'Deportivo Argentino', localidad: 'Monte Maíz', provincia: 'Córdoba' },
      { name: 'Deportivo Rincón', localidad: 'Rincón de los Sauces', provincia: 'Neuquén' },
      { name: 'FADEP', localidad: 'Russell', provincia: 'Mendoza' },
      { name: 'Huracán Las Heras', localidad: 'Las Heras', provincia: 'Mendoza' },
      { name: 'Juventud Unida Universitario', localidad: 'San Luis', provincia: 'San Luis' },
      { name: 'Cipolletti', localidad: 'Cipolletti', provincia: 'Río Negro' },
      { name: 'Alvarado', localidad: 'Mar del Plata', provincia: 'Buenos Aires' },
      { name: 'Círculo Deportivo', localidad: 'Comandante Nicanor Otamendi', provincia: 'Buenos Aires' },
      { name: 'Germinal', localidad: 'Rawson', provincia: 'Chubut' },
      { name: 'Guillermo Brown', localidad: 'Puerto Madryn', provincia: 'Chubut' },
      { name: 'Kimberley', localidad: 'Mar del Plata', provincia: 'Buenos Aires' },
      { name: 'Olimpo', localidad: 'Bahía Blanca', provincia: 'Buenos Aires' },
      { name: 'Santamarina', localidad: 'Tandil', provincia: 'Buenos Aires' },
      { name: 'Sol de Mayo', localidad: 'Viedma', provincia: 'Río Negro' },
      { name: 'Villa Mitre', localidad: 'Bahía Blanca', provincia: 'Buenos Aires' }
    ]
  },
  {
    division: 'Primera C',
    clubs: [
      { name: 'Lugano', localidad: 'Tapiales', provincia: 'Buenos Aires' },
      { name: 'Berazategui', localidad: 'Berazategui', provincia: 'Buenos Aires' },
      { name: 'Centro Español', localidad: 'Villa Sarmiento', provincia: 'Buenos Aires' },
      { name: 'Estrella del Sur', localidad: 'Alejandro Korn', provincia: 'Buenos Aires' },
      { name: 'Juventud Unida', localidad: 'San Miguel', provincia: 'Buenos Aires' },
      { name: 'Puerto Nuevo', localidad: 'Campana', provincia: 'Buenos Aires' },
      { name: 'Victoriano Arenas', localidad: 'Valentín Alsina', provincia: 'Buenos Aires' },
      { name: 'Mercedes', localidad: 'Mercedes', provincia: 'Buenos Aires' },
      { name: 'Defensores de Cambaceres', localidad: 'Ensenada', provincia: 'Buenos Aires' },
      { name: 'J.J. de Urquiza', localidad: 'Loma Hermosa', provincia: 'Buenos Aires' },
      { name: 'Deportivo Paraguayo', localidad: 'González Catán', provincia: 'Buenos Aires' },
      { name: 'Leandro N. Alem', localidad: 'General Rodríguez', provincia: 'Buenos Aires' },
      { name: 'Argentino de Rosario', localidad: 'Rosario', provincia: 'Santa Fe' },
      { name: 'Luján', localidad: 'Luján', provincia: 'Buenos Aires' },
      { name: 'Cañuelas', localidad: 'Cañuelas', provincia: 'Buenos Aires' },
      { name: 'Leones de Rosario', localidad: 'Rosario', provincia: 'Santa Fe' },
      { name: 'Deportivo Español', localidad: 'Buenos Aires', provincia: 'CABA' },
      { name: 'Central Córdoba (Rosario)', localidad: 'Rosario', provincia: 'Santa Fe' },
      { name: 'Sportivo Barracas', barrio: 'Barracas', localidad: 'Buenos Aires', provincia: 'CABA' },
      { name: 'Yupanqui', localidad: 'Ciudad Evita', provincia: 'Buenos Aires' },
      { name: 'General Lamadrid', barrio: 'Villa Devoto', localidad: 'Buenos Aires', provincia: 'CABA' },
      { name: 'El Porvenir', localidad: 'Gerli', provincia: 'Buenos Aires' },
      { name: 'Atlas', localidad: 'General Rodríguez', provincia: 'Buenos Aires' },
      { name: 'Central Ballester', localidad: 'José León Suárez', provincia: 'Buenos Aires' },
      { name: 'Claypole', localidad: 'Claypole', provincia: 'Buenos Aires' },
      { name: 'Fénix', localidad: 'Buenos Aires', provincia: 'CABA' },
      { name: 'Muñiz', localidad: 'Muñiz', provincia: 'Buenos Aires' },
      { name: 'Sacachispas', barrio: 'Villa Soldati', localidad: 'Buenos Aires', provincia: 'CABA' }
    ]
  }
]

export function buildCatalogEntries(): CatalogEntry[] {
  const entries: CatalogEntry[] = []
  for (const league of SEED_LEAGUES) {
    for (const club of league.clubs) {
      entries.push({
        id: `cat_${slug(club.name)}_${entries.length}`,
        name: club.name,
        shortName: club.shortName,
        division: league.division,
        barrio: club.barrio,
        localidad: club.localidad,
        provincia: club.provincia
      })
    }
  }
  for (const extra of SEED_CATALOG_EXTRA) {
    for (const club of extra.clubs) {
      entries.push({
        id: `cat_${slug(club.name)}_${entries.length}`,
        name: club.name,
        shortName: club.shortName,
        division: extra.division,
        barrio: club.barrio,
        localidad: club.localidad,
        provincia: club.provincia
      })
    }
  }
  return entries
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}