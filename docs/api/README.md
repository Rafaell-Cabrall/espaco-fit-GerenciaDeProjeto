# API — contratos da Sprint 1

Schemas em [`packages/shared/src/index.ts`](../../packages/shared/src/index.ts). O app importa de `@espacofit/shared` e não redeclara tipos.
Campos, textos e formatos seguem o Figma do aluno (V1); regras seguem o Documento de Requisitos v3. As telas do instrutor ainda não existem: as rotas de escrita da ficha seguem o RF06/RF07 e são usadas via Insomnia/Bruno na demo.

## Convenções

- Toda rota, exceto `/auth/*` e `/health`, exige `Authorization: Bearer <accessToken>`.
- Erro: `{ "error": "mensagem" }`. Validação acrescenta `issues` do zod. Status: `400` dados inválidos, `401` sem sessão, `403` sem perfil ou sem vínculo, `404` não encontrado, `409` conflito, `422` regra de negócio, `429` muitas tentativas. Em todos, o app pode exibir `error` como veio.
- Sessão: o access token dura 15 min e o refresh 30 dias. Sair da conta, redefinir a senha ou ter a conta desativada encerra a sessão em todos os aparelhos; o próximo `401` sem refresh válido leva ao login.
- Datas em ISO 8601 UTC. Cargas em kg como `number`. `null` significa ausência de valor, nunca erro.
- "Vínculo" = o instrutor só acessa aluno com vínculo ativo. Aluno só acessa a si mesmo. Admin acessa tudo, exceto a anamnese (RN09).

## Rotas

| Método e rota | Quem | Body | Resposta | Tela |
|---|---|---|---|---|
| `POST /auth/register` | público | `registerSchema` | `201` `authResponseSchema`; `409` e-mail em uso | Criar conta |
| `POST /auth/login` | público | `loginSchema` | `authResponseSchema`; `401` senha errada, `403` conta desativada, `429` após 10 erros | Seja Bem-vindo |
| `POST /auth/refresh` | público | `refreshSchema` | `authResponseSchema`; `401` sessão encerrada | — (o cliente HTTP já trata) |
| `GET /auth/me` | logado | — | `userSchema` | abertura do app |
| `POST /auth/logout` | logado | — | `204` | Sair da conta (chamar antes de apagar os tokens locais) |
| `POST /auth/forgot-password` | público | `forgotPasswordSchema` | `204`; `429` antes de 60 s ou após 5 por hora | Esqueci minha senha, Reenviar código |
| `POST /auth/verify-reset-code` | público | `verifyResetCodeSchema` | `204` ou `400` | Verifique seu e-mail |
| `POST /auth/reset-password` | público | `resetPasswordSchema` | `204` ou `400` | Criar nova senha |
| `GET /anamnesis/:studentId` | o aluno, instrutor com vínculo | — | `anamnesisSchema` ou `null` | Primeiro acesso, Evolução > Anamnese |
| `PUT /anamnesis/:studentId` | o próprio aluno | `anamnesisInputSchema` | `anamnesisSchema` | Anamnese, Atualizar Anamnese |
| `GET /plans/student/:studentId` | vínculo | — | `planSchema` ou `null` | Home (treino do dia), Meus Treinos |
| `GET /plans/:id` | instrutor autor, admin | — | `planSchema` | ficha em rascunho |
| `POST /plans` | instrutor com vínculo | `createPlanSchema` | `201` `planSchema` (DRAFT); `409` sem anamnese | Criar Nova Ficha |
| `PUT /plans/:id` | instrutor autor | `updatePlanSchema` | `planSchema` | editar ficha |
| `POST /plans/:id/publish` | instrutor autor | — | `planSchema` | Publicar Ficha |
| `GET /plans/templates` | instrutor | — | `templateSchema[]` | modelos |
| `POST /plans/templates` | instrutor | `createTemplateSchema` | `201` `templateSchema` | salvar como modelo |
| `GET /exercises` | instrutor, admin | — | `exerciseSchema[]` | biblioteca |
| `POST /sessions` | aluno | `startSessionSchema` | `201` `sessionSchema` | Iniciar |
| `PUT /sessions/:id/sets` | aluno dono | `setLogInputSchema` | `setLogSchema` | concluir série, carga |
| `DELETE /sessions/:id/sets/:divisionExerciseId/:setNumber` | aluno dono | — | `204` | desmarcar série |
| `POST /sessions/:id/finish` | aluno dono | `finishSessionSchema` | `sessionSchema`; `422` sem série | Finalizar Treino |
| `DELETE /sessions/:id` | aluno dono | — | `204`; `409` se já finalizada | Sair do treino |
| `POST /users` | admin | `createUserSchema` | `201` `userSchema` | — |
| `GET /users?role=` | admin | — | `userSchema[]` | — |
| `POST /links` | admin | `createLinkSchema` | `201` `linkSchema`; `404` instrutor inativo | — |
| `GET /links` | admin, instrutor | — | `linkSchema[]` ativos | lista de alunos (Sprint 2) |

## Regras que a API calcula

- **Treino do dia (RN08)**: `todayDivisionId` é a divisão seguinte à do último treino finalizado, na ordem A→B→C, voltando ao início. Sem histórico, é a primeira. O aluno pode iniciar qualquer outra aba.
- **Tempo estimado**: `estimatedMinutes` soma, por exercício, `séries × (40 s + descanso)`, arredondado para cima.
- **Criar ficha (RN05)**: exige anamnese respondida. O app do instrutor confere antes com `GET /anamnesis/:studentId` e mostra o alerta. Publicar uma ficha nova expira a ativa anterior.
- **Ficha e anamnese vencidas (RN04)**: `outdated` fica `true` após 60 dias sem atualização. Só sinaliza, não bloqueia o treino.
- **Treino realizado (RN03)**: finalizar exige ao menos uma série. Sem séries, o app mostra o pop-up e "Sair do treino" descarta a sessão.
- **Carga (RN02)**: só o aluno dono da sessão registra ou altera. O instrutor define apenas `targetLoadKg`.
- **Offline**: `POST /sessions` aceita `id` gerado no app e `PUT /sessions/:id/sets` é idempotente. A fila de sincronização pode reenviar sem duplicar.

## Fora desta sprint

Cada item ganha schema aqui antes de o front começar.

- **Sprint 2**: feedback de esforço com Fácil, Moderado e Difícil mais comentário (RU03), frequência, streak e o botão "Notificar Aluno" da anamnese pendente (RU01).
- **Sprints 3 e 4**: feed, contrato e financeiro da Home.
- **Aquecimento e educativos**: o RU02 cita uma lista de aquecimento antes da principal, mas o protótipo não tem essa seção. Fica fora até o design incluir.
