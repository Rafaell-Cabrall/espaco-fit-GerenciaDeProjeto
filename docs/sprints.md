# Plano de sprints

Equipe: 1 back, 2 front, 1 design. Cada item referencia o Documento de Requisitos v3.
Toda review exige: demo do incremento, [registro de validação com o stakeholder](validacoes/TEMPLATE.md) e, a partir da Sprint 2, um slide de gestão (planejado × entregue, escopo movido, cronograma restante).

## Cronograma

| Sprint | Período | Review | Peso | Objetivo (o que dá para demonstrar) |
|---|---|---|---|---|
| 1 | 11/09 – 24/09 | 24/09 | AV2 10% | Login, cadastro, anamnese; instrutor monta ficha e o aluno a vê |
| 2 | 25/09 – 08/10 | 08/10 | AV2 15% | Aluno executa o treino do dia com carga e cronômetro; instrutor recebe a conclusão |
| 3 | 09/10 – 29/10 | 29/10 | AV2 15% | App funciona offline; evolução e frequência; feed de avisos; admin gerencia usuários e vínculos |
| — | 22/10 | conferência IHC | — | V2 do Doc. de Arquitetura + Doc. de Requisitos + protótipo atualizado |
| 4 | 30/10 – 12/11 | 12/11 | AV2 15% | Financeiro: planos, vencimento, cobrança automática e bloqueio de inadimplente |
| 5 | 13/11 – 26/11 | 26/11 | AV2 20% | Check-in por QR na recepção; LGPD (exclusão de conta); notificações |
| 6 | 27/11 – 03/12 | 03/12 | AV2 25% | Build instalável na academia, correções do piloto, apresentação final |

Regra de escopo: cada sprint tem itens **obrigatórios** (a demo depende deles) e **se sobrar tempo**. O que não couber vai para a próxima sprint e entra no slide de gestão como "escopo movido", nunca some em silêncio.

## Sprint 1 — Base, cadastro e ficha (RU01, RN01, RN05, RN09)

Demo: cadastrar aluno → aluno responde anamnese → instrutor cria ficha a partir de modelo → aluno abre a ficha.

**Back**
- [x] Setup: monorepo, Docker, Prisma, auth, middlewares, CI
- [ ] `users`: admin cria instrutor/aluno, ativa/desativa; aluno e instrutor editam o próprio perfil
- [ ] `links`: vincular aluno ↔ instrutor (um ativo por aluno)
- [ ] `anamnesis`: GET/PUT com `consentAt` obrigatório (RN09)
- [ ] `exercises`: biblioteca padrão (seed) + cadastro pelo instrutor com URL assinada de upload no MinIO (RNF06)
- [ ] `plans`: criar/editar/excluir ficha com divisões e exercícios; salvar/usar modelo; publicar só com anamnese (RN05)
- [ ] Se sobrar tempo: e-mail real do código de recuperação de senha

**Front**
- [ ] Design system a partir do Figma: tokens, Button, Input, Card, Text, Tabs
- [ ] Login, Cadastro (com aceite LGPD), Esqueci a senha, telas de sucesso
- [ ] Aluno: anamnese no primeiro acesso; visualização da ficha (somente leitura, RN01)
- [ ] Instrutor: lista de alunos, montar ficha, biblioteca de exercícios
- [ ] Se sobrar tempo: tela de perfil

**Design**
- [ ] Fechar telas de Instrutor (hoje vazias no Figma)
- [ ] Telas de execução de treino e evolução (insumo da Sprint 2)
- [ ] Registro de validação do protótipo com o gerente/instrutor

## Sprint 2 — Execução de treino (RU02, RU03, RN02, RN03, RN08)

Demo: aluno abre "Treino do Dia" (sugestão sequencial), registra cargas, usa cronômetro com som, finaliza, dá feedback; instrutor recebe push e vê o histórico.

**Back**
- [ ] `sessions`: iniciar/finalizar sessão, séries com carga (só aluno, RN02), feedback de esforço
- [ ] Treino do dia: rotação A→B→C com escolha manual (RN08); dia só conta com ≥1 série (RN03)
- [ ] Calendário de frequência e streak
- [ ] Push ao instrutor na conclusão (job `push` via BullMQ + Expo Push)
- [ ] Se sobrar tempo: histórico de cargas por exercício (gráfico simples)

**Front**
- [ ] Home do aluno: saudação, treino do dia, streak
- [ ] Meus Treinos (abas por divisão) e tela de execução: carga, concluir série, cronômetro de descanso com som
- [ ] Tela de feedback pós-treino; pop-up de "nenhuma série concluída"
- [ ] Instrutor: histórico e feedback dos alunos; registrar token de push
- [ ] Se sobrar tempo: gráfico de evolução de carga

**Design**
- [ ] Telas de Admin, Feed e Evolução/medidas
- [ ] Validação da tela de execução com 2 alunos reais

## Sprint 3 — Offline, evolução, feed e admin (RU04, RU07, RN04, RNF03)

Sprint de 3 semanas por causa da conferência de 22/10. A primeira semana é reservada aos documentos V2.

Demo: treino executado sem internet e sincronizado depois; aba Evolução com medidas e frequência; feed de avisos do admin; admin troca o instrutor de um aluno mantendo o histórico.

**Documentos (toda a equipe, até 22/10)**
- [ ] Doc. de Arquitetura v2: componentes finos, modelo de dados (Prisma como fonte), fluxos offline/notificação/ficha, ADRs, implantação (Docker Compose e hospedagem)
- [ ] Doc. de Requisitos v2: incorporar mudanças das validações das Sprints 1 e 2
- [ ] Protótipo atualizado no Figma

**Back**
- [ ] `plans`: sinalizar ficha/anamnese > 60 dias (RN04) na leitura + job diário que notifica o instrutor
- [ ] `measurements`: medidas corporais para a aba Evolução
- [ ] `feed`: comunicados com validade (admin escreve, todos leem)
- [ ] `links`: troca de instrutor encerrando o vínculo antigo, novo instrutor vê o histórico (RU07); filtrar instrutores inativos
- [ ] Endpoints idempotentes para a fila de sincronização (id gerado no app)

**Front**
- [ ] Offline: cache persistido da ficha do dia + fila de mutações com retry (RNF03), banner "Modo Offline"
- [ ] Evolução: Resumo, Anamnese, Frequência (calendário), medidas
- [ ] Home com feed de avisos (estado vazio e cache offline)
- [ ] Admin: lista de usuários, criar/desativar, alterar instrutor do aluno, publicar comunicado
- [ ] Alerta visual de ficha vencida (aluno e instrutor)

**Design**
- [ ] Telas de Financeiro e Check-in
- [ ] Protótipo v2 e revisão de usabilidade das telas já implementadas

## Sprint 4 — Financeiro (RU05, RN06, RN07)

Demo: admin cadastra plano e registra pagamento; aluno vê status, vencimento e dias restantes; simulação de vencimento dispara push + e-mail 3 dias antes; inadimplente vê bloqueio progressivo.

**Back**
- [ ] `billing`: planos, assinatura por aluno, dias restantes, recibo
- [ ] Registro de pagamento manual pelo admin (Pix/dinheiro na recepção)
- [ ] Job diário de cobrança preventiva: push + e-mail 3 dias antes (RN06)
- [ ] Bloqueio progressivo: vencido bloqueia check-in; 2 meses bloqueia o app (RN07), restaurado no pagamento
- [ ] Se decidido pela equipe: gateway Pix (Mercado Pago sandbox) com webhook, atrás da mesma interface do pagamento manual (RNF05)

**Front**
- [ ] Aba Financeiro do aluno: status, vencimento, contagem regressiva, histórico e recibo
- [ ] Admin: planos, inadimplentes, registrar pagamento
- [ ] Telas de bloqueio (check-in bloqueado / app bloqueado com "Resolver agora")
- [ ] Se gateway: tela de cópia do código Pix e estados de sucesso/recusa

**Design**
- [ ] Telas de perfil, notificações e privacidade
- [ ] Validação do fluxo financeiro com o proprietário

## Sprint 5 — Check-in, LGPD e notificações (RU06, RN09, RN10)

Demo: aluno gera QR de 60 s; admin lê com a câmera do celular e o acesso é registrado; inadimplente é barrado; aluno exclui a conta e os dados de saúde somem.

**Back**
- [ ] `checkin`: `POST /qr` (token assinado, 60 s) e `POST /validate` (admin), registro de entrada, bloqueio por RN07
- [ ] Exclusão de conta: anonimização de anamnese e histórico de saúde, mantendo o financeiro anonimizado (RN10)
- [ ] Exportar dados do aluno (JSON)
- [ ] Central de notificações: preferências e histórico de push

**Front**
- [ ] Aluno: tela de QR com renovação automática ao expirar
- [ ] Admin: leitor de QR (expo-camera) com feedback de liberado/bloqueado e lista de acessos do dia
- [ ] Perfil completo: dados, notificações, privacidade, exportar dados, excluir conta

**Design**
- [ ] Ajustes finos de usabilidade (RNF02: botões largos, um clique) nas telas de treino
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
| Front com 2 pessoas é o gargalo | Back entrega contrato em `packages/shared` no início da sprint; telas "se sobrar tempo" caem primeiro |
| Sprint 3 perde uma semana para os documentos V2 | Escopo da Sprint 3 já considera 2 semanas de código |
| Gateway de pagamento indefinido | Pagamento manual pelo admin cobre a demo; gateway é opcional na Sprint 4 |
| Catraca física não existe | Check-in é validado pelo celular do admin; integração com catraca fica fora do escopo |
| Sprint 6 tem 1 semana | Nada novo entra; só build, hospedagem e correções |
