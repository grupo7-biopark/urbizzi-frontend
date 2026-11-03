# Convenções

## Idioma

| O quê                                                                      | Idioma                                  | Exemplo                                                                        |
| -------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------ |
| Termos de domínio (funcionalidades, campos, ações de negócio)              | português, **sem acento e sem cedilha** | `Loteamento`, `dataVencimento`, `useRenovarReserva`, `features/links-publicos` |
| Termos técnicos (sufixos, verbos CRUD, infraestrutura)                     | inglês                                  | `LoteamentoForm`, `useCreateLoteamento`, `listLoteamentos`, `queryKey`         |
| Textos de tela, mensagens de erro, comentários, documentação, commits, PRs | português, com acentuação correta       | `'Loteamento não encontrado'`                                                  |
| Nomes vindos da API (campos, enums, `code`)                                | exatamente como no contrato             | `areaM2`, `DISPONIVEL`, `LOTE_INDISPONIVEL`                                    |

Todo texto exibido ao usuário fica em português do Brasil, com datas, moeda e números no formato brasileiro.

## Arquivos e pastas

- Arquivos e pastas em `kebab-case`. O nome do arquivo corresponde ao símbolo principal exportado.
- Um componente principal por arquivo.
- A pasta da funcionalidade é o plural do agregado principal, igual ao módulo do backend: `loteamentos`, `links-publicos`.

| Tipo                           | Arquivo                                                  | Símbolo                                                          |
| ------------------------------ | -------------------------------------------------------- | ---------------------------------------------------------------- |
| Componente                     | `features/loteamentos/components/loteamento-form.tsx`    | `LoteamentoForm`                                                 |
| Hook                           | `features/loteamentos/hooks/use-create-loteamento.ts`    | `useCreateLoteamento`                                            |
| Chamadas à API                 | `features/loteamentos/api/loteamentos.api.ts`            | `listLoteamentos`, `createLoteamento`                            |
| Query keys e opções            | `features/loteamentos/api/loteamentos.queries.ts`        | `loteamentosKeys`, `loteamentosListOptions`                      |
| Schema Zod                     | `features/loteamentos/schemas/loteamento-form.schema.ts` | `loteamentoFormSchema`, `LoteamentoFormValues`                   |
| Código só de servidor          | sufixo `.server.ts`, com `import 'server-only'`          | `env.server.ts`                                                  |
| Teste unitário e de componente | ao lado do arquivo: `loteamento-form.test.tsx`           | —                                                                |
| Teste e2e                      | `e2e/<funcionalidade>.spec.ts`                           | —                                                                |
| Arquivos especiais do Next     | nome exigido pelo framework                              | `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts` |

Não crie `index.ts` de reexportação. Eles escondem de onde vem cada símbolo e podem levar código de servidor para o bundle do navegador.

## Código TypeScript

- Componentes, tipos e interfaces: `PascalCase`, sem prefixo `I`.
- Variáveis, funções e propriedades: `camelCase`. Hooks começam com `use`.
- Constantes de módulo: `UPPER_SNAKE_CASE`.
- Booleanos com prefixo de predicado: `ativo`, `isPending`, `podeRenovar`.
- Imports internos entre pastas usam o alias `@/` (`@/shared/config/env.schema`), sem extensão. Dentro da mesma pasta, use caminho relativo (`./env.schema`). O backend usa `.js` nos imports por causa do ESM `nodenext`; aqui o Next.js resolve os módulos, então a regra dele não se aplica.
- Ordem dos imports: pacotes externos, depois código do projeto.
- `import type` para importações usadas só como tipo.
- Sem `any`. Use `unknown` e refine o tipo.
- Sem comentários óbvios. Comente o **porquê** de decisões não evidentes.
- Datas chegam da API em UTC; converta para exibição só na camada de interface. Datas sem hora (`YYYY-MM-DD`) não devem passar por `new Date()` sem tratamento, porque o fuso pode mudar o dia.
- Valores monetários e áreas trafegam como **string decimal** (`"250000.00"`). Nunca os converta para `number` para calcular ou reenviar; só formate para exibição.

A formatação é responsabilidade do Prettier (`.prettierrc`: aspas simples, vírgula final). Não discuta estilo em PR: rode `npm run format`.

## Rotas de tela

- Segmentos de URL em português, `kebab-case`, sem acento e no plural: `/loteamentos`, `/links-publicos`.
- Parâmetros dinâmicos em `camelCase`, com o sufixo `Id` em identificadores: `/loteamentos/[loteamentoId]/quadras`.
- Criação e edição: `/loteamentos/novo` e `/loteamentos/[loteamentoId]/editar`.
- Search params em `camelCase`, com os mesmos nomes dos filtros da API (`page`, `pageSize`, `q`, `status`), para a URL poder ser repassada à consulta.
- Grupos de rota: ver [architecture.md](architecture.md#rotas-e-grupos-de-rota).

## Commits (Conventional Commits)

Formato: `<tipo>(<escopo>): <descrição>`

- **tipo**: `feat` (funcionalidade), `fix` (correção), `refactor` (sem mudar comportamento), `test`, `docs`, `chore` (build, dependências, configuração), `ci`, `perf`.
- **escopo**: nome da funcionalidade (`reservas`, `loteamentos`) ou área técnica (`docker`, `shared`, `config`, `ui`). Opcional quando a mudança é geral.
- **descrição**: em português, no imperativo ou presente, com inicial minúscula, sem ponto final, até ~72 caracteres. Ex.: `feat(reservas): adiciona renovação de reserva`.
- Corpo (opcional): o porquê da mudança, quebrado em linhas de ~72 caracteres.
- Commits pequenos e coesos; cada commit deve compilar.

## Branches

- Todo código entra por Pull Request. A proteção da `main` no GitHub é configurada na FE-03.
- Nome: `<tipo>/fe-<nn>-<descricao-curta>` em `kebab-case`, onde `<nn>` é o número da issue no padrão `FE-NN`. Ex.: `feat/fe-19-criar-reserva`, `fix/fe-21-filtro-status`, `docs/fe-02-arquitetura`.
- Sem issue (raro): `<tipo>/<descricao-curta>`.
- Uma branch por issue. Atualize com `git rebase origin/main` (ou merge) antes de pedir revisão.

## Pull Requests

- Título: `[FE-NN] <título da issue>`.
- Corpo: o template de `.github/PULL_REQUEST_TEMPLATE.md` preenchido, com `Closes #<número>`.
- Revisão de pelo menos um integrante (dois para mudanças de arquitetura ou de `docs/`).
- A partir da FE-03, o CI precisa estar verde antes do merge. Até lá, rode a verificação completa de [AGENTS.md](../AGENTS.md#comandos) localmente.
