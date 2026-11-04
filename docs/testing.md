# Testes

Ferramentas: **Vitest** com **Testing Library** em testes unitários e de componente, **MSW** para simular a API (previsto na FE-05) e **Playwright** nos e2e.

| Comando                    | O que roda                                           | Config                 |
| -------------------------- | ---------------------------------------------------- | ---------------------- |
| `npm test`                 | unitários e de componente (`src/**/*.test.{ts,tsx}`) | `vitest.config.ts`     |
| `npm run test:cov`         | os mesmos, com cobertura (v8)                        | `vitest.config.ts`     |
| `npx vitest run <arquivo>` | um arquivo                                           | —                      |
| `npm run test:e2e`         | e2e (`e2e/**/*.spec.ts`)                             | `playwright.config.ts` |

O Vitest roda **sem** `globals`: importe `describe`, `it`, `expect` e `vi` de `vitest` em cada arquivo. O backend usa `globals: true`, então não copie os testes dele sem ajustar. O ambiente padrão é `jsdom`; para Route Handlers e código de servidor, comece o arquivo com `// @vitest-environment node`.

Antes do primeiro e2e, instale o navegador: `npx playwright install chromium`.

## O que testar em cada nível

### Unitário (`*.test.ts`, ao lado do arquivo testado)

Sem navegador real e sem rede. Rápido e determinístico.

| Alvo                                                         | O que cobrir                                                 |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| Schemas Zod                                                  | entrada válida, cada regra violada e a mensagem em português |
| Máscaras e formatadores                                      | todos os ramos, inclusive valores vazios e inválidos         |
| Mapa de permissões                                           | cada perfil em cada ação                                     |
| Conversão de erros e utilitários de `shared`                 | todos os ramos                                               |
| Route Handlers                                               | status, corpo e falhas de dependência                        |
| Lógica sem interface (ex.: conversão de coordenadas do mapa) | os dois sentidos e os limites                                |

### Componente (`*.test.tsx`, ao lado do componente)

Renderiza com Testing Library e interage como o usuário: busca por papel e nome acessível (`getByRole`), não por classe nem por detalhe de implementação. Simule a API com MSW; não faça mock dos hooks nem do cliente.

Para cada componente com dados, cubra o que se aplicar:

1. Carregando, vazio, erro e sucesso.
2. Validação do formulário e mensagem no campo certo.
3. Erro da API: `code` conhecido, erro de campo e erro genérico.
4. Permissão: a ação aparece para quem pode e não aparece para quem não pode.

Server Components `async` não são renderizados pelo Testing Library: cubra-os no e2e e extraia a lógica para funções testáveis. Essa é uma recomendação da própria documentação do Next.

### E2E (`e2e/<funcionalidade>.spec.ts`)

Abre o navegador e percorre o sistema como o usuário. Fica para os fluxos que atravessam várias camadas:

1. Caminho principal de cada funcionalidade.
2. Sessão: login, logout, rota protegida, renovação.
3. Permissão: acesso direto à URL proibida com cada perfil.
4. Navegação que depende da URL (paginação e filtros mantidos ao recarregar).
5. Página pública: respostas de rede sem campos sensíveis.

O teste da página inicial (`e2e/home.spec.ts`) não precisa da API. Os fluxos contra o backend real entram na FE-35.

## Uso do MSW

> Previsto na FE-05, que instala o pacote e cria `src/test/`. Use só depois disso.

O servidor do MSW é um só, em `src/test/server.ts`, e a preparação fica em `src/test/msw-setup.ts`, registrado em `setupFiles` no `vitest.config.ts`. Requisição sem handler **falha o teste** (`onUnhandledFrame: 'error'`, nome da opção no MSW 3), para não deixar uma chamada passar despercebida:

```ts
// src/test/server.ts
import { setupServer } from 'msw/node';

export const server = setupServer();
```

```ts
// src/test/msw-setup.ts
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './server';

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

Cada teste declara as respostas de que precisa com `server.use(...)`. Use `*/v1/...` na rota, para não depender da origem. Tipe os dados com os tipos do schema, para o teste quebrar quando o contrato mudar.

`QueryClient` novo a cada teste, sem retry, para o cache não vazar entre testes:

```tsx
// src/test/render.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';

export function renderWithQuery(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}
```

## Dados de teste

- **Somente dados fictícios.** Nunca copie dados reais de clientes, nem para um teste "rápido".
- CPF, e-mail e telefone de teste devem ser claramente falsos (`cliente@exemplo.com`).
- Factories em `src/test/factories/<entidade>.factory.ts`, com valores válidos e sobrescritas, tipadas com o schema gerado:

```ts
// src/test/factories/loteamento.factory.ts
import type { Loteamento } from '@/features/loteamentos/api/loteamentos.api';

export function makeLoteamento(
  overrides: Partial<Loteamento> = {},
): Loteamento {
  return {
    id: '0b6f3c1e-8a52-4a8e-9d3f-2c7f1e5a9b10',
    nome: 'Residencial Teste',
    descricao: null,
    localizacao: null,
    createdAt: '2026-10-28T12:00:00.000Z',
    updatedAt: '2026-10-28T12:00:00.000Z',
    ...overrides,
  };
}
```

## Exemplos

### Listagem com MSW

```tsx
// src/features/loteamentos/components/loteamentos-table.test.tsx
import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { expect, it } from 'vitest';
import { makeLoteamento } from '@/test/factories/loteamento.factory';
import { renderWithQuery } from '@/test/render';
import { server } from '@/test/server';
import { LoteamentosTable } from './loteamentos-table';

const search = { page: 1, pageSize: 20 };
const meta = { page: 1, pageSize: 20, total: 1, totalPages: 1 };

it('lista os loteamentos', async () => {
  server.use(
    http.get('*/v1/loteamentos', () =>
      HttpResponse.json({
        data: [makeLoteamento({ nome: 'Bela Vista' })],
        meta,
      }),
    ),
  );

  renderWithQuery(<LoteamentosTable search={search} />);

  expect(
    await screen.findByRole('cell', { name: 'Bela Vista' }),
  ).toBeInTheDocument();
});

it('mostra o estado vazio', async () => {
  server.use(
    http.get('*/v1/loteamentos', () =>
      HttpResponse.json({
        data: [],
        meta: { ...meta, total: 0, totalPages: 0 },
      }),
    ),
  );

  renderWithQuery(<LoteamentosTable search={search} />);

  expect(
    await screen.findByText('Nenhum loteamento encontrado'),
  ).toBeInTheDocument();
});

it('mostra a mensagem de erro da API', async () => {
  server.use(
    http.get('*/v1/loteamentos', () =>
      HttpResponse.json(
        {
          statusCode: 403,
          code: 'ACESSO_NEGADO',
          message: 'Você não tem permissão para executar esta ação',
          path: '/v1/loteamentos',
          timestamp: '2026-10-28T12:00:00.000Z',
        },
        { status: 403 },
      ),
    ),
  );

  renderWithQuery(<LoteamentosTable search={search} />);

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Você não tem permissão para executar esta ação',
  );
});
```

### Formulário

```tsx
// src/features/loteamentos/components/loteamento-form.test.tsx
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { expect, it, vi } from 'vitest';
import { makeLoteamento } from '@/test/factories/loteamento.factory';
import { renderWithQuery } from '@/test/render';
import { server } from '@/test/server';
import { LoteamentoForm } from './loteamento-form';

function preencherNome(nome: string) {
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: nome } });
}

function salvar() {
  fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
}

it('não chama a API com o nome vazio', async () => {
  const onSuccess = vi.fn<() => void>();
  renderWithQuery(<LoteamentoForm onSuccess={onSuccess} />);

  salvar();

  expect(await screen.findByText('Informe o nome')).toBeInTheDocument();
  expect(onSuccess).not.toHaveBeenCalled();
});

it('envia campos opcionais vazios como null', async () => {
  const corpos: unknown[] = [];
  server.use(
    http.post('*/v1/loteamentos', async ({ request }) => {
      corpos.push(await request.json());
      return HttpResponse.json(makeLoteamento(), { status: 201 });
    }),
  );
  const onSuccess = vi.fn<() => void>();
  renderWithQuery(<LoteamentoForm onSuccess={onSuccess} />);

  preencherNome('Bela Vista');
  salvar();

  await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
  expect(corpos).toEqual([
    { nome: 'Bela Vista', descricao: null, localizacao: null },
  ]);
});

it('mostra no campo o conflito de nome devolvido pela API', async () => {
  server.use(
    http.post('*/v1/loteamentos', () =>
      HttpResponse.json(
        {
          statusCode: 409,
          code: 'LOTEAMENTO_JA_EXISTE',
          message: 'Já existe um loteamento com esse nome',
          path: '/v1/loteamentos',
          timestamp: '2026-10-28T12:00:00.000Z',
        },
        { status: 409 },
      ),
    ),
  );
  renderWithQuery(<LoteamentoForm onSuccess={vi.fn<() => void>()} />);

  preencherNome('Bela Vista');
  salvar();

  expect(
    await screen.findByText('Já existe um loteamento com esse nome'),
  ).toBeInTheDocument();
});
```

### E2E

```ts
// e2e/home.spec.ts
import { expect, test } from '@playwright/test';

test('abre a página inicial e recebe 200', async ({ page }) => {
  const response = await page.goto('/');

  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Urbizzi' })).toBeVisible();
});
```

## Cobertura mínima

- **80% de linhas e de branches** em `src/shared/**` e em `src/features/**/{api,hooks,schemas}/**`.
- Componentes são cobertos pelos cenários acima, sem meta numérica.
- Todo bug corrigido ganha um teste que falhava antes da correção.
- O limite está configurado em `vitest.config.ts` (`coverage.thresholds`): `npm run test:cov` falha abaixo de 80%, localmente e no CI.

## Integração contínua

O workflow `.github/workflows/ci.yml` roda em todo Pull Request e em todo push na `main`, com dois jobs em paralelo:

| Job                             | Etapas                                                                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Lint, tipos, testes e build** | `npm ci` (com cache do npm) → `lint` → `format:check` → `typecheck` → `test:cov` (com limite de cobertura) → `build` |
| **Testes e2e**                  | `npm ci` → navegador do Playwright (com cache) → `test:e2e`                                                          |

Um novo push no mesmo PR cancela a execução anterior. Cada etapa interrompe o job ao falhar, então corrigir um erro pode revelar outro na etapa seguinte.

Quando o e2e falha, o artefato `playwright-report` fica disponível por 14 dias na página da execução, com o relatório HTML e os traces. Para ver um trace, baixe o artefato e abra `playwright-report/index.html` por `npx playwright show-report playwright-report`.

**Proteção da `main`:** ainda não está ativa. O GitHub só oferece proteção de branch e rulesets em repositório privado a partir do plano pago, e este é privado em uma organização no plano Free. Até mudar, o GitHub **não** impede o merge com CI vermelho nem o push direto: confira os dois jobs antes de mergear. Ao ativar, exija como verificações obrigatórias `Lint, tipos, testes e build` e `Testes e2e`. Se renomear um job, atualize também essas verificações.

Para reproduzir localmente o que o CI faz: `npm run lint && npm run format:check && npm run typecheck && npm run test:cov && npm run build && npm run test:e2e`.

## Boas práticas

- Nome do teste em português, descrevendo o comportamento: `it('mostra o estado vazio')`.
- Estrutura Arrange / Act / Assert, separada por linha em branco.
- Um comportamento por `it`.
- Prefira `findBy*` e `waitFor` a esperas fixas.
- Não dependa de horário real: use `vi.useFakeTimers()` e `vi.setSystemTime()` para prazos e vencimentos.
- Não teste detalhes de implementação (estado interno, classes CSS, ordem de chamadas).
