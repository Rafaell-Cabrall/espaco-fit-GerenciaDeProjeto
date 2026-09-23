import { app } from './app.ts'
import { env } from './lib/env.ts'

// Express 5 chama este callback também quando o listen falha, com o erro no argumento. Ignorar o
// erro imprimia "API em ..." sem nada escutando. No Windows, EACCES costuma ser porta reservada
// pelo Hyper-V/WSL: `netsh interface ipv4 show excludedportrange protocol=tcp` lista as faixas.
app.listen(env.PORT, '0.0.0.0', (err) => {
  if (err) throw err
  console.log(`API em http://0.0.0.0:${env.PORT}`)
})
