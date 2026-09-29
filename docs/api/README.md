# API — contratos (Sprints 1 e 2)

> Os guias em PDF abaixo são da Sprint 1. Na Sprint 2 mudaram o cadastro (só por convite), a anamnese (preenchida pelo instrutor) e a ficha (nome, período e dia da semana): na divergência, vale a tabela desta página e o `packages/shared`.

Guia de autenticação para o front, com fluxos por tela e exemplos: [autenticacao.pdf](autenticacao.pdf) (fonte em [autenticacao.html](autenticacao.html)).
Guia da anamnese do primeiro acesso: [anamnese.pdf](anamnese.pdf) (fonte em [anamnese.html](anamnese.html)).
Guia da ficha e do treino (Home, Meus Treinos, execução e montagem pelo instrutor): [treino.pdf](treino.pdf) (fonte em [treino.html](treino.html)).

Coleção do [Bruno](https://www.usebruno.com/) em [`bruno/`](bruno/), para o instrutor montar a ficha pela API na demo. No Bruno: *Open Collection* nessa pasta, ambiente `local` e, se preciso, trocar `studentEmail` pelo e-mail do aluno cadastrado no app (e `baseUrl` pelo IP da máquina). Rodar as requisições na ordem: login admin e instrutor, buscar aluno, vincular, conferir anamnese, biblioteca, criar e publicar a ficha, ver a ficha do aluno. Os ids e tokens passam de uma para a outra sozinhos. Para validar sem abrir o Bruno: `npx @usebruno/cli run --env local` dentro de `bruno/`.

Schemas em [`packages/shared/src/index.ts`](../../packages/shared/src/index.ts). O app importa de `@espacofit/shared` e não redeclara tipos.
Campos, textos e formatos seguem o Figma do aluno e do instrutor (V1, 29/09/2026); regras seguem o Documento de Requisitos v3.

## Convenções

- Toda rota, exceto `/auth/*` e `/health`, exige `Authorization: Bearer <accessToken>`.
- Erro: `{ "error": "mensagem" }`. Validação acrescenta `issues` do zod. Status: `400` dados inválidos, `401` sem sessão, `403` sem perfil ou sem vínculo, `404` não encontrado, `409` conflito, `422` regra de negócio, `429` muitas tentativas. Em todos, o app pode exibir `error` como veio.
- Sessão: o access token dura 15 min e o refresh 30 dias. Sair da conta, redefinir a senha ou ter a conta desativada encerra a sessão em todos os aparelhos; o próximo `401` sem refresh válido leva ao login.
- Datas em ISO 8601 UTC. Cargas em kg como `number`. `null` significa ausência de valor, nunca erro.
- "Vínculo" = o instrutor só acessa aluno com vínculo ativo. Aluno só acessa a si mesmo. Admin acessa tudo, exceto a anamnese (RN09).

## Rotas

| Método e rota | Quem | Body | Resposta | Tela |
|---|---|---|---|---|
| `POST /auth/login` | público | `loginSchema` | `authResponseSchema`; `401` senha errada, `403` conta desativada, `429` após 10 erros | Seja Bem-vindo |
| `POST /auth/refresh` | público | `refreshSchema` | `authResponseSchema`; `401` sessão encerrada | — (o cliente HTTP já trata) |
| `GET /auth/me` | logado | — | `userSchema` | abertura do app |
| `POST /auth/logout` | logado | — | `204`; também apaga o token de push | Sair da conta (chamar antes de apagar os tokens locais) |
| `PUT /auth/push-token` | logado | `pushTokenSchema` | `204` | ao entrar no app, depois da permissão de notificação |
| `POST /auth/forgot-password` | público | `forgotPasswordSchema` | `204`; `429` antes de 60 s ou após 5 por hora | Esqueci minha senha, Reenviar código (também no primeiro acesso) |
| `POST /auth/verify-reset-code` | público | `verifyResetCodeSchema` | `204` ou `400` | Verifique seu e-mail, Primeiro acesso |
| `POST /auth/reset-password` | público | `resetPasswordSchema` | `204` ou `400` | Criar nova senha |
| `GET /anamnesis/:studentId` | o aluno, instrutor com vínculo | — | `anamnesisSchema` ou `null` | portão do primeiro acesso, Evolução > Anamnese, Anamnese e Objetivos |
| `PUT /anamnesis/:studentId` | instrutor com vínculo | `anamnesisAnswersSchema` | `anamnesisSchema` | Anamnese Completa → Salvar Anamnese |
| `POST /anamnesis/:studentId/consent` | o próprio aluno | — | `anamnesisSchema`; `404` sem anamnese | consentimento do primeiro acesso (RN09) |
| `PUT /anamnesis/:studentId/notes` | instrutor com vínculo | `anamnesisNotesSchema` | `anamnesisSchema`; `404` sem anamnese | Observações do Personal |
| `GET /plans/student/:studentId` | vínculo | — | `planSchema` ou `null` | Home (treino do dia), Meus Treinos |
| `GET /plans?studentId=` | vínculo | — | `planSummarySchema[]`, mais recente primeiro; aluno não vê rascunho | perfil do aluno > Fichas (atual e arquivadas) |
| `GET /plans/:id` | instrutor autor, admin | — | `planSchema` | ficha em rascunho, Visualizar Treino Completo |
| `POST /plans` | instrutor com vínculo | `createPlanSchema` | `201` `planSchema` (DRAFT); `409` sem anamnese; `400` exercício inexistente ou período invertido | Nova Ficha de Treino |
| `PUT /plans/:id` | instrutor autor | `updatePlanSchema` | `planSchema`; `409` se não for rascunho | Editar Ficha de Treino |
| `POST /plans/:id/publish` | instrutor autor | `publishPlanSchema` (opcional) | `planSchema`; `notify: true` manda push ao aluno | Publicar, Notificar aluno |
| `GET /plans/templates` | instrutor | — | `templateSchema[]` | modelos |
| `POST /plans/templates` | instrutor | `createTemplateSchema` | `201` `templateSchema` | Novo Template, salvar como modelo |
| `PUT /plans/templates/:id` | instrutor dono | `createTemplateSchema` | `templateSchema`; `404` | editar template |
| `DELETE /plans/templates/:id` | instrutor dono | — | `204`; `404` | — |
| `GET /exercises` | instrutor, admin | — | `exerciseSchema[]` | Biblioteca, Exercícios de Peito |
| `POST /exercises` | instrutor, admin | `createExerciseSchema` | `201` `createdExerciseSchema` | cadastrar exercício |
| `GET /sessions` | aluno; instrutor com vínculo e admin com `?studentId=` | `sessionsQuerySchema` (query) | `sessionSchema[]` finalizados, mais recente primeiro; `400` sem aluno; `403` sem vínculo | card Histórico, perfil do aluno > Histórico |
| `GET /sessions/frequency?month=AAAA-MM` | aluno | — | `frequencySchema` | Evolução > Frequência, Home (sequência e histórico) |
| `POST /sessions` | aluno | `startSessionSchema` | `201` `sessionSchema`; `404` divisão fora da ficha ativa; `409` id já usado por outro aluno | Iniciar |
| `PUT /sessions/:id/sets` | aluno dono | `setLogInputSchema` | `setLogSchema`; `400` exercício de outra divisão ou série além do total; `409` treino finalizado | concluir série, carga |
| `DELETE /sessions/:id/sets/:divisionExerciseId/:setNumber` | aluno dono | — | `204` | desmarcar série |
| `POST /sessions/:id/finish` | aluno dono | `finishSessionSchema` | `sessionSchema`; `422` sem série; repetir devolve o mesmo treino | Finalizar Treino |
| `DELETE /sessions/:id` | aluno dono | — | `204` (também se já descartado); `409` se já finalizada | Sair do treino |
| `POST /users` | admin, instrutor | `createUserSchema` | `201` `userSchema` e e-mail de convite; `409` e-mail em uso; `403` instrutor criando não-aluno; `400` instrutor sem anamnese | Novo Aluno → Cadastrar Aluno |
| `GET /users?role=` | admin | — | `userSchema[]` por nome; `role` opcional, `400` se inválido | — |
| `POST /links` | admin | `createLinkSchema` | `201` `linkSchema`; encerra o vínculo ativo anterior, mesmo instrutor devolve o atual; `404` instrutor inativo ou aluno inexistente | — |
| `GET /links` | admin, instrutor | — | `studentLinkSchema[]` ativos, por nome do aluno; instrutor vê só os seus | Meus Alunos, Buscar aluno, Home (Alunos Ativos) |
| `GET /feedbacks` | instrutor | — | `feedbackSchema[]` | Feedbacks Recentes, Home (comentários não lidos) |
| `POST /feedbacks/:sessionId/read` | instrutor com vínculo | — | `204` | abrir o feedback |

## Regras que a API calcula

- **Treino do dia (RN08)**: `todayDivisionId` é a divisão seguinte à do último treino finalizado, na ordem A→B→C, voltando ao início. Sem histórico, é a primeira. O aluno pode iniciar qualquer outra aba.
- **Tempo estimado**: `estimatedMinutes` soma, por exercício, `séries × (40 s + descanso)`, arredondado para cima.
- **Criar ficha (RN05)**: exige anamnese cadastrada (o instrutor preenche no cadastro do aluno). Publicar uma ficha nova expira a ativa anterior.
- **Ficha**: `startsOn`/`endsOn` são dias (`AAAA-MM-DD`); "34 de 91 dias" e "38%" o app calcula. `weekday` (0 = domingo) é só rótulo.
- **Editar ficha ativa**: só rascunho aceita `PUT`, porque a ficha ativa já tem sessões e cargas presas às divisões. Para alterar a ativa, o app envia as divisões dela (editadas) para `POST /plans` e publica; a anterior expira e o histórico fica.
- **Mídia**: `mediaUrl` é uma URL assinada válida por 1 hora. O app não guarda a URL; pede a ficha de novo se o GIF falhar.
- **Ficha e anamnese vencidas (RN04)**: `outdated` fica `true` após 60 dias sem atualização. Só sinaliza, não bloqueia o treino.
- **Treino realizado (RN03)**: finalizar exige ao menos uma série. Sem séries, o app mostra o pop-up e "Sair do treino" descarta a sessão.
- **Carga (RN02)**: só o aluno dono da sessão registra ou altera. O instrutor define apenas `targetLoadKg`.
- **Offline**: `POST /sessions` aceita `id` gerado no app e `PUT /sessions/:id/sets` é idempotente. A fila de sincronização pode reenviar sem duplicar.

- **Convite**: `POST /users` envia um código de 6 dígitos que vale 72 h. "Primeiro acesso" = e-mail → `verify-reset-code` → `reset-password`, sem chamar `forgot-password`. Se expirar, "Reenviar código" chama `forgot-password` (código de 10 min).
- **Consentimento (RN09)**: o portão do aluno abre a tela de consentimento quando `consentAt` é `null`. Anamnese `null` = "procure seu instrutor".
- **Sequência**: dias corridos seguidos com treino, no fuso de Brasília. Continua valendo até o fim do dia seguinte ao último treino.
- **Feedback**: cada "Nota do exercício" do finish vira um item de `GET /feedbacks`. Abrir marca como lidos os comentários daquele treino.
- **Push**: finalizar treino avisa o instrutor do vínculo ativo; publicar com `notify` avisa o aluno. Sem token registrado, nada é enviado.
- **Mídia do exercício**: `POST /exercises` com `mediaType` devolve `uploadUrl`; o app faz `PUT` do arquivo nela (header `Content-Type` igual ao `mediaType`) em até 15 min.

## Fora desta sprint

Cada item ganha schema aqui antes de o front começar.

- **Sprint 3**: agenda e avaliação física (composição corporal e perímetros), medidas da Evolução, perfil do instrutor, feed.
- **Sprint 4**: mensalidade e registro de pagamento (inclusive pelo instrutor).
- **Aquecimento e educativos**: o RU02 cita uma lista de aquecimento antes da principal, mas o protótipo não tem essa seção. Fica fora até o design incluir.
