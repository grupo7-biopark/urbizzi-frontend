# Painel de indicadores (FE-34)

A tela inicial consulta resumo de lotes, vendas e totais de pendências do
backend. Os filtros de período e loteamento ficam na URL. O fim do período
inclui todo o dia em UTC, conforme o contrato da API.

As vendas são exibidas em barras com valores e quantidades legíveis sem
depender de cor. A série pode ser agrupada por dia, semana ou mês. O ranking
por vendedor usa a série já agregada no backend.

O endpoint de pendências retorna contagens. Para os perfis que podem listar
reservas, o painel exibe até cinco reservas próximas do vencimento e cinco
propostas em análise, com links para o detalhe dos respectivos lotes. A lista
reutiliza o escopo das rotas de reservas e considera a data de envio ao filtrar
propostas. O perfil Consulta recebe os indicadores agregados.

`e2e/painel-real.spec.ts` confere o filtro de loteamento e o total do backend
numa tela móvel. Os cartões e as séries usam respostas fixas do MSW nos testes
de componente.
