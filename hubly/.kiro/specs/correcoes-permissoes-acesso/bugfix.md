# Documento de Requisitos de Bugfix — Correções de Permissões e Controle de Acesso

## Introdução

Este documento descreve 12 bugs de segurança, permissões e controle de acesso identificados no sistema Hubly/Agendei. Os problemas abrangem: determinação incorreta de `isAdmin`, campos ausentes no schema Drizzle, falta de filtragem por profissional em endpoints, falhas de verificação de propriedade em notificações, bypass de permissões em OAuth, inconsistências entre IDs usados para permissões vs filtros, ausência de verificação de permissão no frontend de notificações, e falta de criação de grupo Administradores no registro de owner.

---

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN um SystemUser pertence a um grupo que possui `agendamentosVerTodos = true` THEN o sistema determina `isAdmin = true` no endpoint `auth.me`, mesmo que o usuário não tenha outras permissões administrativas (como gerenciar profissionais, configurações, etc.)

1.2 WHEN o schema Drizzle da tabela `grupos_permissoes` é inspecionado THEN o sistema não possui um campo `isAdmin` dedicado, apesar de commits mencionarem essa coluna — forçando o uso de `agendamentosVerTodos` como proxy para admin

1.3 WHEN um profissional não-admin chama `bloqueios.list` THEN o sistema retorna TODOS os bloqueios da empresa (via `getBloqueiosByEmpresa`) sem filtrar pelo `profissionalId` do usuário logado, expondo bloqueios de outros profissionais

1.4 WHEN um SystemUser com permissão `agendaAprovarBloqueio` no grupo cria um bloqueio via `bloqueios.create` THEN o sistema auto-aprova o bloqueio (status = "aprovado") mesmo que o usuário não seja owner — a intenção era que apenas o owner pudesse auto-aprovar

1.5 WHEN o endpoint `notificacoes.list` determina o escopo de notificações THEN o sistema usa `resolveAdminContext` com `agendamentosVerTodos` em vez de uma permissão específica de notificações, misturando o escopo de agendamentos com o de notificações

1.6 WHEN um usuário chama `notificacoes.marcarLida` com um ID de notificação THEN o sistema marca a notificação como lida sem verificar se ela pertence ao usuário logado — qualquer usuário autenticado pode marcar qualquer notificação da empresa como lida

1.7 WHEN um usuário OAuth que NÃO é owner da empresa chama um endpoint protegido por `requirePermissao` THEN o sistema permite o acesso total (linha `if (!ctx.systemUser) return;`), pois qualquer usuário OAuth sem `systemUser` passa a verificação sem checar se é realmente owner

1.8 WHEN `resolveAdminContext` é chamado para um SystemUser THEN o sistema usa `ctx.systemUser.id` para buscar permissões via `getPermissoesGrupoByProfissional` mas retorna `ctx.systemUser.profissionalId` para filtros — se `id !== profissionalId`, as permissões são buscadas de um profissional e os filtros aplicados a outro

1.9 WHEN a página `Notificacoes.tsx` renderiza botões de aprovar/recusar bloqueios (vindos de notificações do sistema) THEN o frontend não usa `usePermissoes` para verificar se o usuário tem permissão `agendaAprovarBloqueio`, exibindo ações administrativas para todos os usuários

1.10 WHEN o schema Drizzle da tabela `permissoes_grupo` é inspecionado THEN os campos `notificacoesEscopo`, `agendaEscopo` e `calendarioEscopo` mencionados em commits não existem no schema, impedindo controle granular de escopo por funcionalidade

1.11 WHEN o schema Drizzle da tabela `permissoes_grupo` é inspecionado THEN os campos `pacotesVer`, `pacotesEditar` e `pacotesExcluir` mencionados em commits não existem no schema, impedindo controle de acesso à funcionalidade de pacotes

1.12 WHEN um novo owner se registra via `POST /api/auth/register` em `system-auth.ts` THEN o sistema cria a empresa e o profissional owner mas NÃO cria um grupo "Administradores" com todas as permissões habilitadas, deixando o owner sem grupo (`grupoId = null`) e dependendo do fallback `permissoes = null` no frontend

---

### Expected Behavior (Correct)

2.1 WHEN um SystemUser pertence a um grupo THEN o sistema SHALL determinar `isAdmin` com base em um campo dedicado `isAdmin` na tabela `grupos_permissoes` (ou verificando múltiplas permissões administrativas), e NÃO apenas por `agendamentosVerTodos`

2.2 WHEN o schema Drizzle da tabela `grupos_permissoes` é definido THEN o sistema SHALL incluir um campo `isAdmin` do tipo boolean (default false) para identificar explicitamente grupos com privilégios administrativos

2.3 WHEN um profissional não-admin chama `bloqueios.list` THEN o sistema SHALL retornar apenas os bloqueios do próprio profissional; WHEN um admin/owner chama `bloqueios.list` THEN o sistema SHALL retornar todos os bloqueios da empresa

2.4 WHEN um SystemUser (não-owner) com permissão `agendaAprovarBloqueio` cria um bloqueio via `bloqueios.create` THEN o sistema SHALL criar o bloqueio com status "pendente"; WHEN o owner cria um bloqueio THEN o sistema SHALL auto-aprovar com status "aprovado"

2.5 WHEN o endpoint `notificacoes.list` determina o escopo THEN o sistema SHALL usar a permissão `notificacoesVer` (já existente no schema) ou um campo de escopo dedicado para notificações, em vez de `agendamentosVerTodos`

2.6 WHEN um usuário chama `notificacoes.marcarLida` THEN o sistema SHALL verificar que a notificação pertence ao usuário logado (por `destinatarioId`) ou que o usuário é admin antes de marcar como lida; caso contrário, SHALL lançar erro FORBIDDEN

2.7 WHEN um usuário OAuth que NÃO é owner da empresa chama um endpoint protegido por `requirePermissao` THEN o sistema SHALL verificar se `ctx.user.id === empresa.ownerId` antes de conceder acesso; se não for owner e não for SystemUser, SHALL lançar erro FORBIDDEN

2.8 WHEN `resolveAdminContext` é chamado para um SystemUser THEN o sistema SHALL usar o mesmo ID tanto para buscar permissões quanto para aplicar filtros, garantindo consistência entre o profissional cujas permissões são verificadas e o profissional cujos dados são filtrados

2.9 WHEN a página `Notificacoes.tsx` renderiza ações de aprovar/recusar bloqueios THEN o frontend SHALL usar `usePermissoes` para verificar `agendaAprovarBloqueio` e exibir os botões apenas para usuários com essa permissão

2.10 WHEN o schema Drizzle da tabela `permissoes_grupo` é definido THEN o sistema SHALL incluir os campos `notificacoesEscopo`, `agendaEscopo` e `calendarioEscopo` (enum ou varchar: "todos", "proprio") para controle granular de escopo por funcionalidade

2.11 WHEN o schema Drizzle da tabela `permissoes_grupo` é definido THEN o sistema SHALL incluir os campos `pacotesVer`, `pacotesEditar` e `pacotesExcluir` (boolean, default false) para controle de acesso à funcionalidade de pacotes

2.12 WHEN um novo owner se registra via `POST /api/auth/register` THEN o sistema SHALL criar automaticamente um grupo "Administradores" com `isAdmin = true` e todas as permissões habilitadas, e SHALL vincular o profissional owner a esse grupo via `grupoId`

---

### Unchanged Behavior (Regression Prevention)

3.1 WHEN um owner OAuth (sem systemUser) acessa o sistema THEN o sistema SHALL CONTINUE TO conceder acesso total (permissoes = null) e identificá-lo como admin

3.2 WHEN um SystemUser com permissões corretamente configuradas no grupo acessa endpoints protegidos THEN o sistema SHALL CONTINUE TO verificar as permissões do grupo e permitir/negar acesso conforme configurado

3.3 WHEN um admin/owner lista bloqueios THEN o sistema SHALL CONTINUE TO retornar todos os bloqueios da empresa

3.4 WHEN um não-admin cria um bloqueio e não tem permissão `agendaAprovarBloqueio` THEN o sistema SHALL CONTINUE TO criar o bloqueio com status "pendente" e notificar os admins

3.5 WHEN um admin marca todas as notificações como lidas THEN o sistema SHALL CONTINUE TO marcar todas as notificações da empresa como lidas

3.6 WHEN o frontend usa `usePermissoes` em outras páginas (ex: `Bloqueios.tsx`) THEN o sistema SHALL CONTINUE TO funcionar corretamente com o hook existente

3.7 WHEN um profissional com `temAcesso = true` faz login via `POST /api/auth/login` THEN o sistema SHALL CONTINUE TO autenticar e criar sessão normalmente

3.8 WHEN permissões individuais (`permissoesIndividuais`) fazem override das permissões do grupo THEN o sistema SHALL CONTINUE TO aplicar a prioridade individual > grupo > padrão

3.9 WHEN o portal público de agendamento é acessado por clientes THEN o sistema SHALL CONTINUE TO funcionar sem exigir autenticação de sistema

3.10 WHEN agendamentos são criados, editados ou cancelados THEN o sistema SHALL CONTINUE TO respeitar as permissões existentes (`agendamentosCriar`, `agendamentosEditar`, `agendamentosCancelar`)

3.11 WHEN o dashboard exibe métricas filtradas por profissional THEN o sistema SHALL CONTINUE TO filtrar corretamente usando `profissionalId` para não-admins

3.12 WHEN convites de usuário são enviados e aceitos THEN o sistema SHALL CONTINUE TO vincular o novo usuário ao grupo especificado no convite
