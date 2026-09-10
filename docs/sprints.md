# Sprints (3 × 15 dias)

Equipe: 1 back, 2 front, 1 design. Cada item referencia o Documento de Requisitos v3.

## Sprint 1 — Base, cadastro e ficha (RU01)

**Back**
- [x] Setup: monorepo, Docker, Prisma, auth (register/login/refresh/me, esqueci a senha), middlewares `auth`/`requireRole`/`requireLink`, CI
- [ ] `users`: CRUD do Admin (criar instrutor/aluno, ativar/desativar)
- [ ] `links`: vincular aluno ↔ instrutor (um ativo por aluno)
- [ ] `anamnesis`: GET/PUT com `consentAt` obrigatório (RN09)
- [ ] `exercises`: biblioteca + URL assinada de upload no MinIO (RNF06)
- [ ] `plans`: criar/editar ficha com divisões e exercícios; modelos; publicar só com anamnese (RN05)
- [ ] job de e-mail para o código de recuperação de senha

**Front**
- [ ] Splash / onboarding, Login, Cadastro (com aceite LGPD), Esqueci a senha (código de 6 dígitos), telas de sucesso
- [ ] Aluno: anamnese no primeiro acesso
- [ ] Instrutor: lista de alunos, montar ficha, biblioteca de exercícios
- [ ] Componentes base (botão, input, card, tabs) a partir do Figma

**Design**
- [ ] Fechar telas de Instrutor e Admin (hoje vazias no Figma)
- [ ] Telas de execução de treino para a sprint 2

## Sprint 2 — Execução de treino (RU02, RU03, RN02–RN04, RN08)

**Back**
- [ ] `sessions`: iniciar/finalizar sessão, registrar séries com carga, notas por exercício, feedback de esforço
- [ ] Treino do dia (rotação A→B→C, RN08), calendário de frequência, streak (RN03)
- [ ] `measurements`: medidas corporais (peso, gordura, músculo) para a aba Evolução
- [ ] Push ao instrutor quando aluno finaliza treino (job `push`)
- [ ] Job diário: marcar ficha vencida > 60 dias (RN04)

**Front**
- [ ] Home do aluno (sequência, treino do dia, avisos, contrato)
- [ ] Meus Treinos (abas A/B/C), tela de execução com cronômetro de descanso e som
- [ ] Evolução: Resumo, Anamnese, Frequência (calendário)
- [ ] Offline: cache persistido + fila de mutações (TanStack Query)
- [ ] Instrutor: histórico e feedback dos alunos

**Design**
- [ ] Telas de Financeiro, Check-in, Feed e Admin

## Sprint 3 — Gestão (RU04–RU07, RN06, RN07, RN10)

**Back**
- [ ] `feed`: comunicados (Admin escreve, todos leem)
- [ ] `billing`: assinatura, dias restantes, registro de pagamento manual, bloqueio progressivo (RN07), job diário de cobrança com push + e-mail (RN06)
- [ ] `checkin`: `POST /qr` (aluno) e `POST /validate` (admin), bloqueio de inadimplente
- [ ] `links`: troca de instrutor mantendo histórico (RU07)
- [ ] Exclusão de conta e dados (RN10)
- [ ] Se decidido: gateway de pagamento (Pix) via webhook

**Front**
- [ ] Home com feed de avisos
- [ ] Aba Financeiro e Perfil completo (dados, notificações, privacidade, exportar dados)
- [ ] Tela de QR do aluno; leitor de QR no Admin
- [ ] Admin: usuários, vínculos, comunicados, inadimplência

**Design**
- [ ] Revisão final e ajustes de usabilidade
