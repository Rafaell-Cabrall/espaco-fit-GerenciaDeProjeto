# App mobile

App do Espaço Fit para aluno, instrutor e administração: Expo SDK 58 + Expo Router + TanStack Query, em TypeScript. Os tipos de request e response vêm de `@espacofit/shared` (o mesmo contrato da API) e não são redeclarados aqui.

## Como rodar

Na raiz do monorepo, com a API no ar (ver [README raiz](../../README.md)):

| Comando | O que faz |
|---|---|
| `npm run dev:mobile` | Expo Go com QR Code na rede local |
| `npm run typecheck` | Verificação de tipos |
| `npm run lint` | Biome (formato e lint) |

O app descobre a API pelo IP do Metro; `EXPO_PUBLIC_API_URL` no `.env` só é preciso para apontar para outro servidor.

## Estrutura

```
app/                  rotas (Expo Router) — só importa e reexporta telas
  (auth)/             login, esqueci a senha, código, nova senha
  (aluno)/(tabs)/     home, treinos, evolução, perfil
  (aluno)/treino/     execução do treino
  (instrutor)/(tabs)/ home, alunos, biblioteca, perfil
  (instrutor)/        agenda, avaliação, fichas, templates, feedbacks
  (admin)/            home do admin
  _layout.tsx         fonte, cache persistido, AuthProvider
  index.tsx           redireciona para a home do perfil logado
src/
  screens/<Nome>/     uma tela por pasta
  design-system/       tokens do Figma (cores, espacamentos, fonte)
  components/          componentes usados por mais de uma tela
  hooks/               hooks de dados (TanStack Query)
  api/                 cliente HTTP, um arquivo por domínio e fila offline
  auth.tsx             sessão do usuário logado
```

Detalhe da organização: [`src/README.md`](src/README.md).

### Rotas e telas

`app/` só define rota: cada arquivo importa uma tela de `src/screens` e a exporta, sem JSX. Uma tela fica em `src/screens/<Nome>/` com `index.tsx` (exporta `<Nome>Screen`), `styles.ts` e, se precisar, `components/` só dela.

Nova tela: criar `src/screens/X/index.tsx` + `styles.ts`, depois o arquivo de rota em `app/(<perfil>)/x.tsx` com duas linhas (import + export default).

### Perfis

A navegação é por grupos do Expo Router, um por perfil: `(auth)`, `(aluno)`, `(instrutor)`, `(admin)`. `homeOf(user)` em `src/auth.tsx` devolve a home de cada perfil e é o destino do login e do `Redirect` do index.

### Camada de dados

- `src/api/client.ts` — `fetch` com validação zod, `Authorization` do SecureStore e renovação do access token uma vez em `401` usando o refresh. Timeout de 10 s para a API não ficar pendurada.
- `src/api/` — um arquivo por domínio (`feedbacks.ts`, `sync.ts`...), chamado pelos hooks.
- `src/hooks/` — `useQuery`/`useMutation` por domínio (`usePlan`, `useFrequency`, `useMeasurements`...).
- Cache persistido em AsyncStorage: a ficha do dia continua visível sem rede (RNF03).
- `src/api/sync.ts` — fila de escritas do treino: mutações pausadas sem rede, na ordem, saindo sozinhas quando a conexão volta; reenviar não duplica porque a sessão tem id gerado no app e as séries são idempotentes na API.
- `src/auth.tsx` — `useAuth()` com `user`, `login` e `logout`; `user === undefined` significa sessão ainda carregando.

### Design system

Tokens (cores, espaçamentos, fonte Space Grotesk do Figma) em [`src/design-system/tokens.ts`](src/design-system/README.md). Componentes base (`Button`, `Input`, `Card`, `Text`, `Field`, `Tabs`...) e compostos (`ExerciseThumb`, `OfflineBanner`, `SairModal`...) em [`src/components/`](src/components/README.md). Hooks de dados em [`src/hooks/`](src/hooks/README.md).

## Documentação relacionada

- [Organização do app](src/README.md)
- [Contratos e rotas da API](../../docs/api/README.md)
- [Decisões técnicas](../../docs/decisoes.md)
- [Planejamento das sprints](../../docs/sprints.md)
