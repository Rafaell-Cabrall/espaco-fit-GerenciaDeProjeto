# Plano de sprints

Equipe: 1 back, 2 front, 1 design. Cada item referencia o Documento de Requisitos v3.
Toda review exige: demo do incremento, [registro de validação com o stakeholder](validacoes/TEMPLATE.md) e, a partir da Sprint 2, um slide de gestão (planejado × entregue, escopo movido, cronograma restante).

Situação do design em 11/09: telas do **Aluno** prontas; telas do **Instrutor** em produção; **Admin**, **Financeiro** e **Check-in** ainda não iniciados. Por isso o front segue uma sprint atrás do design: o que o design fecha na sprint N o front implementa na N+1. O back não depende disso e entrega a API de cada área uma sprint antes do front.

## Cronograma

| Sprint | Período | Review | Peso | Objetivo (o que dá para demonstrar) |
|---|---|---|---|---|
| 1 | 11/09 – 24/09 | 24/09 | AV2 10% | Aluno: cadastro, anamnese, ficha e execução do treino do dia (ficha criada pela API) |
| 2 | 25/09 – 08/10 | 08/10 | AV2 15% | Aluno: feedback, frequência e streak. Instrutor: monta a ficha no app e recebe a conclusão |
| 3 | 09/10 – 29/10 | 29/10 | AV2 15% | Offline, evolução, feed; instrutor completo (biblioteca, histórico); admin gerencia usuários e vínculos |
| — | 22/10 | conferência IHC | — | V2 do Doc. de Arquitetura + Doc. de Requisitos + protótipo atualizado |
| 4 | 30/10 – 12/11 | 12/11 | AV2 15% | Financeiro: planos, vencimento, cobrança automática e bloqueio de inadimplente |
| 5 | 13/11 – 26/11 | 26/11 | AV2 20% | Check-in por QR na recepção; LGPD (exclusão de conta); notificações |
| 6 | 27/11 – 03/12 | 03/12 | AV2 25% | Build instalável na academia, correções do piloto, apresentação final |

Regra de escopo: cada sprint tem itens **obrigatórios** (a demo depende deles) e **se sobrar tempo**. O que não couber vai para a próxima sprint e entra no slide de gestão como "escopo movido", nunca some em silêncio.

## Sprint 1 — Aluno ponta a ponta (RU01 back, RU02, RN01, RN02, RN05, RN08, RN09)

Demo: aluno se cadastra, aceita o termo LGPD, responde a anamnese, abre a ficha (criada pelo instrutor via API, já que a tela dele ainda não existe), executa o treino do dia com carga e cronômetro. Deixar claro na review que o lado do instrutor chega na Sprint 2.

**Back**
- [x] Setup: monorepo, Docker, Prisma, auth, middlewares, CI
- [x] Contratos da sprint em `packages/shared` até 14/09 (desbloqueia o Front 2); rotas em [`docs/api/`](api/README.md)
- [x] `auth`: `POST /auth/verify-reset-code`, porque o Figma valida o código antes de pedir a senha nova
- [x] E-mail real do código de recuperação pelo worker (antecipado da Sprint 2)
- [x] `anamnesis`: GET/PUT com `consentAt` obrigatório (RN09)
- [x] `plans`: ficha com divisões e exercícios, modelos, criar só com anamnese (RN05); leitura pelo aluno (RN01)
- [x] `exercises`: biblioteca padrão no seed, com GIF no MinIO por URL assinada (RNF06). GIFs provisórios do free-exercise-db; vídeos gravados na academia entram com o cadastro de mídia da Sprint 2
- [x] `sessions`: iniciar sessão, registrar série com carga (só aluno, RN02), finalizar, descartar sem série (RN03)
- [x] Treino do dia: rotação A→B→C com escolha manual (RN08)
- [x] `users` e `links`: criar usuários e vincular aluno ↔ instrutor (usado só via API/seed nesta sprint)
- [ ] Coleção do Insomnia/Bruno em `docs/api/` para o instrutor "montar ficha" na demo

**Front (2 pessoas, só telas do aluno)**
- [ ] Design system a partir do Figma do aluno: tokens, Button, Input, Card, Text, Tabs
- [ ] Login, Cadastro (com aceite LGPD), Esqueci a senha, telas de sucesso
- [ ] Anamnese no primeiro acesso
- [ ] Home do aluno: saudação, treino do dia
- [ ] Meus Treinos (abas por divisão) e tela de execução: carga, concluir série, cronômetro de descanso com som
- [ ] Se sobrar tempo: tela de perfil do aluno

**Design**
- [ ] Anamnese do primeiro acesso (falta no Figma do aluno; bloqueia o front até 15/09)
- [ ] Tela de treino concluído e feedback de esforço (falta no Figma do aluno)
- [ ] Fechar telas do Instrutor: lista de alunos, perfil do aluno, montar ficha, biblioteca (insumo da Sprint 2)
- [ ] Registro de validação do protótipo do aluno com 2 alunos reais

Divisão por pessoa, datas e dependências: quadro da Sprint 1 no ClickUp. Front 1 cuida do design system e da autenticação; Front 2 cuida do fluxo de treino.

## Sprint 2 — Fechar o aluno e abrir o instrutor (RU01 front, RU03, RN03)

Demo: aluno finaliza treino, dá feedback, vê calendário e streak; instrutor entra no app, vê seus alunos, monta uma ficha a partir de modelo e recebe push quando o aluno conclui.

**Back**
- [ ] Feedback de esforço; dia só conta com ≥1 série (RN03); calendário de frequência e streak
- [ ] Push ao instrutor na conclusão (job `push` via BullMQ + Expo Push); registro do token do dispositivo
- [ ] `exercises`: cadastro pelo instrutor com upload de mídia
- [ ] `measurements`: medidas corporais (API pronta para a Evolução da Sprint 3)

**Front**
- [ ] Aluno: tela de feedback pós-treino, pop-up de "nenhuma série concluída", calendário de frequência, streak na Home
- [ ] Instrutor: login cai na área dele; lista de alunos; perfil do aluno com anamnese
- [ ] Instrutor: montar/editar ficha, salvar como modelo, publicar (bloqueio se anamnese pendente + "Notificar aluno")
- [ ] Se sobrar tempo: instrutor cadastra exercício com mídia

**Design**
- [ ] Telas do Admin: usuários, vínculos (alterar instrutor), comunicados
- [ ] Telas de Evolução/medidas do aluno
- [ ] Validação das telas do instrutor com o gerente/instrutor

## Sprint 3 — Offline, evolução, feed e admin (RU04, RU07, RN04, RNF03)

Sprint de 3 semanas por causa da conferência de 22/10. A primeira semana é reservada aos documentos V2.

Demo: treino executado sem internet e sincronizado depois; aba Evolução; feed de avisos publicado pelo admin; admin troca o instrutor de um aluno e o novo instrutor vê o histórico.

**Documentos (toda a equipe, até 22/10)**
- [ ] Doc. de Arquitetura v2: componentes finos, modelo de dados (Prisma como fonte), fluxos offline/notificação/ficha, ADRs, implantação
- [ ] Doc. de Requisitos v2: incorporar as validações das Sprints 1 e 2
- [ ] Protótipo atualizado no Figma (aluno, instrutor, admin)

**Back**
- [ ] `plans`: sinalizar ficha/anamnese > 60 dias (RN04) + job diário que notifica o instrutor
- [ ] `feed`: comunicados com validade (admin escreve, todos leem)
- [ ] `links`: troca de instrutor encerrando o vínculo antigo (RU07); filtrar instrutores inativos
- [ ] `users`: admin cria/ativa/desativa; aluno e instrutor editam o próprio perfil
- [ ] Endpoints idempotentes para a fila de sincronização (id gerado no app)
- [ ] `billing`: planos e assinatura (API pronta para o front da Sprint 4)

**Front**
- [ ] Aluno: offline (cache persistido da ficha + fila de mutações com retry, banner "Modo Offline", RNF03)
- [ ] Aluno: Evolução (Resumo, Anamnese, Frequência, medidas); Home com feed (estado vazio e cache)
- [ ] Instrutor: biblioteca de exercícios com mídia, histórico e feedback dos alunos, alerta de ficha vencida
- [ ] Admin: lista de usuários, criar/desativar, alterar instrutor do aluno, publicar comunicado

**Design**
- [ ] Telas de Financeiro (aluno e admin) e Check-in (QR do aluno, leitor do admin)
- [ ] Revisão de usabilidade das telas já implementadas (RNF02: botões largos, um clique)

## Sprint 4 — Financeiro (RU05, RN06, RN07)

Demo: admin cadastra plano e registra pagamento; aluno vê status, vencimento e dias restantes; vencimento simulado dispara push + e-mail 3 dias antes; inadimplente vê bloqueio progressivo.

**Back**
- [ ] `billing`: dias restantes, registro de pagamento manual pelo admin, recibo
- [ ] Job diário de cobrança preventiva: push + e-mail 3 dias antes (RN06)
- [ ] Bloqueio progressivo: vencido bloqueia check-in; 2 meses bloqueia o app (RN07), restaurado no pagamento
- [ ] `checkin`: `POST /qr` e `POST /validate` (API pronta para o front da Sprint 5)
- [ ] Se decidido pela equipe: gateway Pix (Mercado Pago sandbox) com webhook, atrás da mesma interface do pagamento manual (RNF05)

**Front**
- [ ] Aluno: aba Financeiro (status, vencimento, contagem regressiva, histórico, recibo) e telas de bloqueio com "Resolver agora"
- [ ] Admin: planos, inadimplentes, registrar pagamento
- [ ] Se gateway: tela de cópia do código Pix e estados de sucesso/recusa

**Design**
- [ ] Telas de perfil, notificações e privacidade (exportar dados, excluir conta)
- [ ] Validação do fluxo financeiro com o proprietário

## Sprint 5 — Check-in, LGPD e notificações (RU06, RN09, RN10)

Demo: aluno gera QR de 60 s; admin lê com a câmera do celular e o acesso é registrado; inadimplente é barrado; aluno exclui a conta e os dados de saúde somem.

**Back**
- [ ] `checkin`: token assinado de 60 s, registro de entrada, bloqueio por RN07, lista de acessos do dia
- [ ] Exclusão de conta: anonimização de anamnese e histórico de saúde, mantendo o financeiro anonimizado (RN10)
- [ ] Exportar dados do aluno (JSON)
- [ ] Central de notificações: preferências e histórico de push

**Front**
- [ ] Aluno: tela de QR com renovação automática ao expirar
- [ ] Admin: leitor de QR (expo-camera) com liberado/bloqueado e lista de acessos do dia
- [ ] Perfil completo (aluno e instrutor): dados, notificações, privacidade, exportar dados, excluir conta

**Design**
- [ ] Ajustes finos após o uso real na academia
- [ ] Material da apresentação final

## Sprint 6 — Piloto e entrega (1 semana)

Demo: app instalado no celular do gerente e do proprietário, rodando contra a API hospedada.

- [ ] Build de produção com EAS (APK Android + TestFlight se houver conta Apple)
- [ ] API, Postgres, Redis e MinIO hospedados (Railway/Render/Fly ou VPS da equipe); backup do banco
- [ ] Correções dos bugs do piloto (semana de uso real pela equipe da academia)
- [ ] README de instalação e operação para o cliente
- [ ] Apresentação final: demo ponta a ponta, gestão do projeto (planejado × entregue nas 6 sprints), lições aprendidas

## Riscos conhecidos

| Risco | Mitigação |
|---|---|
| Design do instrutor atrasa e trava o front na Sprint 2 | Front começa pelo aluno (feedback, frequência), que não depende do design novo; instrutor entra assim que as telas fecharem |
| Design do admin não fica pronto para a Sprint 3 | Admin da Sprint 3 é mínimo (lista, criar, alterar instrutor, comunicado); se atrasar, vai para a Sprint 4 e a demo de RU07 é feita via API |
| Front com 2 pessoas é o gargalo | Back entrega contrato em `packages/shared` e a API uma sprint antes; telas "se sobrar tempo" caem primeiro |
| Sprint 3 perde uma semana para os documentos V2 | Escopo de código da Sprint 3 já considera 2 semanas |
| Gateway de pagamento indefinido | Pagamento manual pelo admin cobre a demo; gateway é opcional na Sprint 4 |
| Catraca física não existe | Check-in é validado pelo celular do admin; integração com catraca fica fora do escopo |
| Sprint 6 tem 1 semana | Nada novo entra; só build, hospedagem e correções |
