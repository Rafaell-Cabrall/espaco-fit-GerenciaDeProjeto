# API — contratos (Sprints 1 a 4)

> Os guias em PDF abaixo são da Sprint 1. Na Sprint 2 mudaram o cadastro (só por convite), a anamnese (preenchida pelo instrutor) e a ficha (nome, período e dia da semana): na divergência, vale a tabela desta página e o `packages/shared`.

Guia de autenticação para o front, com fluxos por tela e exemplos: [autenticacao.pdf](autenticacao.pdf) (fonte em [autenticacao.html](autenticacao.html)).
Guia da anamnese do primeiro acesso: [anamnese.pdf](anamnese.pdf) (fonte em [anamnese.html](anamnese.html)).
Guia da ficha e do treino (Home, Meus Treinos, execução e montagem pelo instrutor): [treino.pdf](treino.pdf) (fonte em [treino.html](treino.html)).

Coleção do [Bruno](https://www.usebruno.com/) em [`bruno/`](bruno/), para o instrutor montar a ficha pela API na demo. No Bruno: *Open Collection* nessa pasta, ambiente `local` e, se preciso, trocar `studentEmail` pelo e-mail do aluno cadastrado no app (e `baseUrl` pelo IP da máquina). Rodar as requisições na ordem: login admin e instrutor, buscar aluno, vincular, conferir anamnese, biblioteca, criar e publicar a ficha, ver a ficha do aluno. Para a demo do admin enquanto as telas não existem (Sprint 3): "Publicar aviso" (feed), "Instrutores ativos" e "Vincular aluno ao instrutor" com outro `instructorId` (troca de instrutor, RU07). "Registrar pagamento" renova a mensalidade do aluno buscado. Os ids e tokens passam de uma para a outra sozinhos. Para validar sem abrir o Bruno: `npx @usebruno/cli run --env local` dentro de `bruno/`.

Schemas em [`packages/shared/src/index.ts`](../../packages/shared/src/index.ts). O app importa de `@espacofit/shared` e não redeclara tipos.
Campos, textos e formatos seguem o Figma do aluno e do instrutor (V1, 29/09/2026); regras seguem o Documento de Requisitos v3.

## Convenções

- Toda rota, exceto `/auth/*` e `/health`, exige `Authorization: Bearer <accessToken>`.
- Erro: `{ "error": "mensagem" }`. Validação acrescenta `issues` do zod. Status: `400` dados inválidos, `401` sem sessão, `402` aluno bloqueado por mensalidade (RN07), `403` sem perfil ou sem vínculo, `404` não encontrado, `409` conflito, `422` regra de negócio (inclusive senha de confirmação errada), `429` muitas tentativas. Em todos, o app pode exibir `error` como veio.
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
| `PUT /auth/password` | logado | `changePasswordSchema` | `authResponseSchema` com tokens novos; `422` senha atual errada; `429` após 10 erros | Perfil > Alterar senha |
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
| `GET /plans/:id` | instrutor com vínculo, admin | — | `planSchema` | ficha em rascunho, Visualizar Treino Completo |
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
| `GET /users?role=&active=` | admin | — | `adminUserSchema[]` por nome; filtros opcionais, `400` se inválidos | escolher instrutor (`?role=INSTRUTOR&active=true`) |
| `PATCH /users/:id` | admin | `updateUserStatusSchema` | `adminUserSchema`; `404`; `422` na própria conta | ativar/desativar usuário |
| `POST /links` | admin | `createLinkSchema` | `201` `linkSchema`; encerra o vínculo ativo anterior, mesmo instrutor devolve o atual; `404` instrutor inativo ou aluno inexistente | — |
| `GET /links` | admin, instrutor | — | `studentLinkSchema[]` ativos, por nome do aluno; instrutor vê só os seus | Meus Alunos, Buscar aluno, Home (Alunos Ativos) |
| `GET /feedbacks` | instrutor | — | `feedbackSchema[]` | Feedbacks Recentes, Home (comentários não lidos) |
| `POST /feedbacks/:sessionId/read` | instrutor com vínculo | — | `204` | abrir o feedback |
| `GET /measurements?studentId=` | o aluno, instrutor com vínculo | — | `measurementSchema[]`, mais recente primeiro | Evolução > Resumo, Avaliações Físicas, Resultados da Avaliação, Evolução Comparativa |
| `POST /measurements` | instrutor com vínculo | `createMeasurementSchema` | `201` `measurementSchema` | Nova Avaliação → Salvar Avaliação |
| `GET /appointments?from=&to=` | instrutor | `appointmentsQuerySchema` (query) | `appointmentSchema[]` do instrutor, por dia e hora; `400` sem intervalo | Agenda, Home (Resumo do Dia) |
| `POST /appointments` | instrutor com vínculo | `createAppointmentSchema` | `201` `appointmentSchema`; `409` horário ocupado; `422` dia passado | Confirmar Agendamento |
| `DELETE /appointments/:id` | instrutor dono | — | `204` (também se já cancelado) | cancelar avaliação |
| `GET /billing/plans` | admin, instrutor | — | `membershipPlanSchema[]` por preço | planos |
| `POST /billing/plans` | admin | `createMembershipPlanSchema` | `201` `membershipPlanSchema` | cadastrar plano |
| `PATCH /billing/plans/:id` | admin | `updateMembershipPlanSchema` | `membershipPlanSchema`; `404` | editar, desativar plano |
| `GET /billing/students/:studentId` | o aluno, instrutor com vínculo, admin | — | `studentBillingSchema` | aba Mensalidade, card Contrato (Home e Perfil do aluno) |
| `POST /billing/students/:studentId/payments` | admin, instrutor com vínculo | `registerPaymentSchema` | `201` `studentBillingSchema`; `422` senha errada; `400` sem plano definido; `409` id de outro aluno | Registrar Pagamento → Confirmar Pagamento, Renovar Mensalidade |
| `GET /feed` | logado | — | `announcementSchema[]` vigentes, mais recente primeiro | Aviso da Academia (Home do aluno e do instrutor) |
| `POST /feed` | admin | `createAnnouncementSchema` | `201` `announcementSchema`; `422` validade no passado | publicar comunicado |
| `DELETE /feed/:id` | admin | — | `204` | apagar comunicado |

## Regras que a API calcula

- **Treino do dia (RN08)**: `todayDivisionId` é a divisão seguinte à do último treino finalizado, na ordem A→B→C, voltando ao início. Sem histórico, é a primeira. O aluno pode iniciar qualquer outra aba.
- **Tempo estimado**: `estimatedMinutes` soma, por exercício, `séries × (40 s + descanso)`, arredondado para cima.
- **Criar ficha (RN05)**: exige anamnese cadastrada (o instrutor preenche no cadastro do aluno). Publicar uma ficha nova expira a ativa anterior.
- **Ficha**: `startsOn`/`endsOn` são dias (`AAAA-MM-DD`); "34 de 91 dias" e "38%" o app calcula. `weekday` (0 = domingo) é só rótulo.
- **Editar ficha ativa**: só rascunho aceita `PUT`, porque a ficha ativa já tem sessões e cargas presas às divisões. Para alterar a ativa, o app envia as divisões dela (editadas) para `POST /plans` e publica; a anterior expira e o histórico fica.
- **Mídia**: `mediaUrl` é uma URL assinada válida por 1 hora. O app não guarda a URL; pede a ficha de novo se o GIF falhar.
- **Ficha e anamnese vencidas (RN04)**: `outdated` fica `true` após 60 dias sem atualização. Só sinaliza, não bloqueia o treino. Todo dia às 08:00 o worker manda um push ao instrutor do vínculo com os alunos cuja ficha ativa ou anamnese venceu nas últimas 24 h.
- **Treino realizado (RN03)**: finalizar exige ao menos uma série. Sem séries, o app mostra o pop-up e "Sair do treino" descarta a sessão.
- **Carga (RN02)**: só o aluno dono da sessão registra ou altera. O instrutor define apenas `targetLoadKg`.
- **Offline**: `POST /sessions` aceita `id` gerado no app e `PUT /sessions/:id/sets` é idempotente. A fila de sincronização pode reenviar sem duplicar.

- **Convite**: `POST /users` envia um código de 6 dígitos que vale 72 h. "Primeiro acesso" = e-mail → `verify-reset-code` → `reset-password`, sem chamar `forgot-password`. Se expirar, "Reenviar código" chama `forgot-password` (código de 10 min).
- **Consentimento (RN09)**: o portão do aluno abre a tela de consentimento quando `consentAt` é `null`. Anamnese `null` = "procure seu instrutor".
- **Sequência**: dias corridos seguidos com treino, no fuso de Brasília. Continua valendo até o fim do dia seguinte ao último treino.
- **Feedback**: cada "Nota do exercício" do finish vira um item de `GET /feedbacks`. Abrir marca como lidos os comentários daquele treino.
- **Push**: finalizar treino avisa o instrutor do vínculo ativo; publicar com `notify` avisa o aluno. Sem token registrado, nada é enviado.
- **Troca de instrutor (RU07)**: `POST /links` com outro instrutor encerra o vínculo anterior. O novo instrutor passa a ver ficha, histórico, anamnese, avaliações e feedbacks do aluno; o anterior perde o acesso. Instrutor desativado não entra no app e não pode receber vínculo.
- **Avaliação física**: só data e peso são obrigatórios. `bmi` usa a última altura informada até aquela avaliação. "Resultados da Avaliação" compara `items[i]` com `items[i + 1]`; "Evolução Comparativa" usa os 3 primeiros. "−1.2 desde o mês passado" compara o primeiro item com `lastMonthBaseline(items)` (exportado do `@espacofit/shared`). Admin não lê medidas (dado de saúde, RN09).
- **Agenda**: `time` no formato `HH:MM` (dia e hora em Brasília); a grade de horários (de 20 em 20 min) fica no app. "3 aval." e o Resumo do Dia (`from` = `to` = hoje) saem da lista.
- **Mensalidade**: `status` sai do vencimento. `ACTIVE` = em dia; `OVERDUE` = vencida; `BLOCKED` = vencida há 60 dias ou mais. Bloqueado, o aluno recebe `402` em toda rota, exceto `/auth/*` e `/billing/*`: o app mostra a tela de bloqueio com a mensalidade. O instrutor continua acessando o aluno. Cada pagamento soma um período do plano ao vencimento atual (o atraso não é perdoado); o primeiro conta a partir de hoje. O valor é o preço do plano naquele momento. "Pendentes / Vencendo", "Total a receber" e o selo de Meus Alunos saem do `billing` de `GET /links`.
- **Lembrete de vencimento (RN06)**: todo dia às 09:00 o worker manda push e e-mail ao aluno cuja mensalidade vence em 3 dias.
- **Feed**: aviso com `expiresOn` aparece até o fim desse dia (Brasília); `null` = sem prazo.
- **Mídia do exercício**: `POST /exercises` com `mediaType` devolve `uploadUrl`; o app faz `PUT` do arquivo nela (header `Content-Type` igual ao `mediaType`) em até 15 min.

## Fora desta sprint

Cada item ganha schema aqui antes de o front começar.

- **Sprint 5**: editar dados do perfil e trocar e-mail (a troca de senha já existe); check-in barrando mensalidade vencida (o `status` já sai pronto).
- **Recibo**: o histórico de pagamentos já traz valor, forma e data; recibo em PDF só se a academia pedir.
- **Aquecimento e educativos**: o RU02 cita uma lista de aquecimento antes da principal, mas o protótipo não tem essa seção. Fica fora até o design incluir.
