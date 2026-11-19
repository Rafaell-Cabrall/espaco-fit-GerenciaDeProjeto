# Espaço Fit — Gerência de Projeto

App mobile de gestão de academia (aluno, instrutor e administração), desenvolvido no contexto acadêmico da Universidade Federal do Ceará (UFC).

Este projeto dá continuidade ao aplicativo desenvolvido na disciplina de PIES3, reaproveitando sua arquitetura e funcionalidades.

## Arquitetura do projeto

Monorepo com API Node, app Expo e contratos compartilhados.

```
apps/api        Node 24 + Express 5 + Prisma (PostgreSQL) + BullMQ (worker)
apps/mobile     Expo SDK 58 + Expo Router + TanStack Query
packages/shared schemas Zod compartilhados (contrato da API)
docs/           requisitos, arquitetura, decisões, sprints e exports do Figma
```

## Rodando pela primeira vez

Pré-requisitos:

- Node.js 24
- NVM
- Docker e Docker Compose
- Expo Go no celular
- Git

Na raiz do projeto, execute:

```bash
nvm use
npm install

cp .env.example .env
docker compose up -d

npm run db:migrate
npm run db:seed
```

Ajuste a variável `EXPO_PUBLIC_API_URL` para o IP da sua máquina.

Para descobrir o IP no Linux:

```bash
hostname -I
```

### Usuários de teste

| Perfil | E-mail | Senha |
|---|---|---|
| Administrador | admin@espacofit.com | Senha123 |
| Instrutor | instrutor@espacofit.com | Senha123 |
| Aluno | joao@email.com | Senha123 |

Credenciais destinadas exclusivamente ao ambiente local de desenvolvimento.

## Inicializando o projeto

Execute os comandos abaixo em terminais separados, a partir da raiz do projeto.

### Terminal 1 — Infraestrutura

```bash
docker compose up -d
docker compose ps
```

### Terminal 2 — Backend

```bash
npm run dev:api
```

API disponível na porta 3000. Endpoint de verificação: `GET /health`.

### Terminal 3 — Worker

```bash
npm run dev:worker
```

Responsável pelas filas BullMQ, notificações, e-mails e rotinas diárias.

### Terminal 4 — Aplicativo mobile

```bash
npm run dev:mobile
```

Escaneie o QR Code utilizando o Expo Go.

O celular e o computador devem estar conectados à mesma rede.

## Comandos úteis

| Comando | O que faz |
|---|---|
| `npm run lint` | Verifica o código com Biome |
| `npm run lint:fix` | Corrige problemas de lint e formatação |
| `npm run typecheck` | Verifica a tipagem TypeScript nos pacotes |
| `npm -w apps/api test` | Executa os testes da API |
| `npm -w apps/api run prisma:studio` | Abre a interface do banco de dados |
| `npm -w apps/api run prisma:migrate -- --name <nome>` | Cria uma nova migração |

## Fluxo de trabalho

- Utilizar a branch `main` como base do desenvolvimento.
- Criar branches individuais para novas funcionalidades.
- Abrir Pull Requests para integrar alterações à `main`.
- Revisar o código antes de realizar o merge.
- Executar lint, typecheck e testes antes de finalizar uma tarefa.
- Utilizar Squash Merge quando apropriado.
- Não publicar arquivos `.env`, senhas ou tokens.

### Criando uma branch

```bash
git checkout main
git pull origin main
git checkout -b feat/<ru>-<descricao>
```

Exemplo:

```bash
git checkout -b feat/ru01-fichas
```

### Enviando alterações

```bash
git add .
git commit -m "feat: descricao da funcionalidade"
git push -u origin HEAD
```

Depois, abra um Pull Request no GitHub.

## Padrões de desenvolvimento

- Contratos novos ou alterados devem ser definidos em `packages/shared` antes de serem utilizados pelo frontend e backend.
- Os módulos da API ficam em `apps/api/src/modules/<nome>/{router,service}.ts`.
- Módulos que ainda respondem 501 estão identificados com `TODO(sprint N)`.
- No aplicativo mobile, o diretório `app/` contém as rotas.
- As telas ficam em `apps/mobile/src/screens/<Nome>/`.

## Documentação

- [Decisões técnicas](docs/decisoes.md)
- [Planejamento das sprints](docs/sprints.md)
- [Padrões de desenvolvimento mobile](apps/mobile/src/README.md)

## Instituição

Universidade Federal do Ceará — UFC
Campus Quixadá

Disciplina: Gerência de Projeto (2026.2 - T01)

## Créditos

Projeto derivado do Espaço Fit, originalmente desenvolvido na disciplina de PIES3.

O histórico de commits foi preservado para manter os créditos dos desenvolvedores originais.
