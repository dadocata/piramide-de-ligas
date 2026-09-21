import bcrypt from 'bcryptjs'
import { loadEnv } from '../env.js'
import { getDb } from '../db.js'

loadEnv()

const username = process.argv[2]?.trim().toLowerCase()
const password = process.argv[3]

if (!username || !password) {
  console.error('Uso: npm run reset-password -- <usuario> <nueva contraseña>')
  process.exit(1)
}
if (password.length < 6) {
  console.error('La contraseña debe tener al menos 6 caracteres.')
  process.exit(1)
}

const row = getDb().prepare('SELECT id FROM users WHERE username = ?').get(username) as { id: string } | undefined
if (!row) {
  console.error(`No existe el usuario "${username}".`)
  process.exit(1)
}

getDb()
  .prepare('UPDATE users SET password_hash = ? WHERE id = ?')
  .run(bcrypt.hashSync(password, 12), row.id)
console.log(`Contraseña de "${username}" actualizada.`)