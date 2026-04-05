# Tarefas de Implementação — Correções de Permissões e Controle de Acesso

## Fase 1: Alterações no Schema (Drizzle)

- [x] 1.1 Adicionar campo `isAdmin` (boolean, default false) à tabela `permissoesGrupo` em `drizzle/schema.ts`
- [x] 1.2 Adicionar campos de escopo `notificacoesEscopo`, `agendaEscopo`, `calendarioEscopo` (varchar, default "proprio") à tabela `permissoesGrupo`
- [x] 1.3 Adicionar campos `pacotesVer`, `pacotesEditar`, `pacotesExcluir` (boolean, default false) à tabela `permissoesGrupo`
- [x] 1.4 Gerar migration Drizzle para as alterações do schema

## Fase 2: Correções no Backend — Funções Core

- [x] 2.1 Corrigir `requirePermissao` em `server/routers.ts`: remover bypass para OAuth não-owner, verificar `ctx.user.id === empresa.ownerId` antes de conceder acesso
- [x] 2.2 Corrigir `resolveAdminContext` em `server/routers.ts`: usar `ctx.systemUser.id` consistentemente para permissões e filtros; usar campo `isAdmin` do grupo em vez de `permField` para determinar admin
- [x] 2.3 Corrigir `auth.me` em `server/routers.ts`: substituir `agendamentosVerTodos` por campo `isAdmin` do grupo para determinar `isAdmin`

## Fase 3: Correções no Backend — Endpoints

- [x] 3.1 Corrigir `bloqueios.list`: usar `resolveAdminContext` para filtrar bloqueios por `profissionalId` quando não-admin; atualizar `getBloqueiosByEmpresa` em `server/db.ts` para aceitar parâmetro opcional `profissionalId`
- [x] 3.2 Corrigir `bloqueios.create`: auto-aprovar apenas quando o profissional tem `isOwner = true` (campo da tabela `profissionais`), não por `agendaAprovarBloqueio`
- [x] 3.3 Corrigir `notificacoes.list`: usar permissão `notificacoesVer` ou campo `notificacoesEscopo` em vez de `agendamentosVerTodos` no `resolveAdminContext`
- [x] 3.4 Corrigir `notificacoes.marcarLida`: buscar notificação por ID, verificar que `destinatarioId` corresponde ao profissional logado ou que o usuário é admin; lançar FORBIDDEN caso contrário

## Fase 4: Correção no Registro

- [x] 4.1 Corrigir `POST /api/auth/register` em `server/_core/system-auth.ts`: após criar empresa e profissional, criar grupo "Administradores" com `isAdmin = true` e todas as permissões habilitadas, e vincular o profissional owner via `grupoId`

## Fase 5: Correções no Frontend

- [x] 5.1 Corrigir `Notificacoes.tsx`: importar `usePermissoes`, usar `pode('agendaAprovarBloqueio')` para condicionar exibição de botões de aprovar/recusar bloqueios (se houver ações de bloqueio nesta página)

## Fase 6: Testes

- [ ] 6.1 Escrever testes unitários para `requirePermissao` cobrindo: OAuth owner (permite), OAuth não-owner (bloqueia), SystemUser com permissão (permite), SystemUser sem permissão (bloqueia)
- [ ] 6.2 Escrever testes unitários para `resolveAdminContext` cobrindo: consistência de IDs, uso de `isAdmin` do grupo
- [ ] 6.3 Escrever testes unitários para `bloqueios.list` com filtro por profissional e `bloqueios.create` com auto-aprovação apenas para owner
- [ ] 6.4 Escrever testes unitários para `notificacoes.marcarLida` com verificação de propriedade
- [ ] 6.5 Escrever teste de integração para fluxo de registro: criação de grupo Administradores e vinculação do profissional
- [ ] 6.6 Verificar que testes de preservação passam: owner OAuth com acesso total, permissões individuais com override, login normal, portal público
