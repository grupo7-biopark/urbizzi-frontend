# Fluxos reais no navegador

`e2e/fluxos-reais.spec.ts` percorre o sistema com o backend, o banco e o
armazenamento de teste. A suíte cobre:

| Fluxo                                                          | Computador (1440×900) | Tablet (768×1024) | Celular (390×844) |
| -------------------------------------------------------------- | --------------------- | ----------------- | ----------------- |
| Reserva e proposta pelo Comercial, decisão e venda pelo Gestor | ✓                     | ✓                 | ✓                 |
| Bloqueio, desbloqueio, geração e desativação de link público   | ✓                     | ✓                 | ✓                 |
| Expiração pelo job, registro na lista e lote disponível        | ✓                     | ✓                 | ✓                 |
| Painel com filtro e dados persistidos                          | ✓                     | ✓                 | ✓                 |

O `axe` e a verificação de rolagem horizontal cobrem as pendências, os diálogos
de proposta, aprovação e venda, o lote vendido, o detalhe público, a lista de
reservas expiradas e o painel. `e2e/responsivo.spec.ts` complementa a cobertura
no tablet com a API simulada, incluindo o menu, login e formulários de cadastro.

## Execução local

Use a configuração de [reservas com backend real](testing.md#reservas-com-backend-real).
A API deve ter as migrações e o seed inicial. O job de reservas altera o status
ao encontrar o vencimento no passado, em um intervalo de cinco minutos. O teste
antecipa a data apenas da sua reserva fictícia e aguarda o job persistir o resultado.

```bash
npx playwright test e2e/fluxos-reais.spec.ts --workers=2
```

Para executar este arquivo, o frontend precisa incluir as telas das FE-23,
FE-24, FE-33 e FE-34 e os fluxos de reserva e proposta da `main`.

## GitHub Actions

O workflow `e2e-real.yml` compila o frontend e sobe Postgres, Garage, Mailpit e
API em um ambiente descartável. O job pode rodar em PRs do próprio repositório,
em pushes na `main` e manualmente. Para habilitá-lo, configure `URBIZZI_E2E_REAL`
como `true` em Variables e `URBIZZI_BACKEND_READ_TOKEN` em Secrets, com leitura
de Contents restrita ao repositório `urbizzi-backend`. O token é usado no
checkout do backend. O banco e as contas do job são fictícios.

## Revisão visual e cobertura adicional

A revisão local de painel e mapa conferiu as variantes horizontal branca e
laranja do logotipo, os fundos e a hierarquia de tipografia nos três tamanhos.
O painel e o mapa foram conferidos em tema escuro no tablet. A imagem de
compartilhamento do mapa reaproveita a marca do projeto.

Itens para ampliar a cobertura em issues futuras:

- Revisar os formulários de edição de clientes, loteamentos, lotes e usuários
  nos três tamanhos, com teclado, foco e zoom de 200%.
- Rodar a matriz completa de telas nos dois temas e em Safari e Firefox. A
  matriz atual usa Chromium, com uma amostra de tema escuro e tablet em paisagem.
