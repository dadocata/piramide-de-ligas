import { loadEnv, configNumber } from './env.js'
import { createApp } from './app.js'
import { ensureAdmin } from './admin.js'
import { seedUserData } from './seed.js'
import { getDb } from './db.js'

loadEnv()
const adminId = ensureAdmin()
seedUserData(getDb(), adminId)

const app = createApp()
const port = configNumber('PORT', 3000)

app.listen(port, () => {
  console.log(`Pirámide de Ligas servidor — http://localhost:${port}`)
})