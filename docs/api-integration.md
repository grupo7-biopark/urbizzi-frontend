# Integração com a API

> **Status:** previsto na FE-05 (cliente, erros, TanStack Query e MSW) e na FE-07 (proxy autenticado). Nada disso existe ainda; este documento define como as issues devem entregar. Os padrões da API vêm de [`docs/api-standards.md`](https://github.com/grupo7-biopark/urbizzi-backend/blob/main/docs/api-standards.md) no backend. Se houver divergência, o backend prevalece.

## Tipos gerados do OpenAPI

O backend publica o contrato em `/docs-json`. Os tipos são gerados com `openapi-typescript` para `src/shared/api/schema.d.ts`, arquivo versionado e que nunca é editado à mão:

```bash
npm run api:generate   # com o backend no ar
```

- **Nenhum DTO do backend é digitado à mão.** Derive os tipos do schema:

```ts
import type { components, paths } from '@/shared/api/schema';

type Lote = components['schemas']['LoteDto'];
type ListLotesQuery = NonNullable<
  paths['/v1/lotes']['get']['parameters']['query']
>;
```

- Depois de uma mudança no backend, rode `npm run api:generate` e `npm run typecheck`, e corrija o que quebrar no mesmo PR.
- As rotas no schema já incluem o versionamento (`/v1/loteamentos`). Por isso, o `baseUrl` dos clientes **não** leva `/v1`, embora a FE-05 cite "URL base `/v1`": senão, a URL fica `/v1/v1/...`. Confirme no primeiro `schema.d.ts` gerado.
- Use as rotas que estão no schema, não as citadas de memória ou nas issues. Rotas previstas podem ter mudado ao serem implementadas.

## Cliente

Há um único jeito de chamar o backend, com `openapi-fetch`, e dois clientes com os mesmos tipos:

| Cliente          | Arquivo                       | Usado em                          | Destino                          |
| ---------------- | ----------------------------- | --------------------------------- | -------------------------------- |
| `api`            | `shared/api/client.ts`        | Client Components                 | `/api/backend` (proxy BFF)       |
| `getServerApi()` | `shared/api/client.server.ts` | Server Components, Route Handlers | `API_URL`, com o token do cookie |

Cada funcionalidade expõe funções em `features/<modulo>/api/<modulo>.api.ts`. Componentes e hooks chamam essas funções, nunca o cliente direto.

O `openapi-fetch` não lança erro: ele devolve `{ data, error, response }`. O helper `unwrap()` transforma o erro em `ApiError`, que é o que o TanStack Query espera:

```ts
// src/features/lotes/api/lotes.api.ts
import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';

export function getLote(id: string) {
  return unwrap(api.GET('/v1/lotes/{id}', { params: { path: { id } } }));
}
```

O cliente do navegador tem dois cuidados, ambos necessários para os testes:

```ts
// src/shared/api/client.ts
import createClient from 'openapi-fetch';
import type { paths } from './schema';

// No servidor, este módulo só é avaliado na renderização inicial, quando o
// useQuery ainda não dispara requisições, então a origem vazia não é usada.
const origin = typeof window === 'undefined' ? '' : window.location.origin;

export const api = createClient<paths>({
  baseUrl: `${origin}/api/backend`,
  fetch: (request) => globalThis.fetch(request),
});
```

- **URL absoluta**: no Node, inclusive nos testes, o `Request` não aceita URL relativa.
- **`fetch` lido a cada chamada**: por padrão, o `openapi-fetch` guarda o `globalThis.fetch` ao ser criado. Como o cliente nasce no import, antes de `server.listen()`, o MSW não interceptaria nada e os testes fariam requisições reais.

## Tratamento de erros

Toda resposta de erro da API tem o mesmo formato:

```json
{
  "statusCode": 400,
  "code": "DADOS_INVALIDOS",
  "message": "Os dados enviados são inválidos",
  "details": [{ "field": "nome", "messages": ["nome should not be empty"] }],
  "path": "/v1/loteamentos",
  "timestamp": "2026-10-28T12:00:00.000Z"
}
```

Ele vira um `ApiError` (`shared/api/errors.ts`), com `statusCode`, `code`, `message` e `details`. Falha de rede também vira `ApiError`, com mensagem própria.

Regras:

1. **Trate pelo `code`, nunca pelo texto da `message`.** O `code` é estável; o texto pode mudar.
2. **Mostre mensagens com `getErrorMessage(error)`**, que usa o mapa de mensagens amigáveis e, na falta dele, a `message` da API ou um texto genérico.
3. **`details` pode vir em inglês.** Em `DADOS_INVALIDOS`, as mensagens de `class-validator` são do tipo `nome should not be empty`. Por isso, o schema Zod do formulário valida antes com textos em português, e o erro de campo da API é só a última barreira.
4. `details[].field` pode ter caminho aninhado (`endereco.cep`) e mapeia direto para o nome do campo no `react-hook-form`.
5. Nunca exiba corpo de resposta bruto, stack ou mensagens de exceção do JavaScript.

| HTTP | `code`                         | Na interface                                                        |
| ---- | ------------------------------ | ------------------------------------------------------------------- |
| 400  | `DADOS_INVALIDOS`              | erro embaixo de cada campo (`details`)                              |
| 400  | `REQUISICAO_INVALIDA`          | mensagem genérica                                                   |
| 401  | `NAO_AUTENTICADO`              | o proxy tenta renovar; se falhar, vai para `/login?redirect=...`    |
| 401  | `CREDENCIAIS_INVALIDAS`        | mensagem única no login, sem indicar qual campo errou               |
| 403  | `ACESSO_NEGADO`                | mensagem ou tela 403; também acontece com o botão escondido (RNF06) |
| 404  | `<ENTIDADE>_NAO_ENCONTRAD[OA]` | tela ou estado de "não encontrado"                                  |
| 409  | ex.: `LOTE_INDISPONIVEL`       | mensagem da API e recarga dos dados, porque o estado mudou          |
| 422  | ex.: `RESERVA_NAO_RENOVAVEL`   | mensagem da API                                                     |
| 429  | `MUITAS_REQUISICOES`           | pede para aguardar antes de tentar de novo                          |
| 500  | `ERRO_INTERNO`                 | mensagem genérica, com opção de tentar novamente                    |

## TanStack Query

### Configuração

O `QueryClientProvider` fica em um Client Component no layout raiz, seguindo o guia oficial de SSR avançado: um `QueryClient` novo por requisição no servidor e um único no navegador.

Padrões:

- `retry`: só para erro de rede e 5xx. Nunca em 4xx.
- `staleTime` acima de zero, para evitar nova busca logo após hidratar.

### Chaves

Cada funcionalidade define as chaves em `<modulo>.queries.ts`, em hierarquia, junto com `queryOptions`. Nunca escreva chaves soltas nos componentes.

```ts
export const lotesKeys = {
  all: ['lotes'] as const,
  lists: () => [...lotesKeys.all, 'list'] as const,
  list: (query: ListLotesQuery) => [...lotesKeys.lists(), query] as const,
  details: () => [...lotesKeys.all, 'detail'] as const,
  detail: (id: string) => [...lotesKeys.details(), id] as const,
};
```

- O primeiro elemento é o nome da funcionalidade.
- Filtros e paginação entram na chave como objeto: mudar a página é mudar a chave.
- Use `placeholderData: keepPreviousData` em listagens, para a tabela não piscar ao trocar de página.

### Invalidação após mutações

Toda mutação invalida o que ela pode ter alterado, no `onSuccess` de `useMutation`, devolvendo a `Promise`. A invalidação compara por prefixo, então `lists()` alcança todas as páginas e filtros.

```ts
return useMutation({
  mutationFn: reservarLote,
  onSuccess: (reserva) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: reservasKeys.lists() }),
      queryClient.invalidateQueries({
        queryKey: lotesKeys.detail(reserva.loteId),
      }),
      queryClient.invalidateQueries({ queryKey: lotesKeys.lists() }),
    ]),
});
```

Pense no efeito no sistema inteiro: uma reserva muda a reserva, o lote, o mapa e o painel. Em `409`, invalide também: a tela está mostrando um estado que já mudou.

Não faça atualização otimista em operações sujeitas a conflito, como reservar um lote: a API é quem decide quem ganhou (RNF04).

## Paginação

Toda listagem da API é paginada: `page` (padrão 1) e `pageSize` (padrão 20, máximo 100). A resposta é:

```json
{
  "data": [{ "id": "0b6f3c1e-8a52-4a8e-9d3f-2c7f1e5a9b10", "numero": "12" }],
  "meta": { "page": 2, "pageSize": 20, "total": 57, "totalPages": 3 }
}
```

Página além da última responde `200` com `data: []`. Nesse caso, mostre o estado vazio com uma ação para voltar à primeira página.

## Filtros na URL

Página, filtros e busca ficam nos search params, para sobreviver a recarregar e poder ser compartilhados. Exceção: dados pessoais, abaixo.

- Os nomes são os mesmos da API.
- Valide os search params com Zod, com `.catch()`, porque a URL é entrada do usuário.
- Ao mudar um filtro, volte para `page=1`.
- Busca textual usa `q`, com debounce antes de alterar a URL.

| Filtro              | Formato                                     | Exemplo                                                     |
| ------------------- | ------------------------------------------- | ----------------------------------------------------------- |
| Igualdade           | nome do campo                               | `?quadraId=...`                                             |
| Vários valores      | separados por vírgula                       | `?status=DISPONIVEL,RESERVADO`                              |
| Busca textual       | `q`                                         | `?q=bela`                                                   |
| Intervalo inclusivo | sufixos `De` e `Ate`                        | `?dataVencimentoDe=2026-11-01&dataVencimentoAte=2026-11-30` |
| Booleano            | `true` ou `false`                           | `?ativo=true`                                               |
| Ordenação           | `orderBy` e `order`, quando a rota permitir | `?orderBy=createdAt&order=desc`                             |

Filtro desconhecido gera `400 DADOS_INVALIDOS`, então não repasse à API parâmetros que ela não declara.

> **Dado pessoal não vai para a URL da tela** ([security.md](security.md#lgpd-na-interface)). A busca de clientes aceita nome e documento, então o `q` dessa tela fica só em estado de componente, mesmo que o resto da listagem use a URL. Essa é uma exceção à FE-06 ("recarregar mantém a busca"), válida para buscas que aceitam dado pessoal.

## Tipos de dados

| Tipo            | Na API                         | No front                                                         |
| --------------- | ------------------------------ | ---------------------------------------------------------------- |
| Dinheiro e área | string decimal (`"250000.00"`) | mantenha como string; use formatadores só para exibir            |
| Data e hora     | ISO 8601 UTC                   | converta para o fuso local só ao exibir                          |
| Data sem hora   | `YYYY-MM-DD`                   | não use `new Date()` direto, porque o fuso pode mudar o dia      |
| Campo sem valor | `null`, nunca omitido          | trate `null` explicitamente; envie `null` para limpar no `PATCH` |
