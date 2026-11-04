# Arquitetura

O frontend do Urbizzi é uma aplicação Next.js com App Router, organizada **por funcionalidade**. As telas falam com a API NestJS do [backend](https://github.com/grupo7-biopark/urbizzi-backend) por meio de um BFF: o navegador só conversa com o próprio Next, que guarda os tokens e repassa as chamadas.

Objetivos:

- **Previsibilidade**: toda funcionalidade tem a mesma forma. Quem conhece uma conhece todas (inclusive a IA).
- **Isolamento**: cada funcionalidade é dona das suas telas, chamadas e regras de formulário.
- **Contrato único**: os tipos da API são gerados do OpenAPI, nunca digitados à mão.

> **Status:** a base da FE-01 (`src/app`, `src/shared/config`, health e validação de ambiente), a camada de API da FE-05 (`src/shared/api`, `src/test`) e a sessão da FE-07 (`src/proxy.ts`, `src/shared/auth`, `src/features/auth`, rotas de `/api`) existem. O que está marcado como "previsto" neste documento ainda não existe. Os exemplos mostram a forma que o código deve ter quando as issues citadas forem entregues; ao implementá-las, atualize este arquivo no mesmo PR se o resultado for diferente.

## Estrutura de pastas

```text
src/
├── instrumentation.ts            # valida o ambiente ao subir o servidor
├── instrumentation-node.ts
├── proxy.ts                      # redirecionamento otimista por sessão
├── app/                          # só rotas: páginas finas que compõem funcionalidades
│   ├── layout.tsx                # layout raiz
│   ├── globals.css
│   ├── (auth)/                   # login; recuperação de senha prevista (FE-09)
│   ├── (app)/                    # telas internas, com sessão; menu previsto (FE-08)
│   ├── (publico)/                # previsto: mapa público por token
│   └── api/
│       ├── health/route.ts       # GET /api/health
│       ├── auth/                 # login, logout e renovação
│       └── backend/[...path]/    # proxy autenticado para a API
├── features/                     # funcionalidades de negócio
│   └── <modulo>/
│       ├── components/
│       ├── hooks/
│       ├── api/
│       └── schemas/
├── shared/                       # código transversal, sem regra de nenhuma funcionalidade
│   ├── config/                   # validação de ambiente
│   ├── api/                      # schema gerado, clientes, ApiError, TanStack Query
│   ├── ui/                       # design system (ver docs/ui.md)
│   └── auth/                     # sessão e usuário atual; permissões previstas (FE-08)
└── test/                         # apoio aos testes: MSW, renderização e factories
e2e/                              # testes do Playwright
docs/                             # esta documentação
```

Regras de dependência:

| Pasta                    | Pode importar                       | Não pode importar                         |
| ------------------------ | ----------------------------------- | ----------------------------------------- |
| `src/app/`               | `features/`, `shared/`              | —                                         |
| `src/features/<modulo>/` | a própria funcionalidade, `shared/` | arquivos internos de outra funcionalidade |
| `src/shared/`            | `shared/`                           | `features/`, `app/`                       |

Quando uma funcionalidade precisar de algo de outra (ex.: reservas mostrando dados do lote), há três caminhos, nesta ordem de preferência:

1. A **página** em `src/app/` compõe as duas e passa os dados por props.
2. A funcionalidade chama a rota da API de que precisa, com a sua própria função em `api/`.
3. Se o mesmo componente servir a várias funcionalidades sem regra de negócio, ele sobe para `shared/`.

## O que fica em `src/shared/`

Só o que é usado por mais de uma funcionalidade e não contém regra de negócio de nenhuma delas.

| Caminho                | O que é                                                              | Situação         |
| ---------------------- | -------------------------------------------------------------------- | ---------------- |
| `config/env.schema.ts` | schemas Zod e `parseEnv()`                                           | existe           |
| `config/env.server.ts` | `getServerEnv()`, só no servidor                                     | existe           |
| `config/env.public.ts` | `publicEnv`, disponível também no navegador                          | existe           |
| `api/`                 | `schema.d.ts` gerado, clientes, `ApiError`, utilitários de paginação | existe           |
| `ui/`                  | Button, Input, Dialog, Table, Badge e demais componentes base        | existe           |
| `ui/`                  | `DataTable`, `Form`, `ConfirmDialog`, máscaras                       | existe           |
| `auth/`                | sessão, `getUsuarioAtual()`, `useUsuarioAtual()`                     | existe           |
| `auth/`                | `permissoes.ts`, `<Permitido>`, `usePermissao()`                     | previsto (FE-08) |

Não use o que ainda não existe: implemente a issue correspondente ou combine a mudança de escopo.

## Estrutura de uma funcionalidade

```text
src/features/<modulo>/
├── components/     # componentes da funcionalidade (tabela, formulário, detalhe)
├── hooks/          # hooks que combinam query, mutação e invalidação
├── api/
│   ├── <modulo>.api.ts       # funções que chamam a API, com tipos do schema gerado
│   └── <modulo>.queries.ts   # query keys e queryOptions do TanStack Query
└── schemas/        # schemas Zod de formulário e de search params
```

Crie só as pastas que a funcionalidade usar. Testes ficam ao lado do arquivo testado.

Regras de negócio são do backend. O front valida para dar resposta rápida ao usuário e esconde o que o perfil não pode fazer, mas nunca é a única barreira (RNF06).

## Server Component ou Client Component

Tudo é Server Component por padrão. Adicione `'use client'` só onde for necessário, o mais perto possível das folhas da árvore.

| Use                  | Quando                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Server Component** | páginas e layouts; ler sessão, permissões, `params` e `searchParams`; `metadata`; conteúdo estático                       |
| **Client Component** | estado e eventos (`useState`, `onClick`); hooks, inclusive TanStack Query e `react-hook-form`; APIs do navegador; Leaflet |

Cuidados:

- `params` e `searchParams` são `Promise` no Next 16: use `await` no servidor. Em Client Components, use `useSearchParams()`.
- Props passadas de Server para Client Component precisam ser serializáveis e são visíveis no navegador. Não passe tokens nem campos que a tela não usa.
- Código que acessa segredos, cookies de sessão ou `API_URL` tem sufixo `.server.ts` e `import 'server-only'`. Assim, o build falha se ele for parar no navegador.
- Providers (ex.: `QueryClientProvider`) são Client Components, e o Server Component os renderiza em volta de `children`.
- Leaflet depende de `window`: carregue-o com `dynamic(..., { ssr: false })`, dentro de um Client Component (FE-27).

## Onde buscar dados

| Situação                                                                | Onde                                | Como                                                       |
| ----------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------- |
| Listagens, detalhes e tudo que muda com a interação                     | Client Component                    | TanStack Query, pelo proxy `/api/backend`                  |
| Mutações                                                                | Client Component                    | `useMutation`, pelo proxy, invalidando as queries afetadas |
| Sessão, usuário atual e proteção de rota por perfil                     | Server Component (layout ou página) | cliente de servidor (`GET /v1/auth/me`)                    |
| Metadados que dependem de dados (ex.: pré-visualização do link público) | `generateMetadata`                  | cliente de servidor                                        |
| Tempo real no mapa                                                      | Client Component                    | SSE, atualizando o cache do TanStack Query (FE-31)         |

O padrão das telas internas é buscar no cliente. Assim, cada tela segue um único fluxo, com os estados de carregamento, vazio e erro em um só lugar. Pré-carregar no servidor com `prefetchQuery` e `HydrationBoundary` é uma otimização a justificar no PR, porque um Server Component não consegue gravar cookies e, portanto, não renova a sessão sozinho (ver [security.md](security.md#sessão-bff--cookies-httponly)).

Não use Server Actions para falar com a API: as mutações passam pelo proxy, para que erros, renovação de sessão e invalidação de cache sigam um único caminho. Não use `fetch` direto em componentes: use as funções de `api/`.

Detalhes do cliente, erros, paginação e cache em [api-integration.md](api-integration.md).

## Rotas e grupos de rota

Grupos de rota, com o nome entre parênteses, organizam as telas e aplicam layouts diferentes sem aparecer na URL.

| Grupo       | Telas                          | Layout                   | Sessão                                                   |
| ----------- | ------------------------------ | ------------------------ | -------------------------------------------------------- |
| `(auth)`    | `/login`, recuperação de senha | marca, sem menu          | quem já tem sessão é redirecionado para fora de `/login` |
| `(app)`     | todas as telas internas        | barra lateral, cabeçalho | obrigatória                                              |
| `(publico)` | `/p/[token]`                   | marca, sem menu          | não usa sessão nem cookies                               |

Rotas em grupos diferentes não podem resolver para a mesma URL. O `src/app/(app)/page.tsx` é a página inicial provisória, até a tela definitiva.

Cada grupo define, quando fizer sentido, `loading.tsx`, `error.tsx` e `not-found.tsx`. As páginas ficam finas: leem a URL, conferem a permissão e renderizam componentes de `features/`.

O Next 16 renomeou `middleware.ts` para `proxy.ts`, e `middleware` está depreciado. Por isso, o arquivo é `src/proxy.ts`. Ele faz só a checagem otimista de sessão (ver [security.md](security.md#proteção-de-rotas)). Não confunda com o proxy BFF `/api/backend/[...path]`, que é um Route Handler.

## Fluxo de uma requisição

Listagem de loteamentos no navegador:

```text
LoteamentosTable (Client Component)
  → useLoteamentos(query)                     TanStack Query: cache e estados
  → listLoteamentos(query)                    features/loteamentos/api
  → api.GET('/v1/loteamentos')                openapi-fetch tipado
  → GET /api/backend/v1/loteamentos           Route Handler do Next (BFF)
      lê o cookie, injeta Authorization e renova a sessão no 401
  → GET {API_URL}/v1/loteamentos              backend NestJS
```

O inverso vale para o erro: a resposta da API vira um `ApiError`, que a tela exibe como mensagem em português (ver [api-integration.md](api-integration.md#tratamento-de-erros)).

## Exemplo completo: funcionalidade `loteamentos`

Modelo a ser copiado para funcionalidades novas, com o contrato real do backend. Depende de FE-08 (`@/shared/auth`), ainda não entregue; a assinatura exata do que vier dela pode ser ajustada na entrega. Nas telas novas, use `DataTable` e `Form` ([ui.md](ui.md#listagens-e-formulários)) em vez da tabela e do formulário manuais deste exemplo.

Rotas: `GET /v1/loteamentos` (paginada, com `q`), `POST /v1/loteamentos`. Os perfis estão na [matriz](security.md#matriz-de-permissões): todos visualizam; Administrador e Gestor cadastram.

### `api/loteamentos.api.ts`

```ts
// src/features/loteamentos/api/loteamentos.api.ts
import { api } from '@/shared/api/client';
import { unwrap } from '@/shared/api/request';
import type { components, paths } from '@/shared/api/schema';

export type Loteamento = components['schemas']['LoteamentoDto'];
export type CreateLoteamento = components['schemas']['CreateLoteamentoDto'];
export type ListLoteamentosQuery = NonNullable<
  paths['/v1/loteamentos']['get']['parameters']['query']
>;

export function listLoteamentos(query: ListLoteamentosQuery) {
  return unwrap(api.GET('/v1/loteamentos', { params: { query } }));
}

export function createLoteamento(body: CreateLoteamento) {
  return unwrap(api.POST('/v1/loteamentos', { body }));
}
```

### `api/loteamentos.queries.ts`

```ts
// src/features/loteamentos/api/loteamentos.queries.ts
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { listLoteamentos, type ListLoteamentosQuery } from './loteamentos.api';

export const loteamentosKeys = {
  all: ['loteamentos'] as const,
  lists: () => [...loteamentosKeys.all, 'list'] as const,
  list: (query: ListLoteamentosQuery) =>
    [...loteamentosKeys.lists(), query] as const,
};

export function loteamentosListOptions(query: ListLoteamentosQuery) {
  return queryOptions({
    queryKey: loteamentosKeys.list(query),
    queryFn: () => listLoteamentos(query),
    placeholderData: keepPreviousData,
  });
}
```

### `hooks/use-create-loteamento.ts`

```ts
// src/features/loteamentos/hooks/use-create-loteamento.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createLoteamento } from '../api/loteamentos.api';
import { loteamentosKeys } from '../api/loteamentos.queries';

export function useCreateLoteamento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createLoteamento,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: loteamentosKeys.lists() }),
  });
}
```

### `schemas/`

```ts
// src/features/loteamentos/schemas/loteamento-form.schema.ts
import { z } from 'zod';

// Os limites repetem os do backend para dar resposta imediata; quem decide é a API.
export const loteamentoFormSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, 'Informe o nome')
    .max(150, 'Use até 150 caracteres'),
  descricao: z.string().trim(),
  localizacao: z.string().trim().max(255, 'Use até 255 caracteres'),
});

export type LoteamentoFormValues = z.infer<typeof loteamentoFormSchema>;

/** Na API, campo opcional sem valor é `null`, não texto vazio. */
export function toCreateLoteamento(values: LoteamentoFormValues) {
  return {
    nome: values.nome,
    descricao: values.descricao || null,
    localizacao: values.localizacao || null,
  };
}
```

```ts
// src/features/loteamentos/schemas/loteamentos-search.schema.ts
import { z } from 'zod';

// `.catch()` evita que uma URL editada à mão derrube a tela.
export const loteamentosSearchSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(20),
  q: z.string().trim().min(1).optional().catch(undefined),
});

export type LoteamentosSearch = z.infer<typeof loteamentosSearchSchema>;
```

### `components/loteamentos-table.tsx`

```tsx
// src/features/loteamentos/components/loteamentos-table.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { getErrorMessage } from '@/shared/api/errors';
import { EmptyState } from '@/shared/ui/empty-state';
import { Pagination } from '@/shared/ui/pagination';
import { Skeleton } from '@/shared/ui/skeleton';
import { loteamentosListOptions } from '../api/loteamentos.queries';
import type { LoteamentosSearch } from '../schemas/loteamentos-search.schema';

export function LoteamentosTable({ search }: { search: LoteamentosSearch }) {
  const { data, error, isPending } = useQuery(loteamentosListOptions(search));

  if (isPending) {
    return <Skeleton aria-label="Carregando loteamentos" />;
  }

  if (error) {
    return <p role="alert">{getErrorMessage(error)}</p>;
  }

  if (data.data.length === 0) {
    return <EmptyState title="Nenhum loteamento encontrado" />;
  }

  return (
    <>
      <table className="w-full text-left">
        <thead>
          <tr>
            <th scope="col">Nome</th>
            <th scope="col">Localização</th>
          </tr>
        </thead>
        <tbody>
          {data.data.map((loteamento) => (
            <tr key={loteamento.id}>
              <td>{loteamento.nome}</td>
              <td>{loteamento.localizacao ?? 'Não informada'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination
        meta={data.meta}
        getPageHref={(page) =>
          `/loteamentos?${new URLSearchParams({
            ...(search.q ? { q: search.q } : {}),
            page: String(page),
          })}`
        }
      />
    </>
  );
}
```

### `components/loteamento-form.tsx`

```tsx
// src/features/loteamentos/components/loteamento-form.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ApiError, getErrorMessage } from '@/shared/api/errors';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { useCreateLoteamento } from '../hooks/use-create-loteamento';
import {
  loteamentoFormSchema,
  toCreateLoteamento,
  type LoteamentoFormValues,
} from '../schemas/loteamento-form.schema';

export function LoteamentoForm({ onSuccess }: { onSuccess: () => void }) {
  const createLoteamento = useCreateLoteamento();
  const {
    formState: { errors },
    handleSubmit,
    register,
    setError,
  } = useForm<LoteamentoFormValues>({
    defaultValues: { nome: '', descricao: '', localizacao: '' },
    resolver: zodResolver(loteamentoFormSchema),
  });

  function onSubmit(values: LoteamentoFormValues) {
    createLoteamento.mutate(toCreateLoteamento(values), {
      onSuccess,
      onError: (error) => {
        if (
          error instanceof ApiError &&
          error.code === 'LOTEAMENTO_JA_EXISTE'
        ) {
          setError('nome', { message: error.message });
          return;
        }
        setError('root', { message: getErrorMessage(error) });
      },
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Input label="Nome" error={errors.nome?.message} {...register('nome')} />
      <Textarea
        label="Descrição"
        error={errors.descricao?.message}
        {...register('descricao')}
      />
      <Input
        label="Localização"
        error={errors.localizacao?.message}
        {...register('localizacao')}
      />
      {errors.root ? <p role="alert">{errors.root.message}</p> : null}
      <Button type="submit" disabled={createLoteamento.isPending}>
        Salvar
      </Button>
    </form>
  );
}
```

### `src/app/(app)/loteamentos/page.tsx`

A página é um Server Component: lê a URL e compõe a funcionalidade.

```tsx
// src/app/(app)/loteamentos/page.tsx
import Link from 'next/link';
import { LoteamentosTable } from '@/features/loteamentos/components/loteamentos-table';
import { loteamentosSearchSchema } from '@/features/loteamentos/schemas/loteamentos-search.schema';
import { Permitido } from '@/shared/auth/permitido';

export const metadata = { title: 'Loteamentos' };

export default async function LoteamentosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const search = loteamentosSearchSchema.parse(await searchParams);

  return (
    <main>
      <h1>Loteamentos</h1>
      <Permitido acao="gerenciarCadastros">
        <Link href="/loteamentos/novo">Novo loteamento</Link>
      </Permitido>
      <LoteamentosTable search={search} />
    </main>
  );
}
```

### Testes

Exemplos em [testing.md](testing.md#exemplos).
