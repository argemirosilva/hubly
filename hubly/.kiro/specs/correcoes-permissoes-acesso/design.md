# Correções de Permissões e Controle de Acesso — Design de Bugfix

## Visão Geral

Este documento formaliza a estratégia de correção para 12 bugs de segurança e controle de acesso no sistema Hubly/Agendei. Os problemas incluem: determinação incorreta de `isAdmin` baseada em `agendamentosVerTodos`, campo `isAdmin` ausente no schema, falta de filtro por profissional em `bloqueios.list`, auto-aprovação inconsistente de bloqueios, uso de permissão errada em notificações, ausência de verificação de propriedade em `marcarLida`, bypass de `requirePermissao` para OAuth não-owner, inconsistência de IDs em `resolveAdminContext`, falta de `usePermissoes` em `Notificacoes.tsx`, campos de escopo ausentes no schema, permissões de pacotes ausentes, e falta de criação do grupo Administradores no registro.

A estratégia geral é: adicionar campos ausentes ao schema, corrigir a lógica de determinação de admin, aplicar filtros de segurança nos endpoints, e garantir verificações de permissão tanto no backend quanto no frontend.

## Glossário

- **Bug_Condition (C)**: Conjunto de condições que disparam cada um dos 12 bugs — inputs/estados onde o sistema se comporta incorretamente em relação a permissões e controle de acesso
- **Property (P)**: Comportamento correto esperado para cada bug — permissões verificadas corretamente, filtros aplicados, campos existentes no schema
- **Preservation**: Comportamentos existentes que NÃO devem ser alterados — acesso do owner OAuth, permissões individuais com override, portal público, fluxo de login
- **`requirePermissao`**: Função em `server/routers.ts` que verifica se o usuário tem uma permissão específica do grupo antes de executar uma ação
- **`resolveAdminContext`**: Função em `server/routers.ts` que determina se o usuário é admin e resolve o `profissionalId` para filtros de dados
- **`usePermissoes`**: Hook em `client/src/hooks/usePermissoes.ts` que expõe `pode()`, `isOwner`, `isAdmin` para verificação de permissões no frontend
- **`permissoesGrupo`**: Tabela Drizzle em `drizzle/schema.ts` com campos booleanos granulares de permissão por grupo
- **Owner OAuth**: Usuário autenticado via OAuth que é dono da empresa (`empresa.ownerId === user.id`), sem `systemUser`
- **SystemUser**: Profissional com `temAcesso = true` que faz login via email/senha, representado na tabela `profissionais`

## Detalhes dos Bugs

### Condição de Bug

Os 12 bugs se manifestam quando o sistema de permissões e controle de acesso é exercitado em cenários envolvendo SystemUsers, determinação de admin, filtragem de dados por profissional, e verificação de propriedade de recursos.

**Especificação Formal:**
```
FUNCTION isBugCondition(input)
  INPUT: input de tipo { acao, usuario, contexto }
  OUTPUT: boolean

  // Bug 1+2: isAdmin determinado por agendamentosVerTodos em vez de campo dedicado
  IF input.acao == "auth.me" AND input.usuario.isSystemUser
     AND input.usuario.grupo.agendamentosVerTodos == true
     AND input.usuario.grupo NÃO TEM campo isAdmin dedicado
     RETURN true

  // Bug 3: bloqueios.list sem filtro por profissional
  IF input.acao == "bloqueios.list" AND NOT input.usuario.isAdmin
     AND resultado CONTÉM bloqueios de OUTROS profissionais
     RETURN true

  // Bug 4: auto-aprovação para não-owner com agendaAprovarBloqueio
  IF input.acao == "bloqueios.create" AND NOT input.usuario.isOwner
     AND input.usuario.pode("agendaAprovarBloqueio")
     AND resultado.status == "aprovado"
     RETURN true

  // Bug 5: notificacoes.list usando agendamentosVerTodos
  IF input.acao == "notificacoes.list"
     AND resolveAdminContext USA "agendamentosVerTodos" em vez de permissão de notificações
     RETURN true

  // Bug 6: marcarLida sem verificação de propriedade
  IF input.acao == "notificacoes.marcarLida"
     AND input.notificacao.destinatarioId != input.usuario.profissionalId
     AND NOT input.usuario.isAdmin
     RETURN true

  // Bug 7: requirePermissao bypass para OAuth não-owner
  IF input.acao IN endpoints_protegidos
     AND input.usuario.isOAuth AND NOT input.usuario.isSystemUser
     AND input.usuario.id != empresa.ownerId
     RETURN true

  // Bug 8: resolveAdminContext com IDs inconsistentes
  IF input.acao IN endpoints_com_resolveAdminContext
     AND input.usuario.isSystemUser
     AND input.usuario.systemUser.id != input.usuario.systemUser.profissionalId
     RETURN true

  // Bug 9: Notificacoes.tsx sem usePermissoes
  IF input.acao == "renderNotificacoes"
     AND input.usuario NÃO TEM permissão "agendaAprovarBloqueio"
     AND botões aprovar/recusar VISÍVEIS
     RETURN true

  // Bug 10: campos de escopo ausentes no schema
  IF input.acao == "verificarEscopo"
     AND campo IN ["notificacoesEscopo", "agendaEscopo", "calendarioEscopo"]
     AND campo NÃO EXISTE em permissoesGrupo
     RETURN true

  // Bug 11: permissões de pacotes ausentes
  IF input.acao == "verificarPermissaoPacotes"
     AND campo IN ["pacotesVer", "pacotesEditar", "pacotesExcluir"]
     AND campo NÃO EXISTE em permissoesGrupo
     RETURN true

  // Bug 12: register sem grupo Administradores
  IF input.acao == "auth.register"
     AND resultado.profissional.grupoId == null
     AND grupo "Administradores" NÃO FOI criado
     RETURN true

  RETURN false
END FUNCTION
```

### Exemplos

- **Bug 1**: SystemUser com `agendamentosVerTodos = true` mas sem permissões administrativas reais → `auth.me` retorna `isAdmin = true` incorretamente
- **Bug 3**: Profissional "Maria" chama `bloqueios.list` e vê bloqueios de "João" e "Pedro" → deveria ver apenas os seus
- **Bug 4**: SystemUser com `agendaAprovarBloqueio` cria bloqueio → status "aprovado" em vez de "pendente" (só owner deveria auto-aprovar)
- **Bug 6**: Usuário A chama `notificacoes.marcarLida({ id: 42 })` onde notificação 42 pertence ao Usuário B → marca como lida sem erro
- **Bug 7**: Usuário OAuth que NÃO é owner chama endpoint protegido → `requirePermissao` faz `return` sem verificar, concedendo acesso
- **Bug 12**: Novo owner se registra → `profissional.grupoId = null`, frontend recebe `permissoes = {}` (sem permissões)

## Comportamento Esperado

### Requisitos de Preservação

**Comportamentos Inalterados:**
- Owner OAuth (sem systemUser) DEVE continuar com acesso total (`permissoes = null`)
- Permissões individuais (`permissoesIndividuais`) DEVEM continuar fazendo override das permissões do grupo
- Admin/owner listando bloqueios DEVE continuar vendo todos os bloqueios da empresa
- Não-admin criando bloqueio sem `agendaAprovarBloqueio` DEVE continuar com status "pendente"
- Admin marcando todas notificações como lidas DEVE continuar funcionando
- Portal público de agendamento DEVE continuar sem exigir autenticação
- Login via `POST /api/auth/login` DEVE continuar funcionando normalmente
- Dashboard DEVE continuar filtrando métricas por `profissionalId` para não-admins
- Convites de usuário DEVEM continuar vinculando ao grupo especificado

**Escopo:**
Todas as operações que NÃO envolvem os 12 cenários de bug devem permanecer completamente inalteradas. Isso inclui:
- Operações CRUD de clientes, serviços, agendamentos
- Automações e histórico de envios
- Prontuários e relatórios
- Configurações da empresa
- Fluxo de comissões

## Causa Raiz Hipotética

Com base na análise do código-fonte, as causas raiz são:

1. **`isAdmin` baseado em proxy incorreto** (`server/routers.ts`, `auth.me`): A linha `isAdmin = perms ? (perms as any).agendamentosVerTodos === true : false` usa `agendamentosVerTodos` como proxy para admin. Não existe campo `isAdmin` na tabela `permissoesGrupo`.

2. **Schema incompleto** (`drizzle/schema.ts`): A tabela `permissoesGrupo` não possui: `isAdmin` (boolean), `notificacoesEscopo`/`agendaEscopo`/`calendarioEscopo` (varchar), `pacotesVer`/`pacotesEditar`/`pacotesExcluir` (boolean).

3. **`bloqueios.list` sem filtro** (`server/routers.ts`): O endpoint chama `getBloqueiosByEmpresa(empresa.id)` diretamente sem usar `resolveAdminContext` para filtrar por profissional.

4. **Auto-aprovação incorreta** (`server/routers.ts`, `bloqueios.create`): A lógica verifica `agendaAprovarBloqueio` para auto-aprovar, mas deveria verificar apenas `isOwner`.

5. **`notificacoes.list` com permissão errada** (`server/routers.ts`): Usa `resolveAdminContext(ctx, empresa, "agendamentosVerTodos")` em vez de uma permissão específica de notificações.

6. **`marcarLida` sem verificação** (`server/routers.ts`): Chama `marcarNotificacaoLida(input.id)` sem verificar se a notificação pertence ao usuário logado.

7. **`requirePermissao` bypass** (`server/routers.ts`): A linha `if (!ctx.systemUser) return;` permite qualquer OAuth sem systemUser, incluindo não-owners.

8. **`resolveAdminContext` IDs inconsistentes** (`server/routers.ts`): Usa `ctx.systemUser.id` para buscar permissões via `getPermissoesGrupoByProfissional` mas retorna `ctx.systemUser.profissionalId` para filtros.

9. **`Notificacoes.tsx` sem verificação** (`client/src/pages/Notificacoes.tsx`): Não importa nem usa `usePermissoes` para condicionar exibição de ações administrativas.

10. **Register sem grupo** (`server/_core/system-auth.ts`): O endpoint `POST /api/auth/register` cria empresa e profissional mas não cria grupo "Administradores" nem vincula o profissional.

## Propriedades de Corretude

Property 1: Bug Condition - Determinação correta de isAdmin

_Para qualquer_ SystemUser autenticado, a função `auth.me` SHALL determinar `isAdmin` com base no campo dedicado `isAdmin` da tabela `permissoesGrupo` (ou verificando `isOwner` do profissional), e NÃO apenas por `agendamentosVerTodos`.

**Valida: Requisitos 2.1, 2.2**

Property 2: Bug Condition - Filtro de bloqueios por profissional

_Para qualquer_ chamada a `bloqueios.list` por um profissional não-admin, o sistema SHALL retornar apenas bloqueios onde `profissionalId` corresponde ao profissional logado.

**Valida: Requisito 2.3**

Property 3: Bug Condition - Auto-aprovação apenas para owner

_Para qualquer_ chamada a `bloqueios.create` por um SystemUser não-owner, o bloqueio SHALL ser criado com status "pendente", independentemente de ter permissão `agendaAprovarBloqueio`.

**Valida: Requisito 2.4**

Property 4: Bug Condition - Notificações com permissão correta

_Para qualquer_ chamada a `notificacoes.list`, o sistema SHALL usar `notificacoesVer` (ou campo de escopo dedicado) para determinar o escopo de notificações visíveis, e NÃO `agendamentosVerTodos`.

**Valida: Requisito 2.5**

Property 5: Bug Condition - Verificação de propriedade em marcarLida

_Para qualquer_ chamada a `notificacoes.marcarLida`, o sistema SHALL verificar que a notificação pertence ao usuário logado (por `destinatarioId`) ou que o usuário é admin, antes de marcar como lida.

**Valida: Requisito 2.6**

Property 6: Bug Condition - requirePermissao sem bypass OAuth

_Para qualquer_ usuário OAuth que NÃO é owner da empresa, `requirePermissao` SHALL lançar erro FORBIDDEN em vez de conceder acesso silenciosamente.

**Valida: Requisito 2.7**

Property 7: Bug Condition - resolveAdminContext com IDs consistentes

_Para qualquer_ SystemUser, `resolveAdminContext` SHALL usar o mesmo ID tanto para buscar permissões quanto para aplicar filtros de dados.

**Valida: Requisito 2.8**

Property 8: Bug Condition - Frontend com verificação de permissão

_Para qualquer_ renderização de `Notificacoes.tsx`, botões de aprovar/recusar bloqueios SHALL ser exibidos apenas para usuários com permissão `agendaAprovarBloqueio` (via `usePermissoes`).

**Valida: Requisito 2.9**

Property 9: Bug Condition - Campos de escopo no schema

_Para qualquer_ consulta ao schema `permissoesGrupo`, os campos `notificacoesEscopo`, `agendaEscopo`, `calendarioEscopo` SHALL existir como varchar com valores "todos" ou "proprio".

**Valida: Requisito 2.10**

Property 10: Bug Condition - Permissões de pacotes no schema

_Para qualquer_ consulta ao schema `permissoesGrupo`, os campos `pacotesVer`, `pacotesEditar`, `pacotesExcluir` SHALL existir como boolean (default false).

**Valida: Requisito 2.11**

Property 11: Bug Condition - Grupo Administradores no registro

_Para qualquer_ chamada a `POST /api/auth/register`, o sistema SHALL criar um grupo "Administradores" com `isAdmin = true` e todas as permissões habilitadas, e SHALL vincular o profissional owner a esse grupo.

**Valida: Requisito 2.12**

Property 12: Preservation - Comportamento inalterado para owner OAuth e fluxos existentes

_Para qualquer_ input onde nenhuma das condições de bug se aplica (owner OAuth acessando sistema, permissões individuais com override, portal público, login normal), o sistema corrigido SHALL produzir exatamente o mesmo resultado que o sistema original.

**Valida: Requisitos 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12**


## Implementação da Correção

### Alterações Necessárias

Assumindo que a análise de causa raiz está correta:

**Arquivo**: `drizzle/schema.ts`

**Tabela**: `permissoesGrupo`

**Alterações Específicas**:
1. **Adicionar campo `isAdmin`**: `isAdmin: boolean("isAdmin").default(false)` — campo dedicado para identificar grupos administrativos
2. **Adicionar campos de escopo**: `notificacoesEscopo`, `agendaEscopo`, `calendarioEscopo` como `varchar({ length: 10 }).default("proprio")` com valores "todos" ou "proprio"
3. **Adicionar permissões de pacotes**: `pacotesVer`, `pacotesEditar`, `pacotesExcluir` como `boolean().default(false)`
4. **Gerar migration**: Nova migration Drizzle para ALTER TABLE

---

**Arquivo**: `server/routers.ts`

**Função**: `auth.me` (query)

**Alterações Específicas**:
1. **Corrigir determinação de `isAdmin`**: Substituir `(perms as any).agendamentosVerTodos === true` por `(perms as any).isAdmin === true`

---

**Arquivo**: `server/routers.ts`

**Função**: `requirePermissao`

**Alterações Específicas**:
1. **Remover bypass OAuth**: Substituir `if (!ctx.systemUser) return;` por verificação explícita: se não é systemUser E não é owner (`ctx.user.id !== empresa.ownerId`), lançar FORBIDDEN

---

**Arquivo**: `server/routers.ts`

**Função**: `resolveAdminContext`

**Alterações Específicas**:
1. **Consistência de IDs**: Usar `ctx.systemUser.id` tanto para `getPermissoesGrupoByProfissional` quanto para o `profId` retornado (em vez de `ctx.systemUser.profissionalId`)
2. **Usar `isAdmin` do grupo**: Verificar `(perms as any).isAdmin === true` em vez de `(perms as any)[permField] === true` para determinar admin

---

**Arquivo**: `server/routers.ts`

**Router**: `bloqueios.list`

**Alterações Específicas**:
1. **Adicionar filtro por profissional**: Usar `resolveAdminContext` para obter `profId`, filtrar bloqueios por `profissionalId` quando não-admin

---

**Arquivo**: `server/routers.ts`

**Router**: `bloqueios.create`

**Alterações Específicas**:
1. **Auto-aprovação apenas para owner**: Verificar `isOwner` do profissional (campo na tabela `profissionais`) em vez de `agendaAprovarBloqueio` para decidir auto-aprovação

---

**Arquivo**: `server/routers.ts`

**Router**: `notificacoes.list`

**Alterações Específicas**:
1. **Usar permissão correta**: Chamar `resolveAdminContext` com `"notificacoesVer"` ou usar campo `notificacoesEscopo` em vez de `"agendamentosVerTodos"`

---

**Arquivo**: `server/routers.ts`

**Router**: `notificacoes.marcarLida`

**Alterações Específicas**:
1. **Verificar propriedade**: Buscar a notificação por ID, verificar que `destinatarioId === profissionalId` do usuário logado OU que o usuário é admin; caso contrário, lançar FORBIDDEN

---

**Arquivo**: `client/src/pages/Notificacoes.tsx`

**Alterações Específicas**:
1. **Importar e usar `usePermissoes`**: Adicionar `import { usePermissoes } from "@/hooks/usePermissoes"` e usar `pode('agendaAprovarBloqueio')` para condicionar exibição de botões administrativos

---

**Arquivo**: `server/_core/system-auth.ts`

**Função**: `POST /api/auth/register`

**Alterações Específicas**:
1. **Criar grupo Administradores**: Após criar empresa e profissional, inserir grupo em `gruposPermissoes` com `isAdmin = true`
2. **Criar permissões do grupo**: Inserir em `permissoesGrupo` com todas as permissões `= true`
3. **Vincular profissional**: Atualizar `profissionais.grupoId` com o ID do grupo criado

---

**Arquivo**: `server/db.ts`

**Função**: `getBloqueiosByEmpresa`

**Alterações Específicas**:
1. **Adicionar parâmetro opcional `profissionalId`**: Quando fornecido, filtrar por `bloqueiosAgenda.profissionalId`

## Estratégia de Testes

### Abordagem de Validação

A estratégia segue duas fases: primeiro, surfar contraexemplos que demonstram os bugs no código não-corrigido, depois verificar que a correção funciona e preserva comportamentos existentes.

### Verificação Exploratória da Condição de Bug

**Objetivo**: Surfar contraexemplos que demonstram os bugs ANTES de implementar a correção. Confirmar ou refutar a análise de causa raiz.

**Plano de Teste**: Escrever testes que simulam cada cenário de bug e verificam o comportamento incorreto no código atual.

**Casos de Teste**:
1. **isAdmin por agendamentosVerTodos**: Criar SystemUser com grupo que tem `agendamentosVerTodos = true` mas sem outras permissões admin → verificar que `auth.me` retorna `isAdmin = true` incorretamente (falhará no código não-corrigido)
2. **bloqueios.list sem filtro**: Criar bloqueios de múltiplos profissionais → chamar `bloqueios.list` como não-admin → verificar que retorna bloqueios de outros (falhará no código não-corrigido)
3. **Auto-aprovação incorreta**: Criar bloqueio como SystemUser com `agendaAprovarBloqueio` → verificar que status é "aprovado" em vez de "pendente" (falhará no código não-corrigido)
4. **marcarLida sem verificação**: Chamar `marcarLida` com ID de notificação de outro usuário → verificar que não lança erro (falhará no código não-corrigido)
5. **requirePermissao bypass**: Chamar endpoint protegido como OAuth não-owner → verificar que acesso é concedido (falhará no código não-corrigido)

**Contraexemplos Esperados**:
- `auth.me` retorna `isAdmin = true` para usuário que só tem `agendamentosVerTodos`
- `bloqueios.list` retorna bloqueios de todos os profissionais para não-admin
- `bloqueios.create` retorna status "aprovado" para não-owner
- `notificacoes.marcarLida` não lança erro para notificação de outro usuário

### Verificação da Correção (Fix Checking)

**Objetivo**: Verificar que para todos os inputs onde a condição de bug se aplica, a função corrigida produz o comportamento esperado.

**Pseudocódigo:**
```
PARA TODO input ONDE isBugCondition(input) FAÇA
  resultado := funcaoCorrigida(input)
  ASSERT comportamentoEsperado(resultado)
FIM PARA
```

### Verificação de Preservação (Preservation Checking)

**Objetivo**: Verificar que para todos os inputs onde a condição de bug NÃO se aplica, a função corrigida produz o mesmo resultado que a função original.

**Pseudocódigo:**
```
PARA TODO input ONDE NÃO isBugCondition(input) FAÇA
  ASSERT funcaoOriginal(input) = funcaoCorrigida(input)
FIM PARA
```

**Abordagem de Teste**: Testes baseados em propriedades são recomendados para verificação de preservação porque:
- Geram muitos casos de teste automaticamente no domínio de input
- Capturam edge cases que testes manuais podem perder
- Fornecem garantias fortes de que o comportamento é inalterado para inputs não-bugados

**Plano de Teste**: Observar comportamento no código NÃO-CORRIGIDO primeiro para operações normais, depois escrever testes que capturam esse comportamento.

**Casos de Teste**:
1. **Preservação de acesso Owner OAuth**: Verificar que owner OAuth continua com `permissoes = null` e `isAdmin = true`
2. **Preservação de permissões individuais**: Verificar que override individual > grupo continua funcionando
3. **Preservação de bloqueios para admin**: Verificar que admin continua vendo todos os bloqueios
4. **Preservação de login**: Verificar que login via email/senha continua funcionando
5. **Preservação de portal público**: Verificar que portal não exige autenticação

### Testes Unitários

- Testar `requirePermissao` com OAuth owner, OAuth não-owner, SystemUser com permissão, SystemUser sem permissão
- Testar `resolveAdminContext` com diferentes combinações de IDs e permissões
- Testar `auth.me` com campo `isAdmin` do grupo
- Testar `bloqueios.list` com filtro por profissional
- Testar `bloqueios.create` auto-aprovação apenas para owner
- Testar `notificacoes.marcarLida` com verificação de propriedade
- Testar registro com criação de grupo Administradores

### Testes Baseados em Propriedades

- Gerar estados aleatórios de usuário/grupo e verificar que `isAdmin` é determinado corretamente pelo campo dedicado
- Gerar configurações aleatórias de bloqueios e verificar que filtro por profissional funciona
- Gerar inputs aleatórios para `requirePermissao` e verificar que apenas owner OAuth e SystemUsers com permissão passam
- Testar que para qualquer input não-bugado, o comportamento é preservado

### Testes de Integração

- Fluxo completo de registro → criação de grupo Administradores → login → verificação de permissões
- Fluxo de criação de bloqueio → aprovação/recusa com verificação de permissões
- Fluxo de notificações → marcar como lida com verificação de propriedade
- Fluxo de listagem de dados com filtro por profissional para não-admins
