# Gestão de links públicos (FE-32)

`/links-publicos` usa os componentes existentes de tabela responsiva, formulário,
diálogo de confirmação, notificações e permissões. A API decide quais registros
cada conta pode consultar; a ação de desativar também considera o dono do link.
Criar e desativar invalidam as listas de links e o histórico de auditoria.

O escopo é opcional: todos os loteamentos ou um loteamento específico. As opções
percorrem todas as páginas da API, sem limitar o seletor aos primeiros cem itens.
A cópia usa a área de transferência quando disponível e oferece um campo
selecionável quando o navegador a bloqueia. Compartilhar usa Web Share; o
cancelamento pelo usuário não produz uma mensagem de erro.

## Mapa público (FE-33)

Para o endereço gerado funcionar desde esta entrega, `/p/[token]` já consome
somente o contrato público da BE-38, sem cookies nem autenticação interna.
Apresenta planta, lotes paginados, valores autorizados e o contato geral de
atendimento. A consulta não usa cache; a página tem `noindex` e
`Referrer-Policy: no-referrer`. Os tiles passam por uma rota pública limitada a
imagens de plantas, sem encaminhar cookies ou cabeçalhos de autenticação.

Links inválidos e desativados exibem a mesma página de indisponibilidade. Falhas
temporárias exibem orientação para tentar novamente. O backend valida o link em
cada nova consulta; desativar não apaga conteúdo que já foi mostrado ao visitante.

A página inclui legenda, painel do lote e atualização de status pelo canal
público SSE. O servidor projeta somente os campos do mapa autorizados para o
visitante. O valor ausente na resposta também fica ausente do painel.

O contato vem do canal geral autorizado pelo backend. A página oferece botões
para linhas de contato configuradas como links HTTPS, WhatsApp, `tel:` ou
`mailto:`. Se a API enviar apenas uma orientação textual, ela é mostrada como
texto. Dados de contato de contas internas não são consultados. A imagem da
marca em Open Graph é um PNG de 1200 × 630.

## Validação

Os cenários de navegador usam a API falsa do projeto. Cobrem geração, cópia,
abertura em contexto sem sessão, desativação e indisponibilidade após recarregar.
As capturas em `docs/capturas/` usam somente dados fictícios. Para repetir o fluxo
contra o backend real, execute `e2e/mapa-publico-real.spec.ts` com a preparação
de reservas documentada em [testing.md](testing.md). O cenário móvel verifica
isolamento de sessão, valor oculto, tokens inválido e desativado e acessibilidade
com axe. O teste também confere os corpos das respostas da página e verifica que
o evento público de mudança de status contém apenas o identificador e o status do lote.
