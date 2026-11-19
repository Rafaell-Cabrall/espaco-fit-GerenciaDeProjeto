# API do Espaço Fit

Backend do projeto: Node 24 + Express 5 + Prisma (PostgreSQL) + BullMQ (Redis). Escuta na porta 3000 e expõe `GET /health` para verificar se está no ar.

O contrato de cada rota (request, response e status) está em [`packages/shared`](../../packages/shared/src/index.ts) e documentado em [`docs/api/README.md`](../../docs/api/README.md). Este arquivo explica como o código está organizado e como rodar.

## Como rodar

Na raiz do monorepo, com Docker em pé e `.env` preenchido (ver [README raiz](../../README.md)):

| Comando | O que faz |
|---|---|
| `npm run dev:api` | API com `node --watch` na porta 3000 |
| `npm run dev:worker` | Worker BullMQ (e-mails, push e rotinas diárias) |
| `npm -w apps/api test` | Testes com `node --test` |
| `npm run typecheck` | Verificação de tipos |
| `npm run lint` | Biome (formato e lint) |
| `npm -w apps/api run prisma:migrate -- --name <nome>` | Cria migração |
| `npm -w apps/api run prisma:seed` | Popula a biblioteca de exercícios e usuários de teste |
| `npm -w apps/api run prisma:studio` | Interface do banco de dados |

A API e o worker leem o `.env` da raiz (`--env-file-if-exists=../../.env`).

### Variáveis de ambiente

Todas são validadas por zod em `src/lib/env.ts` no boot: a API não sobe com uma obrigatória faltando.

| Variável | Obrigatória | Padrão | Para que serve |
|---|---|---|---|
| `DATABASE_URL` | sim | — | PostgreSQL do Prisma |
| `REDIS_URL` | não | `redis://localhost:6379` | Filas BullMQ |
| `JWT_SECRET` | sim (mín. 16 caracteres) | — | Assinatura dos tokens de acesso e refresh |
| `PORT` | não | `3000` | Porta do servidor |
| `S3_ENDPOINT` / `S3_BUCKET` / `S3_REGION` / `S3_ACCESS_KEY` / `S3_SECRET_KEY` | não | MinIO local | Upload de GIF/vídeo dos exercícios |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `MAIL_FROM` | não | — | E-mail real; sem `SMTP_HOST` o worker só imprime no console |

## Estrutura

```
src/
  server.ts          sobe o HTTP (importa app)
  app.ts             express: CORS, JSON, montagem dos routers, errorHandler
  worker.ts          BullMQ: handlers de email/push e jobs agendados
  lib/               infraestrutura
  middlewares/       auth, requireRole, requireLink, hasActiveLink
  modules/<nome>/    router.ts (rotas) + service.ts (regras) + arquivos de domínio
test/                um arquivo por módulo
prisma/              schema.prisma, migrations/, seed.ts, media/ (GIFs do seed)
assets/              logo dos e-mails
```

- `lib/env.ts` — parse e validação das variáveis de ambiente.
- `lib/http.ts` — `HttpError` (erro de domínio com status), `validate(schema)` que troca `req.body` pelo valor tipado do zod e o `errorHandler` final.
- `lib/jwt.ts`, `lib/password.ts` — tokens e senha com `crypto.scrypt` (stdlib).
- `lib/mail.ts`, `lib/push.ts`, `lib/queue.ts` — e-mail, Expo Push e a única fila `jobs`, com job por nome.
- `lib/storage.ts` — MinIO/S3 com URL assinada; guarda o host da requisição.
- `lib/prisma.ts`, `lib/redis.ts` — clientes compartilhados.

### Módulos

Cada domínio fica em `src/modules/<nome>/`, com `router.ts` e `service.ts` (e arquivos extras de regra, como `billing/status.ts`, `sessions/frequency.ts`, `plans/outdated.ts`). O router só monta rota e chama o service; o service lança `HttpError`.

| Módulo | Responsabilidade | Quem acessa |
|---|---|---|
| `auth` | login, refresh, recuperação de senha, push-token, trocar senha logado | público e logado |
| `users` | criar usuário (convite), listar e ativar/desativar | admin; instrutor cria aluno |
| `links` | vínculo aluno ↔ instrutor (RU07) | admin e instrutor |
| `anamnesis` | anamnese, consentimento (RN09) e observações | aluno e instrutor com vínculo |
| `plans` | fichas, publicar, modelos da biblioteca, aviso de ficha/anamnese vencida (RN04) | aluno lê; instrutor monta; admin lê |
| `exercises` | biblioteca de exercícios com mídia | instrutor e admin |
| `sessions` | execução do treino, séries, finalizar, frequência e streak (RN03) | aluno treina; instrutor e admin leem com `?studentId=` |
| `feedbacks` | comentário por exercício e marcação de lido | instrutor |
| `measurements` | avaliação física e comparação | aluno lê as próprias; instrutor com vínculo |
| `appointments` | agenda de avaliações (grade de 20 em 20 min) | instrutor |
| `feed` | comunicados da academia com validade | todos leem; admin publica |
| `billing` | planos, mensalidade, pagamento manual e bloqueio (RN06, RN07) | admin; instrutor com vínculo registra pagamento |
| `checkin` | QR de check-in e validação na recepção (RU06) | ainda responde `501`, marcado com `TODO(sprint 5)` |

## Convenções

- **Contrato antes da rota**: schema novo ou alterado entra em `packages/shared` primeiro; router e app importam de `@espacofit/shared` e não redeclaram tipos.
- **Request = `z.input`, response = `z.infer`**, documentado no topo do `packages/shared/src/index.ts`.
- **Erro**: `{ "error": "mensagem" }`; validação zod acrescenta `issues`. Status: `400` dados inválidos, `401` sem sessão, `402` aluno bloqueado por mensalidade (RN07), `403` sem perfil ou sem vínculo, `404` não encontrado, `409` conflito, `422` regra de negócio, `429` muitas tentativas, `500` erro interno (log no console).
- **Sessão**: `auth` consulta o usuário a cada requisição, então desativação, logout e troca de senha valem na hora. `requireRole` protege por perfil, `requireLink`/`hasActiveLink` exigem vínculo ativo com o aluno.
- **Módulo pendente**: quem ainda responde `501` está identificado com `TODO(sprint N)` no próprio router.
- **Testes**: um arquivo por módulo em `test/`, com `node --test` e Postgres/Redis reais (o CI sobe os serviços).

## Documentação relacionada

- [Contratos e rotas](../../docs/api/README.md)
- [Coleção Bruno para a demo](../../docs/api/bruno/)
- [Decisões técnicas](../../docs/decisoes.md)
- [Planejamento das sprints](../../docs/sprints.md)
