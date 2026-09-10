# Organização do app

`app/` só define rotas: cada arquivo importa uma tela de `src/screens` e a exporta. Nada de JSX em `app/`.

| Pasta | O que vai aqui |
|---|---|
| `screens/<Nome>/` | Uma tela: `index.tsx` (exporta `<Nome>Screen`), `styles.ts`, `components/` para partes usadas só nela |
| `design-system/` | `tokens.ts` (cores, espaçamentos, fontes do Figma) e `components/` base: Button, Input, Card, Text... |
| `components/` | Componentes compostos usados em mais de uma tela (ex.: card de exercício, cronômetro de descanso) |
| `hooks/` | Hooks de dados com TanStack Query (`usePlans`, `useSession`) em cima de `api/` |
| `api/` | `client.ts` (fetch + zod + refresh de token) e um arquivo por domínio (`plans.ts`, `sessions.ts`) |
| `auth.tsx` | Sessão do usuário logado: `useAuth()` com `user`, `login`, `logout` |

Tipos de request/response vêm de `@espacofit/shared`; não redeclarar no app.

Nova tela: criar `src/screens/X/index.tsx` + `styles.ts`, depois o arquivo de rota em `app/(<perfil>)/x.tsx` com duas linhas (import + export default).
