# Mapa geográfico

Disponível em `/mapa/geografico`, com mapa de ruas real do OpenStreetMap e
contornos salvos pela API no Postgres. O menu Mapa e o atalho inicial abrem
diretamente essa tela. A planta por imagem continua em `/mapa` e pode ser aberta
pelo botão **Planta por imagem**.

Nos formulários de loteamento/lote, pressione **Demarcar no mapa**. Busque
um endereço (botão Pesquisar local) ou informe latitude/longitude. Ative
**Desenhar área**, clique nos cantos em sequência e conclua. Arraste os vértices
para ajustar. Há alternativa por teclado em **Informar ou editar coordenadas**:
um par `latitude, longitude` por linha, com ponto decimal, ou pares com vírgula
decimal separados por `;`. Pressione Aplicar coordenadas e depois Salvar.

O loteamento precisa ser demarcado antes das quadras. No painel **Quadras** do
detalhe do loteamento, use **Demarcar quadra no mapa** ao adicionar ou editar
uma quadra. A identificação e o contorno são salvos juntos. No mapa geográfico,
as quadras aparecem com seus nomes sobre as áreas; a consulta leva ao painel de quadras.

O cadastro de lote exige selecionar a quadra e mostra o limite dela e seus lotes
vizinhos. Um desenho só é enviado para a quadra em que foi iniciado.
Backend impede cruzamentos, quadras fora do loteamento, lotes fora da quadra e
sobreposição; permite divisas compartilhadas. A gravação de cadastro e geometria
é atômica. Formulário sem alteração no mapa mantém o caminho original da API.

O mapa mostra cores **e texto de status**, consulta os dados novamente a cada
10 segundos e permite abrir os detalhes do lote com as ações do perfil.
Nomes de quadras só aparecem na aproximação de ruas, quando há espaço para o
rótulo dentro da área; somem ao afastar e voltam ao aproximar.

Busca do Nominatim é manual, sem autocomplete, com cache e limite global
por processo no backend (uma única instância local). Usa serviço comunitário
sem garantia de disponibilidade; consulta de coordenadas e desenho funcionam
sem a busca. Política da busca: [Nominatim](https://operations.osmfoundation.org/policies/nominatim/).

Mapa base é de ruas; não é imagem de satélite.

O exemplo local tem contornos
fictícios, sem valor topográfico. A área em m² do cadastro não é recalculada.

Demarcações aceitam até 500 pontos, com zoom de aproximação até o nível 22.
Após concluir o desenho, os botões **+** entre os vértices inserem novos pontos
na borda; depois, arraste o ponto para refinar o limite sem refazer a área.
O zoom extra amplia o mapa base (não aumenta a resolução da imagem original).
