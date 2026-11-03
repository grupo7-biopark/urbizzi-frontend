# AGENTS.md

Guia para agentes de IA (Claude Code, Codex, Cursor, Copilot etc.) e para os integrantes do time. **Leia este arquivo inteiro antes de alterar o código.** Os detalhes de cada assunto estão em `docs/`; em caso de conflito, `docs/` prevalece sobre o que você "acha" que é o padrão do Next.js.

## Visão geral

Frontend do **Urbizzi**: sistema de gestão de loteamentos (cadastro de loteamentos, quadras e lotes, reservas com prazo, propostas com análise do gestor, planta interativa com marcadores e link público do mapa).

É uma aplicação **Next.js com App Router**, organizada por funcionalidade em `src/features/<modulo>/`. Ela consome a API NestJS do repositório [`urbizzi-backend`](https://github.com/grupo7-biopark/urbizzi-backend) por meio de um BFF: o navegador só fala com o Next, que guarda os tokens em cookies `httpOnly`.

## Stack

| Item              | Tecnologia                                             | Situação                     |
| ----------------- | ------------------------------------------------------ | ---------------------------- |
| Runtime           | Node.js 24, ESM (`"type": "module"`)                   | em uso                       |
| Framework         | Next.js 16 (App Router), React 19, TypeScript `strict` | em uso                       |
| Estilo            | Tailwind CSS v4                                        | em uso; tokens na FE-04      |
| Validação         | Zod (variáveis de ambiente)                            | em uso; formulários na FE-06 |
| Lint / formatação | oxlint + Prettier                                      | em uso                       |
| Testes            | Vitest + Testing Library, Playwright                   | em uso; MSW na FE-05         |
| Infra local       | Docker Compose (`web`)                                 | em uso                       |
| Dados             | TanStack Query, `openapi-fetch`, `openapi-typescript`  | previsto (FE-05)             |
| Formulários       | `react-hook-form`                                      | previsto (FE-06)             |
| Mapa              | Leaflet                                                | previsto (FE-27)             |

## Comandos

```bash
docker compose up --build      # sobe o front com hot reload em http://localhost:3001
npm run dev                    # front fora do Docker (precisa de .env)
npm run lint                   # oxlint
npm run format                 # Prettier (escreve)
npm run format:check           # Prettier (só verifica)
npm run typecheck              # gera os tipos de rota e roda o tsc
npm run build                  # build de produção (precisa de .env)
npm test                       # testes unitários e de componente
npm run test:cov               # os mesmos, com cobertura
npm run test:e2e               # testes e2e (Playwright)
npx vitest run caminho/arquivo.test.ts   # um arquivo só
```

Antes de dizer que terminou: `npm run lint && npm run format:check && npm run typecheck && npm run test:cov && npm run build` precisam passar. Se mexeu em tela, rota ou sessão, rode também `npm run test:e2e`.

Depois de `npm install <pacote>` ou `npm uninstall <pacote>`, confira se o `package-lock.json` ainda tem as entradas `@rolldown/binding-*` (ver o [README](README.md#solução-de-problemas)).

## Mapa de documentação

| Arquivo                                                                                                                                                           | Leia quando for...                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [docs/architecture.md](docs/architecture.md)                                                                                                                      | criar ou alterar uma funcionalidade, escolher entre Server e Client Component, decidir onde buscar dados, criar rotas, e consultar o **exemplo completo de funcionalidade** |
| [docs/conventions.md](docs/conventions.md)                                                                                                                        | nomear arquivos, componentes, hooks e rotas; escrever commits e branches                                                                                                    |
| [docs/api-integration.md](docs/api-integration.md)                                                                                                                | chamar a API: tipos gerados, cliente, erros, query keys, invalidação, paginação e filtros na URL                                                                            |
| [docs/ui.md](docs/ui.md)                                                                                                                                          | montar telas: design system, regras da marca, padrões de listagem, formulário, detalhe e confirmação, estados de carregamento, vazio e erro                                 |
| [docs/testing.md](docs/testing.md)                                                                                                                                | escrever testes unitários, de componente e e2e                                                                                                                              |
| [docs/security.md](docs/security.md)                                                                                                                              | sessão, proteção de rotas, permissões por perfil, LGPD e página pública                                                                                                     |
| `node_modules/next/dist/docs/`                                                                                                                                    | usar uma API do Next.js: é a documentação da versão instalada                                                                                                               |
| Backend: [`docs/api-standards.md`](https://github.com/grupo7-biopark/urbizzi-backend/blob/main/docs/api-standards.md)                                             | conferir os padrões da API                                                                                                                                                  |
| Backend: [`docs/Urbizzi - Escopo do Sistema v2.md`](https://github.com/grupo7-biopark/urbizzi-backend/blob/main/docs/Urbizzi%20-%20Escopo%20do%20Sistema%20v2.md) | entender o negócio: perfis, fluxos, regras (RN), requisitos (RF/RNF). É a fonte dos códigos citados nas issues                                                              |
| Backend: `src/modules/<modulo>/OVERVIEW.md`                                                                                                                       | conhecer as regras, os endpoints e os códigos de erro do módulo que a tela consome                                                                                          |

## Regras obrigatórias

1. **Siga a estrutura de funcionalidade** de [docs/architecture.md](docs/architecture.md#estrutura-de-uma-funcionalidade). Não crie pastas ou camadas novas sem atualizar a documentação no mesmo PR.
2. **Uma funcionalidade nunca importa arquivos internos de outra**, e `src/shared/` nunca importa de `src/features/`.
3. **Páginas são finas**: leem a URL, conferem a permissão e compõem componentes de `src/features/`. Regra de tela fica na funcionalidade; regra de negócio fica no backend.
4. **Server Component por padrão.** Use `'use client'` só onde houver estado, evento, hook ou API do navegador.
5. **Nenhum DTO da API digitado à mão.** Os tipos vêm de `src/shared/api/schema.d.ts`, gerado do OpenAPI, que não é editado à mão.
6. **Nenhum `fetch` direto em componente.** Chame a API pelas funções de `features/<modulo>/api/`, com TanStack Query no cliente. Query keys ficam em `<modulo>.queries.ts`.
7. **Toda mutação invalida as queries afetadas.**
8. **Erros são tratados pelo `code`**, nunca pelo texto, e chegam à tela como `ApiError`, com mensagem em português.
9. **Toda tela com dados trata carregamento, vazio e erro**, com os componentes e padrões de [docs/ui.md](docs/ui.md).
10. **Use o design system e os tokens.** Sem cores fixas, cantos arredondados, sombras ou gradientes. Status usa cor e texto.
11. **Acessibilidade não é opcional**: teclado, foco visível, rótulos, contraste de 4,5:1.
12. **Permissões vêm do mapa central**, nunca de comparações de perfil no componente. A interface não é a única barreira: trate o `403` da API.
13. **Nunca guarde tokens nem dados pessoais no navegador**, e nunca coloque dados pessoais em URL ou log (ver [docs/security.md](docs/security.md)).
14. **Código com segredo, cookie de sessão ou `API_URL` usa `import 'server-only'`.** Variáveis de ambiente passam pelo schema de `src/shared/config/`.
15. **A página pública não expõe** dados de cliente, reserva, proposta ou usuário interno, nem nas respostas de rede.
16. **Toda mudança de comportamento vem com teste** (ver [docs/testing.md](docs/testing.md)).
17. **Idioma**: termos de domínio em português sem acento (`Loteamento`, `dataVencimento`); termos técnicos em inglês (`useCreateLoteamento`, `queryKey`); textos para pessoas (tela, mensagens, docs, commits) em português.
18. **Não use o que ainda não existe.** Itens marcados como "previsto" dependem da issue citada.
19. Não adicione dependências novas sem necessidade clara; se adicionar, justifique no PR.

## Como criar uma tela nova (checklist)

1. Leia a issue, o [exemplo completo](docs/architecture.md#exemplo-completo-funcionalidade-loteamentos) e o `OVERVIEW.md` do módulo do backend.
2. Se o contrato da API mudou, rode `npm run api:generate`.
3. Crie `src/features/<modulo>/` copiando a estrutura do exemplo:
   - `api/<modulo>.api.ts` e `api/<modulo>.queries.ts`
   - `hooks/use-<acao>-<entidade>.ts`
   - `schemas/<entidade>-form.schema.ts` e `schemas/<modulo>-search.schema.ts`
   - `components/<modulo>-table.tsx` e `components/<entidade>-form.tsx`
4. Crie a rota em `src/app/(app)/<modulo>/page.tsx`, conferindo a permissão na [matriz](docs/security.md#matriz-de-permissões).
5. Trate os estados de carregamento, vazio e erro, e confira no celular e nos dois temas.
6. Escreva os testes: unitários dos schemas, de componente com MSW e e2e do fluxo principal.
7. Rode a verificação completa (seção [Comandos](#comandos)) e abra o PR usando o template, com capturas de tela.

## O que já existe em `src/`

| Caminho                                         | O que é                                                                     |
| ----------------------------------------------- | --------------------------------------------------------------------------- |
| `instrumentation.ts`, `instrumentation-node.ts` | validam o ambiente ao subir o servidor e encerram o processo se houver erro |
| `shared/config/env.schema.ts`                   | schemas Zod das variáveis e `parseEnv()`                                    |
| `shared/config/env.server.ts`                   | `getServerEnv()`, só no servidor                                            |
| `shared/config/env.public.ts`                   | `publicEnv`, disponível também no navegador                                 |
| `app/layout.tsx`, `app/globals.css`             | layout raiz e importação do Tailwind                                        |
| `app/page.tsx`                                  | página inicial provisória                                                   |
| `app/api/health/route.ts`                       | `GET /api/health`, informando também se a API foi alcançada                 |

Previsto em issues futuras (não use antes de existir): design system em `shared/ui/` (FE-04); cliente da API, `ApiError` e TanStack Query em `shared/api/` (FE-05); `DataTable`, `Form` e máscaras (FE-06); sessão, proxy BFF e `src/proxy.ts` (FE-07); permissões em `shared/auth/` (FE-08).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
