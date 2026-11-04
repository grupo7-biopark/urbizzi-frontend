# Urbizzi Frontend

Interface web do Urbizzi, construída com [Next.js](https://nextjs.org/docs) (App Router, TypeScript `strict`, ESM) e [Tailwind CSS](https://tailwindcss.com/docs) v4, rodando em containers Docker.

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) com Docker Compose v2.24+
- [Node.js](https://nodejs.org) 24 (para rodar lint, testes e o Playwright fora do container)

## Subindo o ambiente

O front e o back ficam em repositórios separados, cada um com o seu compose. O front alcança a API pela porta que o backend publica no host, então a ordem de subida não importa.

**1. Backend** (em outro terminal, no repositório [`urbizzi-backend`](https://github.com/grupo7-biopark/urbizzi-backend)):

```bash
cp .env.example .env        # configure JWT_SECRET antes de iniciar
docker compose up --build
```

**2. Frontend** (neste repositório):

```bash
cp .env.example .env
docker compose up --build
```

**3. Confira:**

| O quê           | Endereço                                                      |
| --------------- | ------------------------------------------------------------- |
| Aplicação       | [localhost:3001](http://localhost:3001)                       |
| Health do front | [localhost:3001/api/health](http://localhost:3001/api/health) |
| API do backend  | [localhost:3000](http://localhost:3000)                       |

O health deve responder:

```json
{ "status": "ok", "apiReachable": true }
```

`apiReachable: false` indica que o front está no ar, mas não alcançou a API. Confira se `docker compose logs api`, no backend, mostra a aplicação iniciada.

Alterações em `src/` e `public/` recarregam sozinhas, por polling (`WATCH_POLL_INTERVAL_MS`), porque eventos de arquivo não atravessam bind mounts no Docker Desktop. O polling consome mais CPU e I/O; se pesar, rode o front [fora do Docker](#desenvolvimento-local-fora-do-docker). Depois de mudar dependências ou arquivos de configuração da raiz, suba de novo com `docker compose up --build`.

Para parar: `docker compose down`.

## Variáveis de ambiente

Todas estão documentadas em [`.env.example`](.env.example) e são validadas com Zod em `src/shared/config/env.schema.ts`. Se alguma obrigatória faltar ou for inválida, a aplicação não inicia e mostra quais estão com problema:

```text
Variáveis de ambiente inválidas. Confira o .env.example.
✖ API_URL é obrigatória e deve ser uma URL http(s) válida
  → at API_URL
```

| Variável              | Obrigatória | Padrão no compose                  | Descrição                                            |
| --------------------- | ----------- | ---------------------------------- | ---------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL` | sim         | `http://localhost:3001`            | URL pública do front; incorporada ao bundle no build |
| `API_URL`             | sim         | valor de `DOCKER_API_URL`          | URL da API, usada só no servidor                     |
| `DOCKER_API_URL`      | compose     | `http://host.docker.internal:3000` | URL da API vista de dentro do container              |
| `WEB_PORT`            | compose     | `3001`                             | Porta do front no host                               |

Dentro do compose, `API_URL` recebe o valor de `DOCKER_API_URL`, porque `localhost` no container é o próprio container. O `API_URL` do `.env` vale para o `npm run dev` fora do Docker.

Variáveis de servidor são lidas com `getServerEnv()` (`env.server.ts`), que não pode ser importado por código do navegador. Variáveis públicas vêm de `publicEnv` (`env.public.ts`).

## Desenvolvimento local (fora do Docker)

```bash
npm ci
cp .env.example .env
npm run dev
```

## Scripts

| Comando                | O que faz                                   |
| ---------------------- | ------------------------------------------- |
| `npm run dev`          | Servidor de desenvolvimento na porta 3001   |
| `npm run build`        | Build de produção (exige `.env` preenchido) |
| `npm run lint`         | oxlint                                      |
| `npm run format`       | Formata com Prettier                        |
| `npm run format:check` | Confere a formatação                        |
| `npm run typecheck`    | Gera os tipos de rota e roda o `tsc`        |
| `npm test`             | Testes unitários e de componente (Vitest)   |
| `npm run test:cov`     | Testes com relatório de cobertura           |
| `npm run test:e2e`     | Testes e2e (Playwright)                     |

Antes do primeiro `npm run test:e2e`, instale o navegador com `npx playwright install chromium`. O Playwright sobe o servidor sozinho, ou reaproveita o que já estiver na porta 3001.

## Integração contínua

O GitHub Actions roda lint, formatação, tipos, testes com cobertura, build e e2e em todo Pull Request e em todo push na `main`. O pipeline leva **cerca de 1 minuto**, porque os dois jobs rodam em paralelo. Detalhes em [docs/testing.md](docs/testing.md#integração-contínua).

## Estrutura

```text
src/
  app/            rotas do App Router
  features/       módulos por funcionalidade
  shared/         código compartilhado (ex.: config/ com a validação de ambiente)
e2e/              testes do Playwright
```

## Imagem de produção

O `Dockerfile` é multi-stage. O target `development` é usado pelo compose; o target `production` gera uma imagem só com o servidor [`standalone`](https://nextjs.org/docs/app/api-reference/config/next-config-js/output). Como `NEXT_PUBLIC_APP_URL` é incorporada no build, ela é um argumento da imagem, enquanto `API_URL` é informada ao executar:

```bash
docker build --target production --build-arg NEXT_PUBLIC_APP_URL=https://app.exemplo.com -t urbizzi-frontend .
docker run -p 3001:3001 -e API_URL=https://api.exemplo.com urbizzi-frontend
```

## Solução de problemas

**`Cannot find native binding` ao rodar o Vitest.** Bug do npm com dependências opcionais ([npm/cli#4828](https://github.com/npm/cli/issues/4828)): `npm install <pacote>` ou `npm uninstall <pacote>` com o `node_modules` já existente pode remover os binários nativos do `package-lock.json`. Depois de alterar dependências, confira se o lock ainda tem as entradas `@rolldown/binding-*`. Se não tiver, regenere:

```bash
rm -rf node_modules package-lock.json
npm install
```

**Porta 3001 ocupada.** Defina outra em `WEB_PORT` e ajuste `NEXT_PUBLIC_APP_URL` no `.env`.
