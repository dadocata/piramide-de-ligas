import { loadEnv, configNumber } from './env.js'
import { createApp } from './app.js'
import { ensureAdmin } from './admin.js'

loadEnv()
ensureAdmin()

const app = createApp()
const port = configNumber('PORT', 3000)

app.listen(port, () => {
  console.log(`Pirámide de Ligas servidor — http://localhost:${port}`)
})