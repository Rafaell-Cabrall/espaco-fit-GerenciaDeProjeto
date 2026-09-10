import { app } from './app.ts'
import { env } from './lib/env.ts'

app.listen(env.PORT, () => console.log(`API em http://localhost:${env.PORT}`))
