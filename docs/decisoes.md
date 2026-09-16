# Decisões técnicas

Complementa o Documento Arquitetural v1 (React Native + Expo, Node + Express, PostgreSQL + Prisma, Redis + BullMQ, MinIO/S3, Expo Push, JWT próprio, monólito modular + worker). Cada item: contexto → decisão → consequência.

## 1. Monorepo com npm workspaces
1 back e 2 fronts precisam do mesmo contrato de API. `packages/shared` guarda os schemas zod usados dos dois lados. Sem Turborepo/Nx: três pacotes não justificam. Consequência: um `npm install` na raiz. Sem CI: a equipe roda lint, typecheck e testes localmente antes do PR.

## 2. Node 24 executa TypeScript nativamente
Sem ts-node/tsx/build step: `node src/server.ts`. Imports relativos usam extensão `.ts` e o `tsconfig` liga `erasableSyntaxOnly` (proíbe `enum`, parameter properties e namespaces com valor). `.nvmrc` = 24 fixa a versão para a equipe.

## 3. Senha com `crypto.scrypt` (stdlib)
Atende RNF04 sem bcrypt. Formato salvo: `salt:hash` em hex.

## 4. Biome no lugar de ESLint + Prettier
Uma ferramenta, uma config na raiz, roda em ms. `npm run lint:fix` formata tudo.

## 5. Testes com `node --test`
Sem Jest/Vitest. Testes da API são de integração e batem no Postgres do `docker compose`. Um arquivo por módulo em `apps/api/test/`.

## 6. Offline no app: TanStack Query persistido
`persistQueryClient` + AsyncStorage mantém a ficha do dia visível sem rede e reenvia mutações quando a conexão volta (RNF03). Evita escrever sincronização à mão. SQLite não é necessário para o volume de dados.

## 7. Navegação por perfil: grupos do Expo Router
`app/(auth)`, `app/(aluno)`, `app/(instrutor)`, `app/(admin)`. O `_layout` de cada grupo redireciona quem não tem o perfil. Admin usa o mesmo app (decisão da equipe: nada de painel web).

## 8. Check-in (RU06) sem hardware
O aluno gera um QR = JWT assinado com 60 s de validade. O celular da recepção (perfil Admin) lê o QR com a câmera e chama `POST /checkin/validate`. Se um dia houver catraca, ela chama o mesmo endpoint.

## 9. Pagamento (RU05) sem gateway por enquanto
A equipe ainda não decidiu se haverá pagamento no app. `Subscription`/`Payment` já existem; `Payment.provider`/`externalId` ficam nulos. Registro manual pelo Admin cobre o painel financeiro. Se entrar gateway, a recomendação é Mercado Pago (Pix) via webhook — nunca guardar dados de cartão (RNF05).

## 10. Uma fila BullMQ, jobs por nome
`apps/api/src/lib/queue.ts` declara o tipo de cada job; `worker.ts` mapeia nome → handler. Rotinas diárias (RN04 ficha vencida, RN06 cobrança, RN07 bloqueio) entram como *repeatable jobs*.

## 11. Portas do Docker deslocadas
Postgres em `5433` e Redis em `6380` para não colidir com outros projetos na mesma máquina.

## 12. Recuperação de senha por código de 6 dígitos
Segue as telas do Figma ("Verifique seu e-mail"). O SHA-256 do código fica em `User.resetCode`, com validade de 10 min. O código vai por e-mail pelo job `email` do worker, com nodemailer via SMTP: Gmail com senha de app serve para a demo, e trocar de provedor é só mudar as variáveis `SMTP_*`. Sem `SMTP_HOST`, o worker imprime o e-mail no console; em produção isso é erro, para não vazar o código em log. Cada código aceita 5 conferências somadas entre `verify-reset-code` e `reset-password`; a contagem sobe antes da comparação, então requisições em paralelo não furam o limite. "Reenviar código" gera outro e zera a contagem.

## 13. Sessões revogáveis e limites de tentativa
JWT puro não tem logout. `User.tokenVersion` vai no token e o middleware `auth` confere a cada requisição, com uma leitura por chave primária. Sair, redefinir a senha ou desativar a conta derruba todos os tokens na hora, em todos os aparelhos. Sessão por aparelho exigiria uma tabela de refresh tokens; não compensa para o uso de uma academia.
Limites ficam no Redis que a fila já usa: o login trava por 15 min após 10 erros no mesmo e-mail, e a redefinição de senha destrava. O código de recuperação exige 60 s entre envios (o timer do Figma) e no máximo 5 por hora, valendo também para e-mail sem conta, para a resposta não revelar quem é cliente. Conta desativada recebe 403 só depois da senha certa.
