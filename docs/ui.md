# Interface

> **Status:** tokens e componentes base existem em `src/app/globals.css` e `src/shared/ui/`. Os padrões de listagem e formulário estão em [Listagens e formulários](#listagens-e-formulários). A fonte de verdade da marca é o guia oficial **"Urbizzi Marcas e Variações"**; em caso de divergência, ele prevalece.

## Design system

Use os componentes de `src/shared/ui/` e os tokens do tema. Não recrie botão, campo ou diálogo dentro de uma funcionalidade. Se faltar uma variação, adicione-a ao design system. Para ver tudo funcionando, abra [`/design-system`](http://localhost:3001/design-system), disponível só em desenvolvimento.

| Arquivo                                          | Exporta                                                                               | Observações                                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `button.tsx`                                     | `Button`                                                                              | `variant`: `primario`, `secundario`, `perigo`, `fantasma`. `type` padrão é `button`      |
| `input.tsx`, `textarea.tsx`, `select.tsx`        | `Input`, `Textarea`, `Select`                                                         | `label` obrigatório; `error` e `hint` ligados ao campo. Aceitam `{...register('campo')}` |
| `checkbox.tsx`, `switch.tsx`                     | `Checkbox`, `Switch`                                                                  | inputs nativos, com `label` obrigatório                                                  |
| `label.tsx`                                      | `Label`, `FieldError`                                                                 | para campos fora dos componentes acima                                                   |
| `dialog.tsx`, `drawer.tsx`                       | `Dialog`, `DialogClose`, `Drawer`                                                     | `title` obrigatório; `trigger`, ou controle com `open` e `onOpenChange`                  |
| `dropdown.tsx`                                   | `Dropdown`, `DropdownItem`, `DropdownSeparator`                                       | `variant="perigo"` em ações destrutivas                                                  |
| `tabs.tsx`                                       | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`                                      | dê `aria-label` ao `TabsList`                                                            |
| `table.tsx`                                      | `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`             |                                                                                          |
| `badge.tsx`                                      | `Badge`, `StatusLoteBadge`, `StatusPropostaBadge`                                     | sempre com cor e texto                                                                   |
| `toast.tsx`                                      | `ToastProvider`, `useToast`                                                           | o provider está no layout de `(app)` e em `/design-system`                               |
| `skeleton.tsx`, `spinner.tsx`, `empty-state.tsx` | `Skeleton`, `Spinner`, `EmptyState`                                                   | `Skeleton` exige `aria-label`                                                            |
| `pagination.tsx`                                 | `Pagination`                                                                          | recebe `meta` da API e `getPageHref(page)`; `label` diferencia duas na mesma tela        |
| `data-table.tsx`                                 | `DataTable`                                                                           | listagem paginada com estado na URL; vira cartões no celular                             |
| `list-filters.tsx`                               | `FilterBar`, `UrlSearchFilter`, `UrlSelectFilter`, `DebouncedSearch`                  | filtros sincronizados com a URL                                                          |
| `use-list-params.ts`                             | `useListParams`, `hasActiveFilters`                                                   | lê e altera o estado da listagem na URL                                                  |
| `form.tsx`                                       | `Form`, `FormInput`, `FormTextarea`, `FormSelect`, `FormMaskedInput`, `applyApiError` | `react-hook-form` com Zod e erros da API no campo                                        |
| `masked-input.tsx`, `masks.ts`                   | `MaskedInput`, máscaras e formatadores                                                | ver [Máscaras](#máscaras)                                                                |
| `confirm-dialog.tsx`                             | `ConfirmDialog`                                                                       | confirmação com motivo                                                                   |
| `use-api-mutation.ts`                            | `useApiMutation`                                                                      | mutação com Toast e invalidação                                                          |
| `tooltip.tsx`                                    | `Tooltip`                                                                             | só complementa: não existe no toque                                                      |
| `logo.tsx`                                       | `Logo`, `LogoSimbolo`                                                                 | ver [Logos](#logos)                                                                      |

Dialog, Drawer, Dropdown, Tabs, Toast e Tooltip usam Radix UI, que cuida de foco, teclado e ARIA. Select, Checkbox e Switch são nativos, porque já funcionam bem no teclado e no celular.

### Cores

Nas telas, use os tokens **semânticos**, que se adaptam ao tema. As utilidades prontas do Tailwind (`bg-orange-500`, `shadow-md`, `rounded-lg`) foram removidas do tema e não geram estilo. Não escreva cores fixas.

| Token                                  | Valor                     | Papel                                 |
| -------------------------------------- | ------------------------- | ------------------------------------- |
| `laranja`                              | #EE6017                   | cor-assinatura                        |
| `preto`, `branco`                      | #000000, #FFFFFF          | principais                            |
| `prata`, `cinza-oliva`, `cinza-carvao` | #C5C7C7, #8F9289, #545759 | neutros de apoio, nunca protagonistas |

| Semântico     | Claro   | Escuro  | Uso                                                            |
| ------------- | ------- | ------- | -------------------------------------------------------------- |
| `surface`     | branco  | preto   | fundo da página                                                |
| `surface-alt` | prata   | carvão  | faixas e blocos neutros                                        |
| `ink`         | preto   | branco  | texto principal                                                |
| `ink-muted`   | carvão  | prata   | texto secundário e borda de campo                              |
| `accent`      | laranja | laranja | ação principal e destaque                                      |
| `on-accent`   | preto   | preto   | texto e ícone sobre `accent`                                   |
| `border`      | prata   | carvão  | divisores decorativos, **não** borda de campo (não atinge 3:1) |

O tema segue o sistema operacional; `data-theme="light"` ou `"dark"` no `<html>` força um deles.

#### Combinações de texto aprovadas

Todas são verificadas em `src/shared/ui/tokens.test.ts`, nos dois temas.

| Fundo         | Texto permitido              | Não use                                  |
| ------------- | ---------------------------- | ---------------------------------------- |
| `surface`     | `ink`, `ink-muted`, `danger` | `border`, `cinza-oliva`                  |
| `surface-alt` | **só `ink`**                 | `ink-muted` (4,29:1), `accent`, `danger` |
| `accent`      | **só `on-accent`**           | branco (3,32:1)                          |

Laranja como texto sobre branco tem 3,32:1: só em títulos de 24px ou mais, nunca em texto corrido. Sobre preto, tem 6,32:1 e vale em qualquer tamanho.

#### Cores que não vêm do manual

O manual não define cor de perigo nem de status. Os valores abaixo são **propostas** do grupo, escolhidos para atender ao contraste, e podem mudar.

| Token                                            | Claro   | Escuro  |
| ------------------------------------------------ | ------- | ------- |
| `danger`                                         | #B91C1C | #F87171 |
| `status-disponivel` (verde)                      | #16A34A | #22C55E |
| `status-reservado` (azul)                        | #1D4ED8 | #60A5FA |
| `status-vendido` (rosa)                          | #BE185D | #F472B6 |
| `status-bloqueado` (ponto em aberto 9 do escopo) | carvão  | prata   |

Cada um tem um `on-*` para o texto (`on-danger`, `on-status-vendido` etc.). No tema escuro, `status-bloqueado` usa prata porque carvão fica abaixo de 3:1 sobre preto.

### Tipografia

Inter e Bebas Neue, carregadas com `next/font` em `src/app/fonts.ts`, sem requisição externa em tempo de execução. A escala é uma proposta do manual, que não define tamanhos.

| Classe                            | Tamanho           | Uso                                                                         |
| --------------------------------- | ----------------- | --------------------------------------------------------------------------- |
| `text-display`                    | 48/52, Inter 900  | título de destaque                                                          |
| `text-heading`                    | 28/32, Inter 900  | título de seção e diálogo                                                   |
| `font-display text-section-label` | 20/24, Bebas Neue | rótulos curtos em versal, seguidos de filete de 1px. Nunca em texto corrido |
| `text-body`                       | 16/24, Inter 400  | texto                                                                       |
| `text-small`                      | 14/20, Inter 400  | texto de apoio                                                              |
| `text-caption`                    | 12/16, Inter 700  | legendas e metadados                                                        |

Em texto corrido, escreva **Urbizzi**, com inicial maiúscula. A caixa baixa é só do logo.

### Logos

Os 23 SVGs oficiais ficam em `public/brand/`, sem alteração. Não redesenhe, recolore, deforme, contorne nem aplique sombra. Use sempre os componentes:

```tsx
<Logo className="h-10 w-auto" /> {/* acompanha o tema */}
<Logo variant="laranja" assinatura="tagline" className="h-16 w-auto" />
<Logo variant="escuro" arquitetura="vertical" assinatura="marca" className="h-24 w-auto" />
<LogoSimbolo className="size-8" />
```

| Prop          | Valores                                       | Quando usar                                                                        |
| ------------- | --------------------------------------------- | ---------------------------------------------------------------------------------- |
| `variant`     | `tema` (padrão), `claro`, `escuro`, `laranja` | o fundo em que o logo está. Em bloco de cor fixa, informe o fundo em vez de `tema` |
| `arquitetura` | `horizontal` (padrão), `vertical`             | horizontal em cabeçalhos e banners; vertical em espaços quadrados ou altos         |
| `assinatura`  | `wordmark` (padrão), `tagline`, `marca`       | `marca` traz "by Biopark"; abaixo de 120px de largura, use só `wordmark`           |

Regras:

- Sobre laranja, só a versão preta: o componente já a escolhe.
- Nunca sobre `cinza-oliva` (1,05:1 com o laranja), nem sobre foto sem área limpa.
- `LogoSimbolo` é laranja: nunca sobre fundo laranja.
- Mantenha respiro em volta, de pelo menos ¼ da largura do símbolo.
- Em um container `flex-col`, adicione `self-start` ou similar, para a imagem não esticar.

> **Divergência a confirmar com o designer:** os vetores dos logos usam #FF5300, e a tabela de cores do guia diz #EE6017. Os SVGs preservam o arquivo original; a interface usa #EE6017.

## Listagens e formulários

Os blocos de `src/shared/ui/` fazem com que uma tela nova seja só configuração. A página lê a URL com o schema, e o componente da funcionalidade compõe os blocos:

```tsx
// src/features/loteamentos/components/loteamentos-table.tsx
'use client';

export function LoteamentosTable({ search }: { search: LoteamentosSearch }) {
  const query = useQuery(loteamentosListOptions(search));

  return (
    <>
      <FilterBar>
        <UrlSearchFilter />
        <UrlSelectFilter name="ativo" label="Situação" options={OPCOES} />
      </FilterBar>
      <DataTable
        label="Loteamentos"
        query={query}
        columns={[
          { id: 'nome', header: 'Nome', cell: (row) => row.nome },
          {
            id: 'acoes',
            header: 'Ações',
            cell: (row) => <Acoes id={row.id} />,
          },
        ]}
        getRowKey={(row) => row.id}
        emptyTitle="Nenhum loteamento cadastrado"
      />
    </>
  );
}
```

- `DataTable` trata carregamento, erro com "Tentar novamente", vazio, "nenhum resultado para os filtros" e página além da última. No celular, cada linha vira um cartão.
- `sortKey` na coluna ativa a ordenação. Só informe se a rota aceitar `orderBy`: hoje, nenhuma aceita.
- Mudar um filtro ou a ordem volta à primeira página, e o estado todo fica na URL (`useListParams`).
- Busca que aceita dado pessoal não vai para a URL: use `DebouncedSearch`, com estado local, em vez de `UrlSearchFilter` ([security.md](security.md#lgpd-na-interface)).
- O `useSearchParams` dos blocos exige um limite de `Suspense` em página estática. Uma página que lê `searchParams` é dinâmica e não precisa dele.

```tsx
export function LoteamentoForm({ onSuccess }: { onSuccess: () => void }) {
  const create = useApiMutation({
    mutationFn: createLoteamento,
    invalidates: [loteamentosKeys.lists()],
    successMessage: 'Loteamento salvo',
    errorToast: false, // o Form mostra o erro nele mesmo
  });

  return (
    <Form
      schema={loteamentoFormSchema}
      defaultValues={{ nome: '', valor: '' }}
      onSubmit={async (values) => {
        await create.mutateAsync(toCreateLoteamento(values));
        onSuccess();
      }}
      fieldsByCode={{ LOTEAMENTO_JA_EXISTE: 'nome' }}
    >
      <FormInput name="nome" label="Nome" required />
      <FormMaskedInput name="valor" label="Valor" mask="moeda" />
    </Form>
  );
}
```

- `onSubmit` precisa **rejeitar** com o `ApiError` (`mutateAsync`, e não `mutate`): é assim que o `Form` mostra `details` embaixo de cada campo, inclusive em caminhos aninhados (`endereco.cep`), e o restante no alerta.
- `fieldsByCode` leva ao campo um erro que a API não associa a ele.
- Valide no schema Zod, com texto em português, o que a API também valida: as mensagens de `details` podem vir em inglês ([api-integration.md](api-integration.md#tratamento-de-erros)).
- Fora de um `Form`, `useApiMutation` avisa o erro com um Toast. Em um `409`, ela também invalida as queries, porque a tela mostra um estado que já mudou.

### Máscaras

`MaskedInput` e `FormMaskedInput` exibem o valor com máscara e guardam o que a API espera. Para exibir fora de campos, use as funções de `masks.ts`.

| `mask`     | Exibe                                  | Guarda         | Para exibir                |
| ---------- | -------------------------------------- | -------------- | -------------------------- |
| `cpfCnpj`  | `529.982.247-25`, `11.222.333/0001-81` | só dígitos     | `maskCpfCnpj`              |
| `telefone` | `(45) 99999-8888`                      | só dígitos     | `maskTelefone`             |
| `moeda`    | `R$ 250.000,00`                        | string decimal | `formatMoeda`              |
| `area`     | `360,00`, com a unidade no rótulo      | string decimal | `formatArea` (`360,00 m²`) |

Moeda e área são digitadas da direita para a esquerda, em centavos. Nenhuma função converte para `number`, para não perder precisão.

## Regras do manual de marca

1. **Cantos retos**: raio 0 em tudo.
2. **Sem sombras e sem gradientes.** Use blocos de cor chapada e separe áreas com borda ou fundo.
3. **Texto sobre laranja é sempre preto** (`on-accent`).
4. **Laranja sobre branco só em títulos de 24px ou mais.**
5. **Contraste de texto de pelo menos 4,5:1** nos dois temas; 3:1 em bordas de campo, foco e ícones.
6. **Hierarquia:** laranja, preto e branco formam a marca. Prata, oliva e carvão são apoio.
7. **Laranja e cinza-oliva não se misturam**: têm 1,05:1 e se fundem.
8. **Tom:** direto, urbano e construtivo.

## Acessibilidade e responsividade

- Tudo funciona por teclado, com foco visível.
- Status nunca depende só da cor: o Badge traz cor **e** texto, inclusive no mapa (legenda).
- Campo tem `<label>` associado, e erro é anunciado e ligado ao campo.
- Use elementos semânticos: `button` para ação, `a` para navegação, `table` para dados tabulares, um `h1` por tela.
- A interface precisa ser utilizável em computador, tablet e celular (RNF01), sem rolagem horizontal da página. O `DataTable` vira lista de cartões no celular.
- A página pública é pensada primeiro para celular.

## Padrões de tela

### Listagem

1. Título e ação primária (ex.: "Novo loteamento"), escondida para quem não tem permissão.
2. Barra de filtros e busca, sincronizada com a URL ([exceção de dados pessoais](api-integration.md#filtros-na-url)).
3. `DataTable` paginada, com ação por linha.
4. Estados de carregamento, vazio e erro.

### Formulário

- Validação com `react-hook-form` e Zod, com mensagens em português no próprio campo.
- Erro de campo da API aparece embaixo do campo correspondente; os demais, em um alerta no topo do formulário ou em Toast.
- O botão de enviar fica desabilitado durante o envio, para evitar duplicidade.
- Use máscaras de CPF/CNPJ, telefone, moeda e área. O valor enviado à API segue o [contrato](api-integration.md#tipos-de-dados).
- Depois de salvar: Toast de sucesso e retorno à listagem ou ao detalhe.

### Detalhe

Cabeçalho com identificação e Badge de status; seções em blocos; ações conforme o perfil e o status. Ações indisponíveis para o perfil não aparecem. Dados que o perfil não pode ver não são apenas escondidos com CSS: eles não devem chegar à tela (ver [security.md](security.md#lgpd-na-interface)).

### Confirmação com motivo

Ações destrutivas ou de negócio (cancelar, rejeitar, bloquear, desativar, excluir) usam `ConfirmDialog`:

- O título diz a ação e o alvo: "Cancelar a reserva do lote 12?".
- O motivo é um campo obrigatório quando a regra exigir, e o botão de confirmar fica inativo até ser preenchido.
- O botão de confirmar usa a variante de perigo e descreve a ação ("Cancelar reserva", não "OK").
- Ao falhar, o diálogo continua aberto, com a mensagem de erro.

## Estados

Toda tela ou bloco com dados trata os três estados, além do sucesso:

| Estado     | Como                                                            | Texto                                                                   |
| ---------- | --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Carregando | `Skeleton` no formato do conteúdo; `Spinner` só em ações curtas | sem texto, com `aria-label`                                             |
| Vazio      | `EmptyState`, com ação quando houver                            | distingue "nenhum cadastro ainda" de "nenhum resultado para os filtros" |
| Erro       | mensagem de `getErrorMessage()`, com opção de tentar novamente  | nunca mostra detalhes técnicos                                          |

O status do lote e o da proposta são sempre exibidos pelo Badge, com os valores do contrato traduzidos para texto de tela (`DISPONIVEL` → "Disponível"). O status da proposta é visível só internamente, nunca no link público.
