export interface RosterRow {
  name: string
  position: string
  age: number
  number?: number
  nationality: string
  marketValue: number
}

export const ROSTERS: Record<string, RosterRow[]> = {
  'River Plate': [
    { name: 'Franco Germán Beltrán', position: 'Goalkeeper', age: 26, number: 41, nationality: 'Argentina', marketValue: 9000000 },
    { name: 'Franco Centurión', position: 'Goalkeeper', age: 23, number: 33, nationality: 'Argentina', marketValue: 1500000 },
    { name: 'Lautaro Rivero', position: 'Centre-Back', age: 23, number: 13, nationality: 'Argentina', marketValue: 7000000 },
    { name: 'Lucas Martínez Quarta', position: 'Centre-Back', age: 30, number: 28, nationality: 'Argentina', marketValue: 4500000 },
    { name: 'Tobías Ramírez', position: 'Centre-Back', age: 22, number: 2, nationality: 'Argentina', marketValue: 3500000 },
    { name: 'Federico Portillo', position: 'Centre-Back', age: 25, number: 5, nationality: 'Argentina', marketValue: 3200000 },
    { name: 'Nicolás Otamendi', position: 'Centre-Back', age: 38, number: 30, nationality: 'Argentina', marketValue: 1000000 },
    { name: 'Facundo González', position: 'Centre-Back', age: 21, number: 31, nationality: 'Argentina', marketValue: 75000 },
    { name: 'Rodrigo Ortega', position: 'Left-Back', age: 19, number: 3, nationality: 'Argentina', marketValue: 7000000 },
    { name: 'Matías Viña', position: 'Left-Back', age: 28, nationality: 'Uruguay', marketValue: 3500000 },
    { name: 'Marcos Acuña', position: 'Left-Back', age: 34, number: 21, nationality: 'Argentina', marketValue: 1000000 },
    { name: 'Gonzalo Montiel', position: 'Right-Back', age: 29, number: 29, nationality: 'Argentina', marketValue: 4500000 },
    { name: 'Agustín Bustos', position: 'Right-Back', age: 24, nationality: 'Argentina', marketValue: 2000000 },
    { name: 'Giovanni González', position: 'Right-Back', age: 32, number: 20, nationality: 'Uruguay', marketValue: 2000000 },
    { name: 'Aníbal Moreno', position: 'Defensive Midfield', age: 27, number: 6, nationality: 'Argentina', marketValue: 8000000 },
    { name: 'Fausto Vera', position: 'Defensive Midfield', age: 26, number: 15, nationality: 'Argentina', marketValue: 4500000 },
    { name: 'Lucas Silva', position: 'Defensive Midfield', age: 19, number: 44, nationality: 'Argentina', marketValue: 300000 },
    { name: 'Tobías Andrada', position: 'Central Midfield', age: 21, number: 50, nationality: 'Argentina', marketValue: 9000000 },
    { name: 'Rodrigo Arambarri', position: 'Central Midfield', age: 25, number: 8, nationality: 'Uruguay', marketValue: 8000000 },
    { name: 'Lautaro Pereyra', position: 'Central Midfield', age: 20, number: 25, nationality: 'Argentina', marketValue: 175000 },
    { name: 'Thiago Almada', position: 'Attacking Midfield', age: 25, number: 23, nationality: 'Argentina', marketValue: 20000000 },
    { name: 'Nahuel Galván', position: 'Attacking Midfield', age: 20, number: 26, nationality: 'Argentina', marketValue: 4000000 },
    { name: 'Juan Cruz Meza', position: 'Attacking Midfield', age: 17, number: 24, nationality: 'Argentina', marketValue: 1800000 },
    { name: 'Ángel Correa', position: 'Second Striker', age: 31, number: 10, nationality: 'Argentina', marketValue: 8000000 },
    { name: 'Lucas Beltrán', position: 'Centre-Forward', age: 25, number: 18, nationality: 'Argentina', marketValue: 8000000 },
    { name: 'Sebastián Driussi', position: 'Centre-Forward', age: 30, number: 9, nationality: 'Argentina', marketValue: 4500000 },
    { name: 'Rafael Santos Borré', position: 'Centre-Forward', age: 30, number: 19, nationality: 'Colombia', marketValue: 3500000 },
    { name: 'Agustín Ruberto', position: 'Centre-Forward', age: 20, number: 32, nationality: 'Argentina', marketValue: 1700000 }
  ]
}