Closes #<!-- número da issue -->

## Objetivo

<!-- O que este PR entrega e por quê, em 2 a 4 frases. -->

## O que mudou

<!-- Lista das principais mudanças (telas, rotas, componentes, configuração). -->

-

## Capturas de tela

<!-- Antes e depois, em desktop e celular, nos temas claro e escuro quando aplicável. Use somente dados fictícios. Escreva "Não se aplica" se não houver mudança visual. -->

## Testes realizados

- [ ] `npm run lint` sem erros
- [ ] `npm run format:check` ok
- [ ] `npm run typecheck` ok
- [ ] `npm run build` ok
- [ ] `npm test` passando (unitários e de componente novos/alterados: <!-- quais -->)
- [ ] `npm run test:e2e` passando (e2e novos/alterados: <!-- quais -->)
- [ ] Cobertura de `shared/` e de `api/`, `hooks/` e `schemas/` da funcionalidade ≥ 80% (`npm run test:cov`)
- [ ] Estados de carregamento, vazio e erro testados
- [ ] Testado manualmente no `docker compose up` (descreva abaixo, se aplicável)

<!-- Passos manuais executados e resultado. -->

## Acessibilidade e responsividade

- [ ] Navegável por teclado, com foco visível
- [ ] Campos com rótulo; erros anunciados e ligados ao campo
- [ ] Status não depende só da cor
- [ ] Contraste de pelo menos 4,5:1 nos temas claro e escuro
- [ ] Utilizável no celular, sem rolagem horizontal da página

## Decisões tomadas

<!-- Escolhas de design, alternativas descartadas e desvios em relação à issue ou aos docs. Escreva "Nenhuma" se não houver. -->

## Documentação

- [ ] `docs/` atualizado se mudou arquitetura, padrão ou convenção
- [ ] Item "previsto" dos docs atualizado, se este PR o entregou
- [ ] Tipos regenerados com `npm run api:generate`, se o contrato da API mudou
- [ ] `.env.example` e README atualizados se criou variável de ambiente

## Checklist de padrões

- [ ] Segue a estrutura de funcionalidade e as regras de dependência entre pastas
- [ ] Usa os componentes e tokens do design system, sem cores fixas
- [ ] Nenhum DTO da API digitado à mão
- [ ] Mutações invalidam as queries afetadas
- [ ] Permissões conforme a matriz de `docs/security.md`, com `403` da API tratado
- [ ] Sem dados pessoais, tokens ou segredos em URL, logs ou `localStorage`
- [ ] Dependência nova justificada em "Decisões tomadas"
- [ ] Commits no padrão Conventional Commits
