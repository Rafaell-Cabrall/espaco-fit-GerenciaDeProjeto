# API — contratos da Sprint 1

Schemas em [`packages/shared/src/index.ts`](../../packages/shared/src/index.ts). O app importa de `@espacofit/shared` e não redeclara tipos.
Campos, textos e formatos seguem o Figma do aluno (V1). As telas do instrutor ainda não existem: as rotas de escrita da ficha seguem o RF06/RF07 e são usadas via Insomnia/Bruno na demo.

## Convenções

- Toda rota, exceto `/auth/*` e `/health`, exige `Authorization: Bearer <accessToken>`.
- Erro: `{ "error": "mensagem" }`. Validação acrescenta `issues` do zod. Status: `400` dados inválidos, `401` sem sessão, `403` sem perfil ou sem vínculo, `404` não encontrado, `409` conflito, `422` regra de negócio.
- Datas em ISO 8601 UTC. Cargas em kg como `number`. `null` significa ausência de valor, nunca erro.
- "Vínculo" = o instrutor só acessa aluno com vínculo ativo. Aluno só acessa a si mesmo. Admin acessa tudo.

## Rotas

| Método e rota | Quem | Body | Resposta | Tela |
|---|---|---|---|---|
| `POST /auth/verify-reset-code` | público | `verifyResetCodeSchema` | `204` ou `400` | Verifique seu e-mail |
| `POST /auth/forgot-password` | público | `forgotPasswordSchema` | `204` | Esqueci minha senha, Reenviar código |
| `POST /auth/reset-password` | público | `resetPasswordSchema` | `204` ou `400` | Criar nova senha |
| `GET /anamnesis/:studentId` | vínculo | — | `anamnesisSchema` ou `null` | Primeiro acesso, Evolução > Anamnese |
| `PUT /anamnesis/:studentId` | o próprio aluno | `anamnesisInputSchema` | `anamnesisSchema` | Anamnese, Atualizar Anamnese |
| `GET /plans/student/:studentId` | vínculo | — | `planSchema` ou `null` | Home (treino do dia), Meus Treinos |
| `GET /plans/:id` | instrutor autor, admin | — | `planSchema` | ficha em rascunho |
| `POST /plans` | instrutor com vínculo | `createPlanSchema` | `201` `planSchema` (DRAFT) | montar ficha |
| `PUT /plans/:id` | instrutor autor | `updatePlanSchema` | `planSchema` | editar ficha |
| `POST /plans/:id/publish` | instrutor autor | — | `planSchema`; `409` sem anamnese | publicar ficha |
| `GET /plans/templates` | instrutor | — | `templateSchema[]` | modelos |
| `POST /plans/templates` | instrutor | `createTemplateSchema` | `201` `templateSchema` | salvar como modelo |
| `GET /exercises` | instrutor, admin | — | `exerciseSchema[]` | biblioteca |
| `POST /sessions` | aluno | `startSessionSchema` | `201` `sessionSchema` | Iniciar |
| `PUT /sessions/:id/sets` | aluno dono | `setLogInputSchema` | `setLogSchema` | concluir série, carga |
| `DELETE /sessions/:id/sets/:divisionExerciseId/:setNumber` | aluno dono | — | `204` | desmarcar série |
| `POST /sessions/:id/finish` | aluno dono | `finishSessionSchema` | `sessionSchema`; `422` sem série | Finalizar Treino |
| `POST /users` | admin | `createUserSchema` | `201` `userSchema` | — |
| `GET /users?role=` | admin | — | `userSchema[]` | — |
| `POST /links` | admin | `createLinkSchema` | `201` `linkSchema` | — |
| `GET /links` | admin, instrutor | — | `linkSchema[]` ativos | lista de alunos (Sprint 2) |

## Regras que a API calcula

- **Treino do dia**: `todayDivisionId` é a divisão seguinte à do último treino finalizado, na ordem A→B→C, voltando ao início. Sem histórico, é a primeira. O aluno pode iniciar qualquer outra aba.
- **Tempo estimado**: `estimatedMinutes` soma, por exercício, `séries × (40 s + descanso)`, arredondado para cima.
- **Publicar ficha**: exige anamnese respondida. Publicar uma ficha nova expira a ativa anterior.
- **Ficha e anamnese vencidas**: `outdated` fica `true` após 60 dias sem atualização.
- **Treino realizado**: finalizar exige ao menos uma série registrada.
- **Offline**: `POST /sessions` aceita `id` gerado no app e `PUT /sessions/:id/sets` é idempotente. A fila de sincronização pode reenviar sem duplicar.

## Fora desta sprint

Feedback de esforço, frequência e streak entram na Sprint 2. Feed, contrato e financeiro da Home entram nas Sprints 3 e 4. Cada um ganha schema aqui antes de o front começar.
