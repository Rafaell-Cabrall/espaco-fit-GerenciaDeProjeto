# Espaço Fit — PIES3

App mobile de gestão de academia (aluno, instrutor e administração). Monorepo com API Node, app Expo e contratos compartilhados.

```
apps/api        Node 24 + Express 5 + Prisma (PostgreSQL) + BullMQ (worker)
apps/mobile     Expo SDK 57 + Expo Router + TanStack Query
packages/shared schemas zod compartilhados (contrato da API)
docs/           requisitos, arquitetura, decisões, sprints, exports do Figma
```

## Rodando pela primeira vez

Pré-requisitos: Node 24 (`nvm use` lê o `.nvmrc`), Docker Desktop, app Expo Go no celular.

```bash
npm install
cp .env.example .env          # ajuste EXPO_PUBLIC_API_URL para o IP da sua máquina
docker compose up -d          # postgres :5433, redis :6380, minio :9000 (console :9001)
npm run db:migrate            # aplica migrações
npm run db:seed               # usuários de teste (senha Senha123): admin@espacofit.com, instrutor@espacofit.com, joao@email.com
```

Depois, em terminais separados:

```bash
npm run dev:api      # http://localhost:3000  (GET /health)
npm run dev:worker   # fila BullMQ (push, e-mail, rotinas diárias)
npm run dev:mobile   # QR code do Expo
```

## Comandos úteis

| Comando | O que faz |
|---|---|
| `npm run lint` / `npm run lint:fix` | Biome (lint + formatação) em todo o repo |
| `npm run typecheck` | `tsc` nos três pacotes |
| `npm -w apps/api test` | testes da API (`node --test`, precisa do Postgres, Redis e MinIO do compose) |
| `npm -w apps/api run prisma:studio` | UI do banco |
| `npm -w apps/api run prisma:migrate -- --name <nome>` | nova migração após editar `schema.prisma` |

## Fluxo de trabalho

- `main` protegida; trabalhe em `feat/<ru>-<descricao>` (ex.: `feat/ru01-fichas`) e abra PR.
- Sem CI: antes de abrir o PR, rode `npm run lint`, `npm run typecheck` e, se tocou no back, os testes da API. Squash merge.
- Contrato novo/alterado (request/response) entra em `packages/shared` antes do front e do back usarem.
- Módulos da API vivem em `apps/api/src/modules/<nome>/{router,service}.ts`. Os que ainda respondem 501 estão marcados com `TODO(sprint N)`.
- No app, `app/` só tem rotas finas; a tela fica em `apps/mobile/src/screens/<Nome>/`. Regras em [apps/mobile/src/README.md](apps/mobile/src/README.md).

Detalhes: [docs/decisoes.md](docs/decisoes.md) (por que cada escolha) e [docs/sprints.md](docs/sprints.md) (o que entra em cada sprint).
