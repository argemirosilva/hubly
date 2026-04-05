# Plano de Implementação: Melhorias em Automações, Agendamentos e Permissões

## Visão Geral

Implementação incremental das 9 melhorias no sistema Hubly/Agendei, organizadas em: alterações de schema, backend (tRPC/scheduler), e frontend (React). Cada tarefa referencia requisitos específicos e propriedades de corretude do design.

## Tarefas

- [x] 1. Alterações de schema e migração do banco de dados
  - [x] 1.1 Adicionar campos `midiaUrl` e `isTeste` na tabela `historico_envios_automacao`
    - Adicionar `midiaUrl: text("midiaUrl")` para armazenar URL de mídia no registro da fila
    - Adicionar `isTeste: boolean("isTeste").default(false)` para flag de envio de teste
    - Arquivo: `drizzle/schema.ts` — tabela `historicoEnviosAutomacao`
    - _Requisitos: 4.1, 5.2_

  - [x] 1.2 Tornar `destinatarioId` nullable na tabela `notificacoes`
    - Alterar `destinatarioId: int("destinatarioId").notNull()` para `destinatarioId: int("destinatarioId")`
    - NULL = notificação visível para todos os admins
    - Arquivo: `drizzle/schema.ts` — tabela `notificacoes`
    - _Requisitos: 8.6_

  - [x] 1.3 Adicionar campos `automacaoRenovacao` e `dataValidade` na tabela `pacotes_cliente`
    - Adicionar `automacaoRenovacao: boolean("automacaoRenovacao").default(false)`
    - Adicionar `dataValidade: date("dataValidade")` (nullable)
    - Arquivo: `drizzle/schema.ts` — tabela `pacotesClientes`
    - _Requisitos: 9.1, 9.2_

  - [x] 1.4 Gerar e aplicar migração SQL
    - Gerar migração Drizzle com os 3 conjuntos de alterações
    - SQL esperado: ALTER TABLE para `historico_envios_automacao`, `notificacoes`, `pacotes_cliente`
    - _Requisitos: 4.1, 5.2, 8.6, 9.1, 9.2_

- [x] 2. Checkpoint — Verificar schema e migração
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Backend — Correção do envio de mídia e procedure testarEnvio (Req 4, 5)
  - [x] 3.1 Corrigir `processarFilaPendente` para suportar envio de mídia
    - No worker da fila em `server/scheduler.ts`, ao processar cada item pendente, verificar se o registro possui `midiaUrl`
    - Se `midiaUrl` presente: classificar tipo (imagem vs documento pela extensão) e chamar `waManager.sendMediaMessage` com caption
    - Se envio de mídia falha: enviar apenas texto e registrar aviso em `erroDetalhe`
    - Arquivo: `server/scheduler.ts` — função `processarFilaPendente`
    - _Requisitos: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 3.2 Escrever teste de propriedade para classificação de tipo de mídia
    - **Propriedade 7: Classificação correta de tipo de mídia**
    - **Valida: Requisitos 4.2, 4.3**

  - [x] 3.3 Criar procedure `automacoes.testarEnvio` no router
    - Criar mutation tRPC que aceita `automacaoId` e `telefone`
    - Buscar automação, verificar permissão admin, substituir variáveis por dados de exemplo
    - Enfileirar na `historico_envios_automacao` com `status: "pendente"`, `isTeste: true`, `midiaUrl` da automação
    - Arquivo: `server/routers.ts` — dentro do router `automacoes`
    - _Requisitos: 5.1, 5.2, 5.4, 5.6_

  - [ ]* 3.4 Escrever teste de propriedade para envio de teste via fila
    - **Propriedade 8: Envio de teste percorre a fila completa**
    - **Valida: Requisitos 5.2, 5.4**

  - [x] 3.5 Garantir que `processarFilaPendente` processa envios com `isTeste=true` normalmente
    - O worker não deve tratar envios de teste de forma diferente — fluxo completo incluindo mídia
    - Se WhatsApp desconectado, marcar como "falhou" com erro informativo
    - Arquivo: `server/scheduler.ts`
    - _Requisitos: 5.4, 5.5_

- [x] 4. Backend — Diagnóstico completo dos triggers (Req 2)
  - [x] 4.1 Auditar e corrigir triggers de evento inline nos handlers
    - Verificar que todos os handlers de evento (agendamento criado, confirmado, cancelado, concluído, cliente criado, pré-agendamento expirado, pacote renovado) enfileiram corretamente na fila com `midiaUrl` quando aplicável
    - Garantir que `registrarEnvioAutomacao` preenche todos os campos (automacaoNome, clienteNome, agendamentoId)
    - Arquivo: `server/routers.ts` — handlers de agendamento e cliente
    - _Requisitos: 2.1_

  - [ ]* 4.2 Escrever teste de propriedade para enfileiramento por evento
    - **Propriedade 1: Enfileiramento por evento gera registro pendente**
    - **Valida: Requisito 2.1**

  - [x] 4.3 Auditar e corrigir triggers baseados em dias no scheduler
    - Verificar `dias_antes_agendamento`: cálculo `hoje + N dias` = data alvo, janela ±15min do horaDisparo
    - Verificar `dias_depois_agendamento`: cálculo `hoje - N dias` = data alvo, janela ±15min do horaDisparo
    - Garantir deduplicação via `jaEnviouLembrete(empresaId, automacaoId, agendamentoId)`
    - Arquivo: `server/scheduler.ts` — função `processarAutomacoesAgendadas`
    - _Requisitos: 2.2, 2.5, 2.8_

  - [ ]* 4.4 Escrever teste de propriedade para cálculo de data alvo (dias)
    - **Propriedade 2: Cálculo correto de data alvo para triggers baseados em dias**
    - **Valida: Requisitos 2.2, 2.5**

  - [x] 4.5 Auditar e corrigir triggers baseados em horas no scheduler
    - Verificar `horas_antes_agendamento`: `timestamp_agendamento - delayMinutos`
    - Verificar `horas_apos_agendamento`: `timestamp_agendamento + delayMinutos`
    - Garantir deduplicação
    - Arquivo: `server/scheduler.ts` — função `processarAutomacoesAgendadas`
    - _Requisitos: 2.3, 2.4, 2.8_

  - [ ]* 4.6 Escrever teste de propriedade para cálculo de timestamp (horas)
    - **Propriedade 3: Cálculo correto de timestamp para triggers baseados em horas**
    - **Valida: Requisitos 2.3, 2.4**

  - [x] 4.7 Auditar e corrigir trigger de aniversário do mês
    - Verificar filtragem de clientes por mês de nascimento = mês atual
    - Garantir deduplicação por `automacaoId + clienteId + data`
    - Arquivo: `server/scheduler.ts`
    - _Requisitos: 2.6_

  - [ ]* 4.8 Escrever teste de propriedade para filtragem de aniversariantes
    - **Propriedade 4: Filtragem correta de aniversariantes do mês**
    - **Valida: Requisito 2.6**

  - [x] 4.9 Auditar e corrigir trigger de data fixa
    - Verificar que dispara na data e horário exatos configurados
    - Arquivo: `server/scheduler.ts`
    - _Requisitos: 2.7_

  - [ ]* 4.10 Escrever teste de propriedade para deduplicação de envios
    - **Propriedade 5: Deduplicação de envios (idempotência)**
    - **Valida: Requisito 2.8**

- [x] 5. Checkpoint — Verificar backend de automações
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Backend — Modal de debug e procedure debugList (Req 3)
  - [x] 6.1 Criar procedure `automacoes.debugList`
    - Query em `historico_envios_automacao` com filtros: `automacaoId`, `status`, `periodo` (1h, 24h, 7d), `limite`
    - Retornar: id, criadoEm, automacaoNome, tipoGatilho (via join com automacoes), status, clienteNome, telefone, erroDetalhe, mensagem, isTeste, midiaUrl
    - Arquivo: `server/routers.ts` — router `automacoes`
    - _Requisitos: 3.2, 3.4_

  - [ ]* 6.2 Escrever teste de propriedade para filtragem do debug
    - **Propriedade 6: Filtragem correta no modal de debug**
    - **Valida: Requisito 3.4**

- [x] 7. Backend — Filtro por profissional no calendário (Req 6)
  - [x] 7.1 Adicionar parâmetro `profissionalId` opcional na procedure `agendamentos.list`
    - Aceitar `profissionalId: z.number().optional()` no input
    - Quando fornecido por admin, filtrar explicitamente por profissional
    - Manter lógica existente de `resolveAdminContext` para não-admins
    - Arquivo: `server/routers.ts` — procedure `agendamentos.list`
    - _Requisitos: 6.2, 6.3_

  - [ ]* 7.2 Escrever teste de propriedade para filtro de profissional
    - **Propriedade 9: Filtro de profissional no calendário**
    - **Valida: Requisito 6.2**

- [x] 8. Backend — Fluxo de aprovação de bloqueios (Req 7)
  - [x] 8.1 Ajustar procedure `bloqueios.create` para forçar status "pendente" para não-admin
    - Usar `resolveAdminContext` para determinar se é admin
    - Se não-admin: forçar `status: "pendente"` e registrar `profissionalId` do solicitante
    - Criar notificação tipo `bloqueio_solicitado` para admins
    - Arquivo: `server/routers.ts` — procedure `bloqueios.create`
    - _Requisitos: 7.1, 7.2_

  - [x] 8.2 Ajustar procedures `bloqueios.aprovar` e `bloqueios.recusar` com verificação de permissão
    - Verificar permissão admin via `requirePermissao(ctx, empresa, 'agendaAprovarBloqueio')`
    - Ao aprovar: criar notificação para o profissional solicitante
    - Ao recusar: criar notificação com motivo para o profissional solicitante
    - Arquivo: `server/routers.ts` — procedures `bloqueios.aprovar` e `bloqueios.recusar`
    - _Requisitos: 7.5, 7.6, 7.7_

  - [ ]* 8.3 Escrever teste de propriedade para bloqueio de não-admin sempre pendente
    - **Propriedade 10: Bloqueio criado por não-admin sempre tem status pendente**
    - **Valida: Requisito 7.1**

  - [ ]* 8.4 Escrever teste de propriedade para autorização de aprovação/recusa
    - **Propriedade 11: Autorização de aprovação/recusa de bloqueios**
    - **Valida: Requisito 7.7**

- [x] 9. Backend — Notificações filtradas por usuário (Req 8)
  - [x] 9.1 Criar função `getNotificacoesByEmpresa` com filtro por papel
    - Admin: retornar todas da empresa
    - Não-admin: retornar onde `destinatarioId = profissionalId` OU `destinatarioId IS NULL`
    - Arquivo: `server/db.ts`
    - _Requisitos: 8.1, 8.5_

  - [x] 9.2 Ajustar procedure `notificacoes.list` para usar `resolveAdminContext`
    - Usar `resolveAdminContext` para determinar se filtra por profissional
    - Chamar `getNotificacoesByEmpresa` com o `profId` resolvido
    - Arquivo: `server/routers.ts` — procedure `notificacoes.list`
    - _Requisitos: 8.1, 8.5_

  - [x] 9.3 Ajustar handlers de criação de notificação para preencher `destinatarioId`
    - Ao criar notificações de agendamento: `destinatarioId = profissionalId` do agendamento
    - Ao criar notificações de bloqueio aprovado/recusado: `destinatarioId = profissionalId` do solicitante
    - Arquivo: `server/routers.ts` — handlers de agendamento e bloqueio
    - _Requisitos: 8.2, 8.3, 8.4_

  - [ ]* 9.4 Escrever teste de propriedade para visibilidade de notificações por papel
    - **Propriedade 12: Visibilidade de notificações por papel**
    - **Valida: Requisitos 8.1, 8.5**

  - [ ]* 9.5 Escrever teste de propriedade para atribuição de destinatarioId
    - **Propriedade 13: Atribuição correta de destinatarioId em notificações**
    - **Valida: Requisitos 8.2, 8.3**

- [x] 10. Backend — Automação de renovação de pacotes (Req 9)
  - [x] 10.1 Ajustar procedures `pacotes.abrirPacote` e edição para aceitar novos campos
    - Aceitar `automacaoRenovacao` e `dataValidade` nos inputs de criação e edição
    - Persistir os novos campos na tabela `pacotes_cliente`
    - Arquivo: `server/routers/pacotes.ts`
    - _Requisitos: 9.1, 9.2_

  - [x] 10.2 Implementar trigger `pacote_vencendo` no scheduler com lógica de 7d e 1d
    - Buscar pacotes com `automacaoRenovacao = true` e `dataValidade IS NOT NULL`
    - Se `dataValidade - 7 dias = hoje` → enfileirar aviso "1 semana antes"
    - Se `dataValidade - 1 dia = hoje` → enfileirar aviso "1 dia antes"
    - Deduplicação: `automacaoId + pacoteClienteId + tipoAviso + dataAlvo`
    - Arquivo: `server/scheduler.ts`
    - _Requisitos: 9.3, 9.4, 9.6_

  - [ ]* 10.3 Escrever teste de propriedade para trigger pacote_vencendo
    - **Propriedade 14: Trigger pacote_vencendo dispara nos dias corretos**
    - **Valida: Requisitos 9.3, 9.4, 9.7**

  - [x] 10.4 Implementar trigger `sessoes_acabando` no scheduler
    - Buscar pacotes com `automacaoRenovacao = true`
    - Para cada pacote, verificar itens: se QUALQUER item tem `sessoesRestantes = 1` → enfileirar
    - Deduplicação: `automacaoId + pacoteClienteId + pacoteClienteItemId`
    - Arquivo: `server/scheduler.ts`
    - _Requisitos: 9.5, 9.6_

  - [ ]* 10.5 Escrever teste de propriedade para trigger sessoes_acabando
    - **Propriedade 15: Trigger sessoes_acabando dispara quando qualquer serviço tem 1 sessão**
    - **Valida: Requisitos 9.5, 9.7**

  - [ ]* 10.6 Escrever teste de propriedade para deduplicação de avisos de renovação
    - **Propriedade 16: Deduplicação de avisos de renovação de pacotes**
    - **Valida: Requisito 9.6**

- [x] 11. Checkpoint — Verificar todo o backend
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Frontend — Aba de pacotes no modal de agendamento (Req 1)
  - [x] 12.1 Reorganizar UI do `NovaAgendaModal` para exibir seção de pacotes ativos
    - Após seleção do cliente, se `pacotesAtivos.length > 0`, exibir seção "Pacotes Ativos" com cards clicáveis antes da seleção de serviço
    - Cada card mostra: nome do pacote, serviço vinculado, sessões disponíveis
    - Ao clicar em um pacote: preencher automaticamente o serviço e vincular `pacoteClienteItemId`
    - Se cliente sem pacotes: ocultar seção e manter fluxo atual
    - Arquivo: `client/src/components/NovaAgendaModal.tsx`
    - _Requisitos: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 12.2 Escrever testes unitários para renderização do modal com/sem pacotes
    - Testar exibição da seção de pacotes quando cliente tem pacotes ativos
    - Testar ocultação quando cliente não tem pacotes
    - Testar preenchimento automático ao selecionar pacote
    - _Requisitos: 1.1, 1.2, 1.3_

- [x] 13. Frontend — Modal de debug de automações (Req 3)
  - [x] 13.1 Criar componente `DebugAutomacoesModal` e integrar na tela de automações
    - Botão "Debug" (ícone `Activity`) na lista de automações
    - Modal com tabela/lista de eventos usando `trpc.automacoes.debugList`
    - Filtros: select de automação, select de status, select de período
    - Polling via `refetchInterval: 5000` no TanStack Query
    - Itens com status "falhou" em destaque vermelho com `erroDetalhe` expandível
    - Itens com `isTeste = true` com badge "Teste"
    - Arquivo: `client/src/pages/Automacoes.tsx` (novo componente inline ou separado)
    - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 13.2 Integrar botão de teste de envio na UI de automações
    - Conectar ao `trpc.automacoes.testarEnvio` existente
    - Exibir toast de sucesso informando que o teste foi enfileirado
    - Arquivo: `client/src/pages/Automacoes.tsx`
    - _Requisitos: 5.3_

- [x] 14. Frontend — Filtro por profissional no calendário (Req 6)
  - [x] 14.1 Adicionar campo autocomplete de profissional no calendário (admin only)
    - Adicionar estado `profissionalFiltro: number | null`
    - Exibir Select com busca apenas para admins (`isOwner || pode('agendamentosVerTodos')`)
    - Passar `profissionalId` como parâmetro na query `trpc.agendamentos.list`
    - Manter filtro ao navegar entre meses
    - Para não-admins: ocultar o campo
    - Arquivo: `client/src/pages/Calendario.tsx`
    - _Requisitos: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 15. Frontend — Fluxo de aprovação de bloqueios (Req 7)
  - [x] 15.1 Ajustar tela de bloqueios para respeitar permissões
    - Usar `usePermissoes()` para determinar se é admin
    - Se não-admin: ocultar botões "Aprovar" e "Recusar", mostrar apenas status
    - Se admin: manter botões para bloqueios pendentes (já implementado)
    - Arquivo: `client/src/pages/Bloqueios.tsx`
    - _Requisitos: 7.3, 7.4_

- [x] 16. Frontend — Notificações filtradas (Req 8)
  - [x] 16.1 Ajustar tela de notificações (sem mudanças de UI necessárias)
    - O backend já filtra por papel — verificar que a query `notificacoes.list` é chamada sem parâmetros extras
    - Confirmar que a UI funciona corretamente com notificações filtradas
    - Arquivo: `client/src/pages/Notificacoes.tsx`
    - _Requisitos: 8.1, 8.5_

- [x] 17. Frontend — Automação de renovação de pacotes (Req 9)
  - [x] 17.1 Adicionar toggle e campo de data de validade no modal de pacotes
    - Toggle "Habilitar automação de renovação" (`automacaoRenovacao`)
    - Campo de data de validade opcional (`dataValidade`)
    - Quando toggle desabilitado: ocultar campo de data de validade
    - Conectar aos campos novos nas mutations de criação/edição de pacote
    - Arquivo: `client/src/pages/Pacotes.tsx` e/ou `client/src/components/ModalAbrirPacote.tsx`
    - _Requisitos: 9.1, 9.2_

- [x] 18. Checkpoint final — Verificar integração completa
  - Ensure all tests pass, ask the user if questions arise.

## Notas

- Tarefas marcadas com `*` são opcionais e podem ser puladas para um MVP mais rápido
- Cada tarefa referencia requisitos específicos para rastreabilidade
- Checkpoints garantem validação incremental
- Testes de propriedade validam propriedades universais de corretude definidas no design
- Testes unitários validam exemplos específicos e edge cases
