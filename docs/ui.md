# Interface

> **Status:** os tokens e os componentes são entregues na FE-04, e os padrões de listagem e formulário, na FE-06. Até lá, só o Tailwind CSS v4 está instalado. Os valores abaixo vêm da FE-04 e do manual de marca Urbizzi, que prevalece em caso de divergência.

## Design system

Use os componentes de `src/shared/ui/` (FE-04, FE-06) e os tokens do tema. Não recrie botão, campo ou diálogo dentro de uma funcionalidade. Se faltar uma variação, adicione-a ao design system.

Componentes base previstos: Button (primário, secundário, perigo, fantasma), Input, Textarea, Select, Checkbox, Switch, Label e mensagem de erro, Dialog, Drawer, Dropdown, Tabs, Table, Badge, Toast, Skeleton, EmptyState, Spinner, Pagination, Tooltip. Da FE-06: `DataTable`, barra de filtros, `Form`, `ConfirmDialog`, máscaras.

A FE-04 cria também a página `/design-system`, só em desenvolvimento, para consultar tudo isso.

### Tokens

Nas telas, use os tokens **semânticos**. Eles se adaptam aos temas claro e escuro. Não escreva cores fixas (`#EE6017`, `bg-orange-500`).

| Grupo          | Tokens                                                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Marca          | `laranja` (#EE6017), `preto`, `branco`, `prata` (#C5C7C7), `cinza-oliva` (#8F9289), `cinza-carvao` (#545759)                                                 |
| Semânticos     | `surface`, `surface-alt`, `ink`, `ink-muted`, `accent`, `on-accent`, `border`                                                                                |
| Status do lote | `status-disponivel` (verde), `status-reservado` (azul), `status-vendido` (rosa), `status-bloqueado` (cinza-carvão, aguardando o ponto em aberto 9 do escopo) |

### Tipografia

Inter (400, 700, 900) em textos e títulos e Bebas Neue em rótulos de seção, carregadas com `next/font`, sem requisição externa em tempo de execução. Escala: display, heading, section-label, body, small, caption.

## Regras do manual de marca

1. **Cantos retos**: raio 0 em tudo.
2. **Sem sombras e sem gradientes.** Separe áreas com borda ou fundo (`border`, `surface-alt`).
3. **Texto sobre laranja é sempre preto** (`on-accent`).
4. **Laranja sobre branco só em títulos de 24px ou mais.** Em tamanhos menores, ele não atinge o contraste exigido.
5. **Contraste de texto de pelo menos 4,5:1** nos dois temas.
6. **Logos sem alteração**: use `<Logo variant>`, que escolhe a versão certa para fundo claro, escuro ou laranja. Os arquivos ficam em `public/brand/`.

O manual de marca não está neste repositório: as regras acima foram transcritas da FE-04. Ao entregá-la, confira e complete esta seção com o manual.

## Acessibilidade e responsividade

- Tudo funciona por teclado, com foco visível.
- Status nunca depende só da cor: o Badge traz cor **e** texto, inclusive no mapa (legenda).
- Campo tem `<label>` associado, e erro é anunciado e ligado ao campo.
- Use elementos semânticos: `button` para ação, `a` para navegação, `table` para dados tabulares, um `h1` por tela.
- A interface precisa ser utilizável em computador, tablet e celular (RNF01), sem rolagem horizontal da página. Tabelas viram lista de cartões no celular (FE-06).
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
