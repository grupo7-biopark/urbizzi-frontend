# Segurança

> **Status:** sessão e proteção de rotas foram entregues na FE-07, e as permissões por perfil, na FE-08. A regra de autorização vale de verdade no backend (ver [`docs/security.md`](https://github.com/grupo7-biopark/urbizzi-backend/blob/main/docs/security.md) dele). Aqui está como a interface a aplica.

## Princípios

1. **O servidor decide.** Esconder um botão melhora a experiência, mas não protege nada. Toda ação continua validada pela API (RNF06), e a interface trata o `403` mesmo com a ação escondida.
2. **O navegador não guarda credenciais.** Tokens ficam em cookies `httpOnly`, inacessíveis ao JavaScript.
3. **Minimização.** Só chega ao navegador o que a tela usa.

## Sessão: BFF + cookies `httpOnly`

O navegador nunca fala direto com a API. O Next atua como BFF (_backend for frontend_):

```text
Navegador ── cookie httpOnly ──► Next (/api/auth, /api/backend) ── Authorization: Bearer ──► API
```

| Rota do Next             | O que faz                                            | Rota da API                                  |
| ------------------------ | ---------------------------------------------------- | -------------------------------------------- |
| `POST /api/auth/login`   | autentica e grava os cookies                         | `POST /v1/auth/login`                        |
| `POST /api/auth/logout`  | revoga e apaga os cookies, mesmo se o backend falhar | `POST /v1/auth/logout`                       |
| `GET /api/auth/refresh`  | renova e volta à página, para Server Components      | `POST /v1/auth/refresh`                      |
| `/api/backend/[...path]` | injeta o token, renova no `401` e repassa a resposta | qualquer `/v1/...`, exceto as rotas de token |

O contrato do backend:

- O access token é um JWT de 15 minutos por padrão. O refresh token é opaco, com 7 dias por padrão.
- `POST /v1/auth/refresh` consome o refresh token e devolve outro. **Um refresh token só pode ser usado uma vez.**
- `GET /v1/auth/me` devolve id, nome, e-mail e perfil.

Regras:

1. Access e refresh token ficam em cookies `httpOnly`, `SameSite=Lax` e `Secure`. Só o ambiente de desenvolvimento em HTTP pode dispensar `Secure`.
2. **Renovação única**: com requisições simultâneas, só uma chama o refresh; as outras aguardam o resultado. Como o token é de uso único, duas renovações concorrentes derrubariam a sessão. O resultado fica disponível por 10 segundos, para quem chega depois com o cookie antigo. Isso vale por processo: com mais de uma réplica, será preciso um armazenamento compartilhado.
3. **Só Route Handlers gravam cookies.** Server Components não conseguem gravá-los durante a renderização. Por isso, `getUsuarioAtual()` não renova: com `401`, redireciona para `/api/auth/refresh`.
4. Refresh inválido (`401 REFRESH_TOKEN_INVALIDO`) apaga os cookies e leva a `/login?redirect=<rota>`. Falha temporária (`429`, `5xx`, rede) **mantém** os cookies: a sessão continua valendo, e a página mostra `/sessao-indisponivel`, com a opção de tentar novamente.
5. O proxy só encaminha para `/v1/...` em `API_URL`, nunca para uma URL vinda da requisição (risco de SSRF). Ele não repassa o header `Cookie` à API e não registra corpo, headers nem query string. As rotas `/v1/auth/login`, `refresh` e `logout` são bloqueadas no proxy, porque devolveriam tokens ao JavaScript do navegador.
6. Em métodos que alteram dados, o proxy e as rotas de autenticação conferem o header `Origin`. `SameSite=Lax` ajuda contra CSRF, mas Route Handlers não têm a checagem automática de origem das Server Actions.
7. `redirect` aceita só caminho interno (`getSafeRedirect()`), para evitar redirecionamento aberto.
8. Corpos de até 10 MB ficam em memória, para serem reenviados depois da renovação. Acima disso, seguem em fluxo: em um `401`, a sessão é renovada, mas o envio precisa ser repetido.

**Limitação conhecida:** a API limita login e refresh a 5 tentativas por minuto **por IP**, e não confia em `X-Forwarded-For`. Como todas as chamadas partem do servidor do Next, todos os usuários dividem esse limite. Até o backend tratar disso, várias pessoas renovando a sessão no mesmo minuto podem receber `429`, sem perder a sessão.

## Proteção de rotas

São duas camadas, com papéis diferentes:

| Camada     | Arquivo                                  | O que faz                                                                                                                          |
| ---------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Otimista   | `src/proxy.ts`                           | lê só o **cookie**, sem chamar a API: sem sessão, redireciona para `/login?redirect=...`; com sessão, tira de `/login`             |
| Definitiva | layout e páginas de `(app)`, no servidor | o layout exige a sessão; cada página chama `exigirPermissao()`, que consulta `GET /v1/auth/me` e, sem permissão, mostra a tela 403 |

- `src/proxy.ts` substitui o `middleware.ts`, porque a convenção antiga está depreciada no Next 16. Ele roda em toda rota, inclusive em pré-carregamentos, e a documentação do Next proíbe buscas lentas nele. Não o use como única proteção.
- O `matcher` dele exclui `/api`, `/_next`, arquivos estáticos e a página pública. Rotas de API respondem `401`, sem redirecionar.
- Ele também informa a rota atual ao layout, pelo header `x-urbizzi-path`, porque um layout não a conhece.
- A tela de login mostra a mesma mensagem para senha errada e usuário inativo, porque a API responde igual aos dois, para não revelar quais contas existem.
- A recuperação de senha mostra a mesma mensagem, exista ou não o e-mail. Em `/redefinir-senha`, o token fica só em memória: sai da URL e do histórico ao abrir, e a página usa `no-referrer`. Recarregar pede um novo link. O link do e-mail vem de `PASSWORD_RESET_URL`, no backend, que precisa apontar para esta rota.
- **A conferência fica em cada página**, porque o layout não roda de novo ao navegar entre telas.
- A tela 403 usa `forbidden()` e `(app)/forbidden.tsx`, que dependem da opção experimental `authInterrupts` do Next. Avaliado na FE-08: é o único jeito de responder com o status 403 de verdade e interromper a página sem depender de um `return` em cada tela. O uso está isolado em `permissao.server.ts`, então trocá-lo, se a API mudar, é simples.
- Na resposta 403, o Next envia um HTML sem conteúdo (`<html id="__next_error__">`) e monta a tela no navegador; nada da tela proibida vai na resposta. O título da aba continua sendo o da página pedida, porque o `metadata` de `forbidden.tsx` não tem efeito.

## Autorização por perfil

O mapa de permissões fica centralizado em `src/shared/auth/permissoes.ts` e espelha a matriz abaixo. Nunca compare o perfil direto em um componente (`perfil === 'GESTOR'`).

| Perfil        | Enum            | Papel                                                                                                  |
| ------------- | --------------- | ------------------------------------------------------------------------------------------------------ |
| Administrador | `ADMINISTRADOR` | configura o sistema e gerencia usuários; tudo o que o Gestor faz                                       |
| Gestor        | `GESTOR`        | gerencia cadastros, planta e links públicos; analisa propostas; vê auditoria e painel                  |
| Comercial     | `COMERCIAL`     | vendedor: cadastra clientes, cria e gerencia as **próprias** reservas e propostas, gera links públicos |
| Consulta      | `CONSULTA`      | somente leitura do mapa, dos lotes e do painel                                                         |

`ADMINISTRADOR` não é coringa automático: inclua-o explicitamente no mapa, como no backend.

| Onde                       | Use                                                         | Sem permissão                              |
| -------------------------- | ----------------------------------------------------------- | ------------------------------------------ |
| Página (servidor)          | `await exigirPermissao('acao')`, na primeira linha          | tela 403                                   |
| Busca em Server Component  | `await tratarAcessoNegado(buscar())`                        | tela 403, se a API responder `403`         |
| Botão ou ação              | `<Permitido acao="acao" donoId={id}>`                       | não aparece                                |
| Lógica de Client Component | `const pode = usePermissao(); pode('acao', { donoId: id })` | `false`, também enquanto o usuário carrega |

Nas ações marcadas com 👤 na matriz, sem `donoId` a resposta é se o perfil pode agir em algum registro (para o menu ou "Nova reserva"), e com `donoId`, se pode agir naquele registro.

O `403` da API é tratado mesmo com a ação escondida, porque o perfil pode ter mudado no meio da sessão: `DataTable`, `Form` e `useApiMutation` mostram a mensagem de `ACESSO_NEGADO`.

### Matriz de permissões

Cópia da matriz de [`docs/security.md`](https://github.com/grupo7-biopark/urbizzi-backend/blob/main/docs/security.md#matriz-de-permissões) do backend, que é a fonte de verdade. Se ela mudar lá, atualize aqui e em `permissoes.ts`. As linhas com † são interpretações do grupo.

Legenda: ✅ permitido · 👤 permitido só para os próprios registros · — negado

| Ação                                                                        | Administrador | Gestor | Comercial                   | Consulta |
| --------------------------------------------------------------------------- | ------------- | ------ | --------------------------- | -------- |
| Gerenciar usuários e configurações (prazos)                                 | ✅            | —      | —                           | —        |
| Cadastrar, editar e excluir loteamentos, quadras e lotes; importar planilha | ✅            | ✅     | —                           | —        |
| Enviar planta e posicionar marcadores                                       | ✅            | ✅     | —                           | —        |
| Cadastrar e editar clientes                                                 | ✅            | ✅     | ✅                          | —        |
| Ver e buscar clientes †                                                     | ✅            | ✅     | ✅                          | —        |
| Reservar, renovar e cancelar reserva                                        | ✅            | ✅     | 👤 (vendedor da reserva)    | —        |
| Listar reservas †                                                           | ✅            | ✅     | ✅                          | —        |
| Criar proposta                                                              | ✅            | ✅     | 👤 (sobre as suas reservas) | —        |
| Acompanhar propostas †                                                      | ✅            | ✅     | 👤                          | —        |
| Aprovar ou rejeitar proposta; ver pendências                                | ✅            | ✅     | —                           | —        |
| Marcar lote como Vendido                                                    | ✅            | ✅     | —                           | —        |
| Bloquear e desbloquear lote                                                 | ✅            | ✅     | —                           | —        |
| Gerar link público                                                          | ✅            | ✅     | ✅                          | —        |
| Desativar link público †                                                    | ✅            | ✅     | 👤 (links que gerou)        | —        |
| Ver mapa, lotes e painel                                                    | ✅            | ✅     | ✅                          | ✅       |
| Ver histórico de alterações                                                 | ✅            | ✅     | 👤 (dos seus registros)     | —        |

Nas linhas com 👤, a interface confere se o usuário atual é o dono do registro para mostrar a ação. A API confere de novo.

## O que nunca guardar no navegador

- **Em `localStorage`, `sessionStorage`, IndexedDB ou cookie legível por JavaScript:** tokens, senhas e dados pessoais.
- **No cache persistente do TanStack Query:** nada que contenha dado pessoal. O cache fica só em memória; não ative persistência em disco.
- **No bundle:** segredos. Só variáveis `NEXT_PUBLIC_*` chegam ao navegador, e elas não podem conter segredo. `API_URL` é de servidor.
- **Em props de Server para Client Component:** tokens ou campos que a tela não usa, porque tudo isso fica visível na página.

Ao sair, além de apagar os cookies, limpe o cache do TanStack Query, para os dados não aparecerem ao próximo usuário.

## LGPD na interface

Dados pessoais tratados: cliente (nome, CPF/CNPJ, e-mail, telefone, endereço) e usuário (nome, e-mail).

1. **Nada de dado pessoal em URL.** Rotas usam ids, nunca CPF, nome ou e-mail. Como URLs ficam em histórico, logs e cabeçalho `Referer`, a busca de clientes por nome ou documento não vai para os search params da tela (ver [api-integration.md](api-integration.md#filtros-na-url)).
2. **Nada de dado pessoal em log.** Sem `console.log` de usuário, cliente ou resposta da API, nem em ferramentas de erro ou analítica. Logue ids.
3. **Nada de dado pessoal em `localStorage`**, nem como rascunho de formulário.
4. **Acesso restrito.** O perfil Consulta não vê clientes (RNF08): não busque esses dados para ele, em vez de só escondê-los.
5. **Exposição mínima.** Listagens e relações mostram só `id` e `nome` do cliente; documento, e-mail e telefone aparecem só no detalhe.
6. **Mensagens de erro** não repetem dado pessoal: "Já existe um cliente com esse documento", não o CPF em si.
7. **Testes e desenvolvimento** usam só dados fictícios.

## Página pública

`/p/[token]` é aberta a clientes finais, sem login (RF36, RF37, RN18, RN19, RNF07).

1. Exibe **só** o necessário para o mapa: identificação do lote, status, geometria e marcador. Valor apenas quando autorizado no lote.
2. **Nunca** exibe nem carrega dados de cliente, reserva, proposta ou usuário interno, nem em respostas de rede que a tela ignore. Um e2e confere as respostas (FE-33).
3. Fica no grupo `(publico)`, fora do layout interno. Não lê cookies de sessão nem usa o proxy autenticado.
4. `noindex`, para não entrar em buscadores.
5. O token é a credencial do link: não o registre em logs e use `Referrer-Policy: no-referrer`, para ele não vazar ao abrir WhatsApp ou outros links externos.
6. Link inválido, expirado ou desativado mostra a mesma página de indisponibilidade, sem indicar qual foi o motivo.

## Segredos e configuração

- Variáveis são validadas com Zod na inicialização (`src/shared/config/env.schema.ts`); sem elas, a aplicação não sobe.
- Variável nova: adicione ao schema, ao `.env.example` (com valor fictício e comentário) e à tabela do README.
- Variável de servidor é lida com `getServerEnv()`; pública, com `publicEnv`. Não leia `process.env` direto no restante do código.
- `NEXT_PUBLIC_*` é incorporada ao bundle no build: ela não pode conter segredo, e mudar o valor exige novo build.
- `.env` e `.env.*` nunca são commitados (só `.env.example`).
- Não registre `process.env` em logs.

## Outras práticas

- Não use `dangerouslySetInnerHTML` com conteúdo vindo da API ou do usuário.
- Valide search params e `params` com Zod: a URL é entrada do usuário.
- Em links externos abertos em nova aba, use `rel="noopener noreferrer"`.
- Dependências: não adicione pacotes sem manutenção; rode `npm audit` ao atualizar.
