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

## Destino público básico

Para o endereço gerado funcionar desde esta entrega, `/p/[token]` já consome
somente o contrato público da BE-38, sem cookies nem autenticação interna.
Apresenta planta, lotes paginados, valores autorizados e o contato geral de
atendimento. A consulta não usa cache; a página tem `noindex` e
`Referrer-Policy: no-referrer`. Os tiles passam por uma rota pública limitada a
imagens de plantas, sem encaminhar cookies ou cabeçalhos de autenticação.

Links inválidos e desativados exibem a mesma página de indisponibilidade. Falhas
temporárias exibem orientação para tentar novamente. O backend valida o link em
cada nova consulta; desativar não apaga conteúdo que já foi mostrado ao visitante.

A FE-33 continua responsável pela experiência completa da página pública. Esta
entrega inclui o destino mínimo necessário para testar o fluxo da FE-32, sem
encerrar a FE-33 ou acrescentar suas interações futuras ao escopo desta issue.

## Validação

Os cenários de navegador usam a API falsa do projeto. Cobrem geração, cópia,
abertura em contexto sem sessão, desativação e indisponibilidade após recarregar.
As capturas em `docs/capturas/` usam somente dados fictícios. Para repetir o fluxo
contra uma implantação real, é necessário preparar a planta ativa e os cadastros
de teste no backend; isso não é feito automaticamente pelos cenários locais.
