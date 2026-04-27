# Hubly — Visão Geral do Projeto (Abril 2026)

## O que é o Hubly

Plataforma SaaS de gestão para negócios de serviços (salões, clínicas, barbearias, consultórios). Gerencia agendamentos, clientes, profissionais, financeiro, automações WhatsApp e pacotes de serviços. Desenvolvido pela Orizon Tech.

## Stack Tecnológico

- **Frontend:** React 19 + TypeScript + Tailwind CSS 4 + Radix UI + Recharts
- **Backend:** Express.js + tRPC 11 (type-safe RPC)
- **Banco:** MySQL (TiDB Cloud) + Drizzle ORM
- **Auth:** OAuth (Supabase) para owners + JWT para system users (email/senha)
- **WhatsApp:** Baileys (planos Solo/Plus) + Z-API (plano Pro)
- **Pagamentos:** Stripe (4 planos: FREE, SOLO R$49, PLUS R$149, PRO R$299)
- **Storage:** AWS S3 (logos, comprovantes, prontuários)
- **IA:** OpenAI GPT-4o (score financeiro, insights, pipeline automático)
- **Build:** Vite 7 + esbuild
- **Testes:** Vitest (234+ testes)

## Estrutura de Diretórios

```
client/src/
  _core/hooks/       → useAuth.ts, useSystemAuth.ts
  components/        → AdminLayout, NovaAgendaModal, AgendamentoDetalheModal, etc.
  components/ui/     → 53 componentes Radix UI (shadcn pattern)
  hooks/             → usePermissoes, useMobile, usePushNotifications
  pages/             → 40+ páginas (Dashboard, Calendario, Agendamentos, etc.)
  pages/admin/       → RelatoriosBloqueios
  pages/orizontech/  → PainelOrizontech (painel admin da Orizon Tech)

server/
  _core/             → index.ts (Express), trpc.ts, env.ts, oauth.ts, system-auth.ts
  routers.ts         → Router principal tRPC (3000+ linhas)
  routers/           → pacotes.ts, pipeline.ts, portal.ts, iaFinanceiro.ts, etc.
  scheduler.ts       → Jobs agendados (automações, pacotes, lembretes)
  whatsapp.ts        → WhatsAppManager (Baileys)
  zapi.ts            → Integração Z-API (plano Pro)
  whatsapp-router.ts → Roteamento automático Baileys/Z-API por plano
  openai.ts          → Helper invokeOpenAI
  stripe.ts          → Stripe SDK
  plans.ts           → Limites por plano
  db.ts              → Funções de acesso ao banco (500+ linhas)

drizzle/
  schema.ts          → 40+ tabelas MySQL
  0000-0058.sql      → 59 migrations
```

## Banco de Dados — Tabelas Principais

### Core
- `users` — Usuários OAuth (Supabase), campo openId único
- `empresas` — Empresas clientes, com ownerId, configurações, horários, portal
- `profissionais` — Profissionais (fusão com system_users), temAcesso, passwordHash, grupoId
- `clientes` — Clientes da empresa, telefone, whatsapp, tags, saldoCredito

### Agendamentos
- `agendamentos` — Agendamento principal (clienteId, profissionalId, servicoId, status, valorTotal)
- `agendamento_itens` — Múltiplos serviços por agendamento (servicoId, valorUnitario, pacoteClienteItemId)
- `agendamento_pagamentos` — Pagamentos parciais (valor, meioPagamentoId)
- `agendamento_pessoas` — Pessoas vinculadas à reserva (múltiplas pessoas por agendamento)
- `bloqueios_agenda` — Bloqueios de horário (profissionalId, status aprovado/pendente/recusado)

### Serviços e Pacotes
- `servicos` — Serviços oferecidos (nome, valor, duração, categoria, ativo)
- `profissional_servicos` — Vínculo N:N profissional ↔ serviço
- `pacotes_modelos` — Templates de pacotes (nome, preço, validadeDias)
- `pacotes_modelos_itens` — Itens do modelo (servicoId, quantidade)
- `pacotes_clientes` — Pacotes abertos por cliente (status, valorPago, dataVencimento)
- `pacotes_clientes_itens` — Itens do pacote do cliente (quantidadeTotal, quantidadeUsada)

### Permissões
- `grupos_permissoes` — Grupos de permissão (nome, cor, isAdmin)
- `permissoes_grupo` — 56 campos booleanos de permissão + 3 escopos (notificações, agenda, calendário)
- `membros_grupo` — Vínculo profissional ↔ grupo
- `permissoes_individuais` — Override individual por profissional

### Financeiro
- `comissoes` — Comissões por agendamento (profissionalId, valorServico, percentual, valorComissao)
- `contas_pagar` — Despesas (descricao, valor, dataVencimento, status, categoriaId)
- `contas_receber` — Receitas (descricao, valor, origem, origemId, clienteId)
- `meios_pagamento` — Formas de pagamento (pix, débito, crédito, dinheiro)
- `taxas_parcela` — Taxas por parcela por meio de pagamento
- `categorias_despesa` — Categorias de despesa

### Automações
- `automacoes` — Configuração de automações (tipoGatilho, evento, corpoMensagem, flowJson, ativo)
- `historico_envios_automacao` — Fila e histórico de envios (status pendente/agendado/enviado/falhou, enviarEm, midiaUrl)

### Outros
- `notificacoes` — Notificações in-app (tipo, titulo, mensagem, lida)
- `notificacoes_pacotes` — Alertas de pacotes vencendo
- `prontuarios` — Prontuários e documentos do cliente
- `pipelines` — Pipelines Kanban (1 por empresa)
- `pipeline_colunas` — Colunas do pipeline
- `pipeline_cartoes` — Cartões do pipeline
- `pipeline_snapshots` — Versões anteriores do pipeline (para restauração)
- `subscriptions` — Assinaturas Stripe (plano, stripeCustomerId, stripeSubscriptionId)
- `usage_tracker` — Contadores de uso (agendamentos, notificações WhatsApp)
- `wa_session` — Sessão Baileys persistida no banco
- `wa_connection_log` — Log de eventos de conexão WhatsApp
- `dashboard_config` — Layout personalizado do dashboard por usuário
- `tokens_confirmacao` — Tokens para link de confirmação de agendamento

## Sistema de Autenticação

### Dois tipos de usuário:
1. **Owner OAuth** — Login via Supabase, `permissoes === null` (acesso total)
2. **System User** — Login email/senha, JWT 30 dias, permissões via grupo

### Fluxo:
- Owner cria empresa → cadastra profissionais → ativa acesso (temAcesso=true, senha)
- Profissional faz login com email/senha → JWT no cookie `system_session`
- Hook `usePermissoes()` centraliza verificação: `pode('campo')`, `podeAlgum()`, `podeTodos()`
- `__admin__` = campo especial que exige isOwner ou isAdmin do grupo

## Sistema de Permissões (56 campos)

### Categorias:
- **Atendimentos (6):** agendamentosVer, Criar, Editar, Concluir, Remarcar, Cancelar
- **Clientes (8):** clientesVer, VerContato, Criar, Editar, VerHistorico, VerProntuario, EditarProntuario, Excluir
- **Agenda/Bloqueios (3):** agendaSolicitarBloqueio, AprovarBloqueio, VerBloqueiosTodos
- **Financeiro (7):** financeiroVer, VerComissoes, EditarComissoes, MarcarPago, VerReceita, VerCustos, VerRelatorios
- **Profissionais (5):** profissionaisVer, Criar, Editar, GerenciarPermissoes, Excluir
- **Serviços (4):** servicosVer, Criar, Editar, Excluir
- **Pacotes (3):** pacotesVer, Editar, Excluir
- **Automações (5):** automacoesVer, Criar, Editar, Ativar, Excluir
- **Relatórios (4):** dashboardVer, dashboardVerMetricas, relatoriosVer, relatoriosExportar
- **Sistema (11):** notificacoesVer, configuracoesVer/Editar, usuariosVer/Convidar/Editar/Remover, gruposVer/Criar/Editar/Excluir

### Escopos de Visibilidade:
- `notificacoesEscopo` — proprio | todos (funcional no backend)
- `agendaEscopo` — proprio | todos (funcional no backend)
- `calendarioEscopo` — proprio | todos (definido mas redundante com agendaEscopo)

## WhatsApp — Dual Provider

### Baileys (planos Solo/Plus):
- Conexão direta via `@whiskeysockets/baileys`
- Sessão persistida no MySQL (`wa_session`)
- QR Code na página `/admin/whatsapp`
- Reconexão automática com backoff exponencial

### Z-API (plano Pro):
- API REST externa (`server/zapi.ts`)
- Webhook para confirmações de entrega/leitura
- QR Code inline na página WhatsApp
- Polling de status a cada 10s

### Roteamento (`server/whatsapp-router.ts`):
- `routedSendMessage(empresaId, phone, message)` → decide automaticamente
- PRO com credenciais Z-API → usa Z-API
- Demais → usa Baileys

## Automações

### Tipos de Gatilho:
- `evento` — agendamento_criado, agendamento_confirmado, agendamento_cancelado, agendamento_concluido, reserva_paga, profissional_atribuido, cliente_criado
- `dias_antes_agendamento` — X dias antes
- `horas_antes_agendamento` — X horas antes
- `horas_apos_agendamento` — X horas depois
- `dias_depois_agendamento` — X dias depois
- `data_fixa` — dia/mês específico
- `aniversario_mes` — aniversário do cliente
- `manual` — disparo manual

### Scheduler (`server/scheduler.ts`):
- Roda a cada 15 minutos
- Processa automações por tipo de gatilho
- Pré-registra envios como `pendente` ou `agendado`
- Worker de fila envia mensagens pendentes
- Deduplicação por (automacaoId, clienteId, agendamentoId, data)
- Confirmação automática por proximidade (configurável por automação)

### Templates Default:
- 8 automações criadas automaticamente ao registrar empresa
- Campo `isTemplate` para identificar templates padrão
- Variáveis: {{nome_cliente}}, {{servico}}, {{data}}, {{hora}}, {{profissional}}, {{valor}}, {{link_confirmacao}}, {{link_agenda}}, etc.

### Editor Visual:
- Canvas com drag-to-connect (desktop)
- Lista vertical com bottom sheets (mobile)
- Nós: Gatilho → Condição (opcional) → Ação
- Condições: filtro por serviço, profissional, categoria, valor, tag, tipo de cliente
- Zoom/pan, auto-fit, posições persistidas no banco
- Jornada ao Vivo: visualização de clientes por status de envio

## Planos e Billing (Stripe)

| Plano | Preço/mês | Profissionais | Agendamentos | WhatsApp/mês | Features |
|-------|-----------|---------------|--------------|--------------|----------|
| FREE  | R$0       | 1             | 15           | 10           | Básico |
| SOLO  | R$49      | 1             | Ilimitado    | 100          | Portal, Pacotes, Comissões |
| PLUS  | R$149     | 5             | Ilimitado    | 400          | + IA Financeira |
| PRO   | R$299     | 20            | Ilimitado    | 1000         | + IA Total, Z-API |

### Webhooks Stripe:
- `checkout.session.completed` — Ativa plano
- `customer.subscription.updated` — Atualiza período
- `customer.subscription.deleted` — Cancela plano
- `invoice.payment_failed` — Marca falha
- `invoice.paid` — Renovação automática

## Páginas do Frontend

### Admin (autenticado):
- Dashboard (widgets customizáveis com drag-and-drop)
- Calendário (mensal, com bloqueios e cores por profissional)
- Agendamentos (lista com filtros, seleção em lote, ações em massa)
- Clientes (lista, detalhe com histórico/pacotes/créditos/prontuário)
- Equipe e Permissões (profissionais, grupos, permissões granulares)
- Serviços (CRUD com categorias e tipos de profissional)
- Pacotes (modelos + pacotes por cliente com sessões)
- Financeiro (visão geral, contas a pagar/receber, comissões, relatórios)
- Automações (editor visual, fila de envios, templates)
- WhatsApp (conexão, QR code, teste de envio)
- Pipeline (Kanban com geração por IA)
- Bloqueios (solicitação, aprovação, relatório)
- Configurações (empresa, horários, portal)
- Notificações (in-app com ações inline)
- Pré-agendamentos Pendentes (confirmar/cancelar em 1 toque)
- Suporte (chat IA + chamados)
- Manual do Sistema

### Público:
- Portal de Agendamento (`/agendar/:slug`)
- Confirmação de Agendamento (`/confirmar/:token`)
- Onboarding (`/onboarding`)

### Orizontech (admin da plataforma):
- Painel Orizontech (`/admin/orizontech`)

## Funcionalidades Recentes (Abril 2026)

- Sistema de crédito do cliente (pagamento a maior → crédito automático)
- Pessoas da reserva (múltiplas pessoas por agendamento)
- Link de confirmação via WhatsApp com página dedicada
- Confirmação automática por proximidade
- Editor de automações com canvas visual e chips de variáveis
- Jornada ao Vivo no editor de automações
- Pipeline com preview IA e snapshots/restauração
- Sidebar branca (redesign)
- Bottom nav mobile com botão + central
- Swipe para abrir sidebar
- Profissional opcional no agendamento
- Delete/desativar serviços
- Unificação telefone ↔ whatsapp
- Templates de automação pré-configurados (8 por empresa)
- Remoção de mensagens hardcoded
- Integração OpenAI (GPT-4o)
- Integração Z-API para plano Pro
- Sistema de Suporte com chamados
