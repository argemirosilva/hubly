# Agendei - Sistema de Gestão para Salão de Beleza

## Banco de Dados / Schema
- [x] Schema: empresas, profissionais, permissões
- [x] Schema: clientes, agendamentos, pré-agendamentos
- [x] Schema: serviços, comissões, financeiro
- [x] Schema: notificações, automações, bloqueios de agenda
- [x] Schema: prontuários, fotos, documentos
- [x] Executar migrations

## Backend (tRPC Routers)
- [x] Router: autenticação e permissões granulares
- [x] Router: profissionais (CRUD + permissões)
- [x] Router: clientes (CRUD + histórico)
- [x] Router: serviços (CRUD)
- [x] Router: agendamentos (CRUD + pré-agendamento + fluxo de confirmação)
- [x] Router: calendário (visualização mensal/semanal/diária)
- [x] Router: bloqueios de agenda (solicitação + aprovação)
- [x] Router: financeiro (comissões, receita, custos)
- [x] Router: notificações (in-app + push)
- [x] Router: automações de mensagem
- [x] Router: upload de arquivos (prontuários, fotos)
- [x] Router: dashboard (KPIs, métricas)
- [x] Router: portal público (agendamento online)

## Frontend - Design System
- [x] Paleta de cores neutra e elegante (CSS variables)
- [x] Tipografia e espaçamentos (Inter + Playfair Display)
- [x] Componentes base (badges de status, avatares, cards)
- [x] Layout com sidebar e navegação (AdminLayout)

## Frontend - Páginas Admin
- [x] Dashboard com KPIs e gráficos
- [x] Calendário mensal com cores por profissional/status
- [x] Gestão de agendamentos (lista + pré-agendamentos pendentes)
- [x] Gestão de clientes (lista + perfil + histórico)
- [x] Gestão de profissionais (lista + permissões)
- [x] Gestão de serviços
- [x] Controle financeiro (comissões, receita, custos)
- [x] Central de notificações
- [x] Automações de mensagem
- [x] Configurações (cores, empresa, integrações)

## Frontend - Portal do Cliente
- [x] Página pública de agendamento online
- [x] Seleção de serviço, profissional, data/hora
- [x] Confirmação de agendamento
- [x] Página de status do agendamento

## Funcionalidades Avançadas
- [x] Fluxo de pré-agendamento com timer de 24h
- [x] Disparo automático de WhatsApp (template)
- [x] Automações por data comemorativa
- [x] Automação de aniversariantes no 1º do mês
- [x] Upload seguro de prontuários e fotos
- [x] Notificações push em tempo real

## Testes
- [x] Testes de routers principais (12 testes passando)
- [x] Validação de permissões

## Redesign Visual (v1.1)
- [x] Novo design system: paleta champagne/terracota/dourado, tipografia Cormorant Garamond + DM Sans
- [x] Redesenhar AdminLayout com sidebar elegante e sofisticada
- [x] Redesenhar Dashboard com novo visual
- [x] Redesenhar Portal do Cliente com estética de luxo
- [x] Rota padrão / redireciona para /admin

## Redesign Visual v2 — Moderno e Jovem (solicitado pelo usuário)
- [x] Novo design system: paleta moderna vibrante, fontes Plus Jakarta Sans, logo genérico
- [x] AdminLayout moderno com sidebar compacta e jovem
- [x] Dashboard moderno com cards e layout dinâmico
- [x] Calendário moderno
- [x] Portal do Cliente moderno e jovem

## Bugs
- [x] Corrigir campo reservaHorasExpiracao: input retorna string mas router espera number

## Controle de Usuários e Permissões Granulares
- [ ] Schema: tabelas gruposPermissoes, permissoesGrupo, membrosGrupo
- [ ] Backend: routers de grupos, permissões e usuários
- [ ] Página: Gestão de Grupos (criar, editar, excluir grupos)
- [ ] Página: Editor de Permissões por Grupo (item a item)
- [ ] Página: Gestão de Usuários (listar, convidar, atribuir grupos)
- [ ] Integração: verificação de permissões nas páginas existentes
- [ ] Testes unitários do módulo de permissões

## Esteira Visual de Automações
- [x] Interface de timeline/fluxo visual com nós conectados para criar automações
- [x] Nós de gatilho (evento, data fixa, aniversário, dias antes)
- [x] Nós de condição (filtros por tag, profissional, serviço)
- [x] Nós de ação (enviar WhatsApp, notificação interna, aguardar)
- [x] Nó de delay (aguardar X horas/dias)
- [x] Preview da mensagem com variáveis dinâmicas
- [x] Ativar/desativar fluxo completo

## Ícones por Tipo de Serviço
- [x] Criar utilitário de mapeamento de categoria → ícone Lucide
- [x] Aplicar ícones no Calendário mensal (cards de evento)
- [x] Aplicar ícones na página de Agendamentos (lista e cards)
- [x] Aplicar ícones nos modais de detalhe e criação de agendamento

## Bugs / Melhorias Pendentes
- [x] Adicionar item "Usuários" no menu da sidebar (AdminLayout)

## Refatoração Módulo de Usuários (v2)
- [x] Remover sistema de convites — cadastro direto por admin (nome, e-mail, senha)
- [x] Adicionar hash de senha no schema (campo passwordHash)
- [x] Backend: criar/editar/desativar usuários com senha
- [x] Grupos com níveis de acesso detalhados (leitura, escrita, exclusão por módulo)
- [x] Página de Usuários refatorada com cadastro direto
- [x] Esteira visual de automações com fluxo de nós

## Bugs / Melhorias (v2)
- [x] Adicionar exclusão de automações (botão delete com confirmação)

## Bugs (v3)
- [x] Bug: ao reabrir automação, os nós do fluxo não são carregados (configurações perdidas)

## Melhorias Mobile (v4)
- [x] AdminLayout: bottom navigation bar para mobile, overlay da sidebar
- [x] AdminLayout: header mobile com hamburger menu
- [x] Dashboard: cards em coluna única no mobile, agenda do dia em lista compacta
- [x] Calendário: visualização mobile em lista (agenda view) em vez de grid mensal
- [x] Agendamentos: tabela vira cards empilhados no mobile
- [x] Clientes: lista compacta com swipe actions no mobile
- [x] Financeiro: tabelas viram cards no mobile
- [x] Automações: canvas desativado no mobile, lista simplificada
- [x] Portal do Cliente: otimizar steps para tela pequena
- [x] Modais: altura máxima com scroll interno no mobile
- [x] Profissionais: header responsivo, modais com scroll
- [x] Bloqueios: layout mobile-first com ações adaptáveis
- [x] Serviços: header responsivo, modal com scroll
- [x] Configurações: grids responsivos 1→2 colunas

## Integração Zandu — Importação de Dados (v5)

### Funcionalidades identificadas nas telas do Zandu que o Agendei ainda não possui:
- [x] Importação via API Zandu: clientes (GET /persons)
- [x] Importação via API Zandu: agendamentos (GET /schedulers/appointments)
- [x] Importação via API Zandu: serviços (GET /services)
- [x] Importação via API Zandu: usuários/profissionais (GET /users)
- [ ] Importação via API Zandu: vendas/financeiro (GET /invoices)
- [x] Página de Importação Zandu com preview, mapeamento de campos e confirmação
- [ ] Salvar token da API Zandu nas configurações do sistema
- [x] Log de importação com status por registro (sucesso/erro/duplicado)

## Pipeline Kanban (v5) — funcionalidade do Zandu não presente no Agendei
- [x] Schema: tabelas pipelines, pipeline_colunas, pipeline_cartoes
- [x] Backend: routers de pipeline (CRUD pipelines, colunas e cartões)
- [x] Página Pipeline com board Kanban drag-and-drop
- [x] Cartão com título, status (Em andamento/Congelado/Cancelado/Concluído), lembrete e pessoa vinculada
- [x] Configuração de pipelines e colunas
- [ ] Link de integração externa (POST externo cria cartão no pipeline)

## Bugs (v5)
- [x] Perfil: erro ao salvar — reservaPercentual enviado como number mas schema espera string

## Públicos de Automação (v5) — funcionalidade do Zandu não presente no Agendei
- [ ] Schema: tabela publicosAutomacao com regras de filtro por evento
- [ ] Backend: router de públicos (CRUD + contagem de pessoas)
- [ ] Página de Públicos com editor de regras (evento + período relativo/fixo)
- [ ] Integrar públicos como gatilho nas automações existentes

## Melhorias de Automações (v5) — baseado nas telas do Zandu
- [ ] Templates de mensagem com chaves dinâmicas ({nome}, {primeiropronome}, {dataevento}, {horaevento}, {agendaanteio})
- [ ] Caixa de saída: log de mensagens enviadas por automação (nome, telefone, data, status)
- [ ] Provedores de envio: configuração de WhatsApp com horário permitido, retentativas e limite diário

## Bugs (v5b)
- [x] Importação Zandu: erro "empresa não encontrada" ao tentar importar dados via API

## Bugs (v5c)
- [x] Importação Zandu serviços: campo categoria enviado como [object Object] em vez do nome string

## Bugs (v5d)
- [x] Importação Zandu profissionais: TypeError ao chamar toLowerCase em name undefined/null

## Bugs (v5d)
- [x] Importação Zandu profissionais: TypeError ao chamar toLowerCase em name undefined/null

## Importação de Agendamentos Zandu (v5e)
- [x] Backend: importar agendamentos via GET /schedulers/appointments com mapeamento de cliente/serviço/profissional
- [x] Frontend: adicionar aba "Agendamentos" na página de importação Zandu
- [x] Testes: 6 novos testes para mapeamento de agendamentos (39 testes no total)

## Bugs (v5e)
- [x] Importação Zandu agendamentos: erro 400 "Phone is required" ao chamar /schedulers/appointments — corrigido iterando por pessoa via GET /persons + GET /schedulers/appointments?phone={tel}

## IA Financeira — Score de Saúde e Alertas Proativos (v6)

### Schema / Banco de Dados
- [x] Tabela score_financeiro (empresaId, score 0-100, status, explicacao, motivos JSON, dicas JSON, calculadoEm)
- [x] Tabela alertas_financeiros (empresaId, tipo, titulo, mensagem, acao, prioridade, lido, criadoEm)

### Backend
- [x] Router iaFinanceiro: calcularScore (lógica com 10 fatores ponderados)
- [x] Router iaFinanceiro: getScore (buscar score atual da empresa)
- [x] Router iaFinanceiro: getAlertas (listar alertas não lidos)
- [x] Router iaFinanceiro: marcarAlertaLido
- [x] Router iaFinanceiro: chatFinanceiro (chat com contexto de score e alertas)
- [x] Agendamento diário às 22h para recalcular score e gerar alertas

### Frontend
- [x] Card de Score no Dashboard (nota, status colorido, explicação)
- [x] Página dedicada de IA Financeira com score detalhado, histórico e chat
- [x] Integração do chat com contexto de score e alertas
- [ ] Badge de alertas não lidos na sidebar (pendente)

## IA Clientes — Análise Inteligente de Clientes (v6)

### Schema / Banco de Dados
- [x] Tabela analise_clientes (empresaId, clienteId, classificacao, score, resumo, detalhes JSON, calculadoEm)
- [x] Tabela insights_clientes (empresaId, tipo, titulo, mensagem, acao, prioridade, lido, criadoEm)

### Backend
- [x] Router iaClientes: analisar (calcular classificação e score de todos os clientes)
- [x] Router iaClientes: getAnalise (buscar análise geral da empresa)
- [x] Router iaClientes: getClienteAnalise (buscar análise de um cliente específico)
- [x] Router iaClientes: getInsights (listar insights não lidos)
- [x] Router iaClientes: marcarInsightLido
- [x] Router iaClientes: chatClientes (chat com contexto de análise de clientes)
- [x] Critérios mínimos: mínimo 3 clientes + 30 dias de histórico

### Frontend
- [x] Painel de Análise de Clientes (/admin/ia-clientes) com cards resumo, insights e ranking
- [x] Perfil do cliente com seção de análise IA (classificação, resumo, histórico)
- [x] Chat integrado com contexto de análise de clientes
- [ ] Badge de alertas de clientes na sidebar (pendente)
- [x] Grupo "IA Inteligente" na navegação lateral
- [x] Testes: 18 testes de IA passando (57 testes no total)

## Bugs / Melhorias (v6)
- [x] Remover todos os emojis das telas do frontend

## Suporte com IA e Manual do Sistema (v7)
- [x] Backend: router suporte com IA (chat contextual sobre o sistema)
- [x] Frontend: componente SupportChat flutuante (botão em todas as telas)
- [x] Frontend: página Manual do Sistema (/admin/manual) com navegação lateral elegante
- [x] Manual: seção Primeiros Passos (configuração inicial, cadastro de empresa)
- [x] Manual: seção Agendamentos (criar, confirmar, cancelar, pré-agendamento)
- [x] Manual: seção Calendário (visualizações, filtros, bloqueios)
- [x] Manual: seção Clientes (cadastro, histórico, prontuário)
- [x] Manual: seção Profissionais (cadastro, permissões, comissões)
- [x] Manual: seção Financeiro (receita, custos, relatórios)
- [x] Manual: seção Automações (criar fluxo, templates, públicos)
- [x] Manual: seção Pipeline (kanban, cartões, colunas)
- [x] Manual: seção IA Inteligente (score financeiro, análise de clientes)
- [x] Manual: seção Importação Zandu (passo a passo)
- [x] Navegação: item "Manual do Sistema" no menu lateral (grupo Sistema)

## Bugs (v7)
- [x] Erro 404 ao acessar página de detalhe do cliente (/admin/clientes/:id)

## Bugs (v7) — Resolvidos
- [x] Erro 404 ao acessar página de detalhe do cliente (/admin/clientes/:id) — corrigido reestruturando rotas no App.tsx (todas as rotas admin no Switch externo)

## Portal de Agendamento Público com Branding (v8)

### Schema / Banco de Dados
- [x] Adicionar campos na tabela empresas: horaAbertura, horaFechamento, diasFuncionamento (JSON), intervaloMinutos, autoConfirmarPortal, portalAtivo, portalHeaderUrl, portalMensagemBemVindo, portalCorPrimaria, portalCorSecundaria

### Backend
- [x] Router portal: getEmpresaPublica (dados públicos da empresa por slug/id)
- [x] Router portal: getServicosPublicos (lista de serviços ativos)
- [x] Router portal: getProfissionaisPublicos (lista de profissionais ativos)
- [x] Router portal: getHorariosDisponiveis (slots livres por data/profissional/serviço)
- [x] Router portal: criarAgendamentoPublico (sem autenticação, cria cliente se não existir)
- [x] Atualizar router empresa.update para aceitar campos de portal e horário

### Frontend — Portal Público
- [x] Página /agendar com branding personalizado (logo, cores, header image)
- [x] Step 1: identificação do cliente (e-mail/telefone — retornando ou novo)
- [x] Step 2: seleção de serviço
- [x] Step 3: seleção de profissional (ou "qualquer um")
- [x] Step 4: seleção de data e horário disponível
- [x] Step 5: confirmação e resumo
- [x] Tela de sucesso com número do agendamento
- [x] Exibir agendamentos anteriores para clientes retornando

### Frontend — Configurações Admin
- [x] Seção "Portal de Agendamento" nas Configurações
- [x] Upload de logo e imagem de cabeçalho (via URL)
- [x] Configuração de horário de funcionamento (dias e horas)
- [x] Opção de confirmação automática vs. pendente
- [x] Intervalo mínimo entre slots (15, 30, 45, 60 min)
- [x] Link do portal para copiar/compartilhar

## Portal — Validação por CPF (v9)
- [x] Backend: procedure buscarClientePorTelefone (retorna se existe, sem expor dados)
- [x] Backend: procedure validarCpfCliente (valida CPF e retorna dados do cliente)
- [x] Frontend: ao digitar telefone, buscar cliente automaticamente
- [x] Frontend: se cliente encontrado, exibir campo CPF para validação
- [x] Frontend: se CPF correto, pré-preencher nome e e-mail automaticamente
- [x] Frontend: se CPF errado, exibir erro e permitir tentar novamente

## Portal — Correção fluxo CPF (v10)
- [x] Ao encontrar cliente por telefone: pedir CPF (não nome) para validar identidade
- [x] Exibir nome e dados pré-preenchidos somente após CPF validado com sucesso
- [x] Cliente sem CPF cadastrado: pedir nome para confirmar (comportamento atual está correto para esse caso)

## Portal — Fluxo CPF unificado (v11)
- [ ] Backend: procedure cadastrarCpfCliente (cadastra CPF no banco quando cliente não tem)
- [ ] Frontend: sempre pedir CPF ao encontrar cliente por telefone
- [ ] Frontend: se cliente sem CPF → cadastrar CPF digitado e avançar
- [ ] Frontend: se cliente com CPF → validar CPF e avançar

## Portal — Melhoria visual etapas + CPF unificado (v11)
- [ ] Backend: procedure cadastrarCpfCliente (cadastra CPF no banco quando cliente não tem)
- [ ] Frontend: redesenhar indicador de etapas (stepper visual mais interessante)
- [ ] Frontend: fluxo CPF unificado — sempre pedir CPF ao encontrar cliente
- [ ] Frontend: se sem CPF → cadastrar no banco e avançar

## Módulo de Pacotes de Serviços (v12)

### Schema / Banco de Dados
- [x] Tabela pacotes_modelos (empresaId, nome, descricao, preco, validadeDias, ativo)
- [x] Tabela pacotes_clientes (empresaId, clienteId, modeloId, valorPago, formaPagamento, status, dataAbertura, dataVencimento)
- [x] Tabela pacotes_itens (pacoteClienteId, servicoId, quantidadeTotal, quantidadeUsada)
- [x] Tabela pacotes_modelos_itens (modeloId, servicoId, quantidade)
- [x] Executar migration

### Backend
- [x] Router pacotes: CRUD modelos (criar, listar, editar, desativar)
- [x] Router pacotes: abrirPacoteCliente (criar pacote para cliente a partir de modelo)
- [x] Router pacotes: listarPacotesCliente (pacotes ativos/histórico por cliente)
- [x] Router pacotes: listarTodosPacotes (visão geral admin com filtros)
- [x] Router pacotes: consumirSessao (abater 1 sessão manualmente)
- [x] Integração agendamentos: ao confirmar agendamento, verificar e abater pacote ativo automaticamente
- [x] Alerta: notificar admin quando pacote zerar (notifyOwner)

### Frontend
- [x] Página /admin/pacotes com abas: Modelos e Pacotes Ativos
- [x] Modal criar/editar modelo de pacote (itens dinâmicos por serviço + quantidade)
- [x] Modal abrir pacote para cliente (selecionar cliente + modelo + valor pago + forma pgto)
- [x] Card de pacote ativo com barra de progresso por item
- [x] Aba "Pacotes" no perfil da cliente (/admin/clientes/:id) — pendente implementação futura
- [x] Badge "Pacote" no agendamento quando abatido de pacote
- [x] Item "Pacotes" no menu da sidebar

## Relatório Financeiro de Pacotes (v13)
- [x] Backend: procedure relatorioFinanceiro (receita total, sessões consumidas, pacotes próximos do vencimento)
- [x] Frontend: aba "Relatório" na página /admin/pacotes
- [x] Cards de KPI: receita total, pacotes ativos, vencendo em 7 dias, cancelados
- [x] Tabela de pacotes próximos do vencimento com alerta visual
- [x] Gráfico de receita por mês (últimos 6 meses)
- [x] Gráfico de status dos pacotes (pie chart)
- [x] Gráfico de sessões consumidas vs. restantes por serviço

## Perfil da Cliente — Aba Pacotes (v14)
- [ ] Aba "Pacotes" na página /admin/clientes/:id
- [ ] Listar pacotes ativos da cliente com nome, data de abertura e vencimento
- [ ] Barra de progresso por item do pacote (sessões usadas / total)
- [ ] Botão de consumo manual de sessão diretamente no perfil
- [ ] Estado vazio quando não há pacotes ativos

## UX — Ícones + Tooltips (v14)
- [ ] Aba Pacotes no perfil da cliente com progresso por item e botão "Usar" iconético
- [ ] Refatorar botões de ação nas tabelas/listas para ícones com tooltips (Editar, Excluir, Ver detalhes, etc.)
- [ ] Refatorar botões de status de agendamento para ícones com tooltips

## PWA — Progressive Web App (v15)
- [x] manifest.json com nome, ícones, cores e display standalone
- [x] Service worker para cache offline básico
- [x] Meta tags PWA no index.html (theme-color, apple-mobile-web-app, viewport)
- [x] Banner de instalação nativo (beforeinstallprompt) no sistema
- [x] Instruções para iOS (Safari → Compartilhar → Adicionar à Tela Inicial)
- [x] Ícones PWA em múltiplos tamanhos (192x192, 512x512)

## Notificações de Pacotes Prestes a Vencer (v16)

### Backend
- [ ] Tabela notificacoes_pacotes (empresaId, pacoteClienteId, clienteId, tipo, mensagem, enviadoEm, canal)
- [ ] Procedure: varrerPacotesProximosVencimento (busca pacotes com sessões restantes e vencimento em X dias)
- [ ] Procedure: dispararNotificacoes (cria registros e notifica admin via notifyOwner)
- [ ] Procedure: listarNotificacoes (histórico paginado)
- [ ] Configuração: diasAntesVencimento (padrão: 7 dias) na tabela empresas

### Frontend
- [ ] Seção "Notificações de Pacotes" na página /admin/pacotes (aba Notificações)
- [ ] Card de configuração: dias antes do vencimento + botão "Disparar agora"
- [ ] Tabela de histórico de notificações enviadas
- [ ] Badge de alerta no menu quando há pacotes prestes a vencer

## Sistema de Notificações de Pacotes (v13)
- [x] Schema: tabela notificacoes_pacotes (tipo, mensagem, diasParaVencer, sessoesRestantes, canal, lida)
- [x] Backend: procedure verificarPacotesVencendo (gera alertas para pacotes com vencimento em até 7 dias)
- [x] Backend: procedure listarNotificacoes (lista notificações de pacotes com dados do cliente)
- [x] Backend: procedure contarNaoLidas (contador para badge no header)
- [x] Backend: procedure marcarLida / marcarTodasLidas
- [x] Scheduler automático: verifica pacotes vencendo a cada 6h ao iniciar o servidor
- [x] Frontend: página Notificações unificada (sistema + pacotes) com filtro por tipo
- [x] Frontend: badge no sino do AdminLayout inclui notificações de pacotes não lidas
- [x] Frontend: botão "Verificar pacotes" na página de notificações para disparo manual
- [x] Frontend: link para perfil do cliente diretamente da notificação de pacote

## Integração WhatsApp via Baileys (v21)
- [x] Instalar @whiskeysockets/baileys e dependências
- [x] Módulo server/whatsapp.ts: conexão, QR Code, sessão persistente em disco
- [x] Procedures tRPC: whatsapp.getStatus, whatsapp.getQR, whatsapp.disconnect, whatsapp.sendTest
- [x] Página /admin/whatsapp com QR Code, status de conexão e botão de desconectar
- [x] Link "WhatsApp" no menu lateral
- [x] Envio automático ao criar agendamento (confirmação para o cliente)
- [ ] Envio automático ao confirmar/cancelar agendamento (atualização de status)
- [ ] Template de mensagem configurável nas Configurações

## WhatsApp — Melhorias v22
- [ ] Envio automático ao confirmar agendamento (status → confirmado)
- [ ] Envio automático ao cancelar agendamento (status → cancelado)
- [ ] Template configurável nas Configurações (confirmar, cancelar, lembrete)
- [ ] Variáveis dinâmicas: {nome}, {data}, {horario}, {servico}, {profissional}, {valor}
- [ ] Caixa de entrada de mensagens recebidas na página WhatsApp
- [ ] Responder mensagens diretamente do painel

## Stripe — Restauração e Atualização de Price IDs (v23)
- [x] Restaurar server/stripe-products.ts com Price IDs reais do Stripe
- [x] Restaurar server/stripe.ts (cliente Stripe)
- [x] Restaurar server/stripe-webhook.ts (webhook com priceIdToPlanType)
- [x] Restaurar server/plans.ts (PLAN_LIMITS, PLAN_PRICES)
- [x] Restaurar server/db-plans.ts (helpers de subscription e usage)
- [x] Adicionar stripeSecretKey e stripeWebhookSecret ao server/_core/env.ts
- [x] Instalar pacote stripe (v21)
- [x] Registrar webhook do Stripe no server/_core/index.ts
- [x] Adicionar routers planos e stripe ao server/routers.ts
- [x] Adicionar tabelas subscriptions e usageTracker ao drizzle/schema.ts
- [x] Migração SQL aplicada (tabelas já existiam no banco)
- [x] Testes unitários para stripe-products.ts (4 testes passando)

## Página de Planos /admin/planos (v24)
- [ ] Criar client/src/pages/Planos.tsx com toggle mensal/anual e cards Solo/Plus/Pro
- [ ] Integrar com trpc.planos.getStatus para mostrar plano atual
- [ ] Integrar com trpc.stripe.createCheckoutSession para botão de upgrade
- [ ] Adicionar rota /admin/planos no App.tsx
- [ ] Adicionar item "Planos" no menu lateral (grupo Sistema)
- [ ] Páginas de sucesso e cancelamento do checkout (/admin/planos/sucesso, /admin/planos/cancelado)
- [x] Criar client/src/pages/Planos.tsx com toggle mensal/anual e cards Solo/Plus/Pro
- [x] Integrar com trpc.planos.getStatus para mostrar plano atual
- [x] Integrar com trpc.stripe.createCheckoutSession para botão de upgrade
- [x] Adicionar rota /admin/planos no App.tsx
- [x] Adicionar item "Planos & Assinatura" no menu lateral (grupo Sistema)

## Dashboard — Indicador de Plano e Uso (v25)
- [ ] Adicionar card de plano atual no painel lateral do dashboard
- [ ] Mostrar barras de progresso de agendamentos e WhatsApp do mês
- [ ] Botão de upgrade para /admin/planos quando limite próximo
- [x] Adicionar card de plano atual no painel lateral do dashboard
- [x] Mostrar barras de progresso de agendamentos e WhatsApp do mês
- [x] Botão de upgrade para /admin/planos quando limite próximo

## Notificações por E-mail de Limite de Uso (v26)
- [ ] Criar procedure checkAndNotifyUsageLimits no servidor
- [ ] Enviar e-mail quando agendamentos atingirem 80% do limite
- [ ] Enviar e-mail quando WhatsApp atingir 80% do limite
- [ ] Evitar envio duplicado (cooldown de 24h por tipo de alerta)
- [ ] Criar tabela usageAlerts para rastrear notificações enviadas

## Notificações por E-mail de Limite de Uso (v26)
- [ ] Criar procedure checkAndNotifyUsageLimits no servidor
- [ ] Enviar e-mail quando agendamentos atingirem 80% do limite
- [ ] Enviar e-mail quando WhatsApp atingir 80% do limite
- [ ] Evitar envio duplicado (cooldown de 24h por tipo de alerta)
- [ ] Criar tabela usageAlerts para rastrear notificações enviadas

- [x] Criar procedure checkAndNotifyUsageLimits no servidor
- [x] Enviar notificação quando agendamentos atingirem 80% do limite
- [x] Enviar notificação quando WhatsApp atingir 80% do limite
- [x] Evitar envio duplicado (cooldown de 24h por tipo de alerta)
- [x] Criar tabela usageAlerts para rastrear notificações enviadas
- [ ] Corrigir duplo menu lateral na página Automações
- [ ] Corrigir menu errado (genérico) na página Pacotes
- [x] Corrigir duplo menu lateral na página Automações
- [x] Corrigir menu errado (genérico) na página Pacotes

- [x] Criar página /admin/assinatura com status, próxima cobrança, método de pagamento e histórico de faturas
- [x] Adicionar link "Minha Assinatura" na sidebar do AdminLayout
- [x] Registrar rota /admin/assinatura no App.tsx

- [x] Criar página /admin/planos/sucesso com confirmação visual da assinatura
- [x] Criar procedure stripe.getCheckoutSession para buscar dados da sessão
- [x] Registrar rota /admin/planos/sucesso no App.tsx

## Bloqueio de Agendamentos por Limite de Plano
- [ ] Adicionar procedure pública portal.getStatusLimite para verificar se empresa atingiu limite
- [ ] Adicionar verificação de limite na mutation portal.criarAgendamento (backend)
- [ ] Adicionar verificação de limite na mutation agendamentos.create (admin backend)
- [ ] Implementar bloqueio visual no PortalCliente.tsx com mensagem amigável

- [x] Adicionar procedure pública portal.getStatusLimite para verificar se empresa atingiu limite
- [x] Adicionar verificação de limite na mutation portal.criarAgendamento (backend)
- [x] Adicionar verificação de limite na mutation agendamentos.create (admin backend)
- [x] Implementar bloqueio visual no PortalCliente.tsx com mensagem amigável

## Comissão Automática por Serviço (v15)
- [ ] Adicionar campo percentualComissao na tabela servicos (migração SQL)
- [ ] Atualizar cadastro de serviços no frontend para incluir percentual de comissão
- [ ] Implementar preenchimento automático de comissão ao concluir agendamento
- [ ] Usar percentual do serviço como prioridade, fallback para percentual do profissional

## Vínculo Usuário-Profissional e Controle de Acesso (v8)
- [ ] Adicionar campo profissionalId na tabela system_users e migrar banco
- [ ] Atualizar cadastro de usuários para vincular a um profissional
- [ ] Filtrar agenda por profissional vinculado no frontend (padrão)
- [ ] Filtrar comissões e histórico financeiro por profissional vinculado
- [ ] Admins veem todas as comissões; usuários comuns veem apenas as próprias
- [ ] Adicionar barra de rolagem no modal de seleção de permissões

## Vínculo Usuário-Profissional e Controle de Acesso (v8) — Concluído
- [x] Adicionar campo profissionalId na tabela system_users e migrar banco
- [x] Atualizar cadastro de usuários para vincular a um profissional (dropdown no modal)
- [x] Filtrar agenda por profissional vinculado no frontend (Agendamentos.tsx e Calendario.tsx)
- [x] Filtrar comissões e histórico financeiro por profissional vinculado (Financeiro.tsx)
- [x] Admins veem todas as comissões; usuários vinculados a profissional veem apenas as próprias
- [x] Seletor de profissional oculto para usuários vinculados no Financeiro
- [x] Exibir badge "Profissional" na tabela de usuários para usuários vinculados
- [x] Modal de permissões já possui scrollbar (overflow-y-auto)

## Correções de UI (v9)
- [x] Corrigir barra de rolagem no modal de permissões — DialogContent com overflow explícito via style inline
- [ ] Implementar vínculo profissional-serviço (tabela criada, UI e backend pendentes)

## Perfil do Usuário e Vínculo Profissional-Serviço (v9)
- [ ] Schema: adicionar campo avatarUrl na tabela system_users
- [ ] Backend: procedure perfil.getMe (dados do usuário logado)
- [ ] Backend: procedure perfil.update (nome, email, avatarUrl)
- [ ] Backend: procedure perfil.changePassword (verificar senha atual, salvar nova)
- [ ] Backend: procedure perfil.uploadAvatar (upload S3)
- [ ] Frontend: página /perfil com formulário de nome/email, upload de foto e alteração de senha
- [ ] Frontend: exibir foto do perfil na sidebar, header e tela de agendamento público
- [ ] Backend: procedures profissionalServicos (listar, vincular, desvincular)
- [ ] Frontend: interface de vínculo profissional-serviço na tela de Profissionais
- [ ] Frontend: filtrar serviços por profissional no modal de novo agendamento

## Perfil do Usuário e Vínculo Profissional-Serviço (v10)
- [x] Página de perfil do usuário (/admin/perfil) com foto, nome, e-mail e senha
- [x] Upload de foto de perfil via S3 (base64 → storagePut)
- [x] Foto de perfil exibida na sidebar do AdminLayout
- [x] Link para perfil no footer da sidebar (ícone UserCircle)
- [x] Campo avatarUrl adicionado na tabela system_users
- [x] Procedures tRPC: perfil.getMe, perfil.update, perfil.uploadAvatar, perfil.changePassword
- [x] Tabela profissionalServicos criada no banco
- [x] Procedures tRPC: profissionalServicos.getByProfissional, set, vincular, desvincular
- [x] Interface de vínculo profissional-serviço na tela de Profissionais (aba Serviços)
- [x] Modal de gerenciamento unificado com abas Serviços e Permissões

## Tela Unificada de Equipe (v11)
- [ ] Backend: procedure equipe.list (todos os membros com grupoNome e grupoCor)
- [ ] Backend: procedure equipe.criar (cria profissional com ou sem acesso ao sistema)
- [ ] Backend: procedure equipe.atualizar (atualiza campos de profissional e acesso)
- [ ] Backend: procedure equipe.excluir (remove ou desativa)
- [ ] Frontend: página /admin/equipe com listagem unificada e filtros (Todos/Profissionais/Com acesso)
- [ ] Frontend: modal unificado com campos condicionais (isProfissional → especialidade/cor/serviços; temAcesso → email/senha/grupo)
- [ ] Frontend: modal de gerenciamento (serviços, permissões de grupo, reset de senha)
- [ ] Atualizar AdminLayout: substituir "Profissionais" por "Equipe" na navegação
- [ ] Atualizar App.tsx: adicionar rota /admin/equipe e manter compatibilidade com rotas antigas
- [ ] Remover ou redirecionar /admin/profissionais e /admin/usuarios para /admin/equipe

## Tela Unificada de Equipe (v11) — Concluído
- [x] Backend: função getEquipeByEmpresa no db.ts (join com gruposPermissoes)
- [x] Backend: procedure equipe.list (todos os membros com grupoNome e grupoCor)
- [x] Backend: procedure equipe.criar (cria profissional com ou sem acesso ao sistema)
- [x] Backend: procedure equipe.atualizar (atualiza campos de profissional e acesso)
- [x] Backend: procedure equipe.excluir (desativa membro)
- [x] Backend: procedure equipe.resetarSenha (redefine senha de usuário com acesso)
- [x] Frontend: página /admin/equipe com listagem unificada e filtros (Todos/Profissionais/Com acesso)
- [x] Frontend: modal unificado com campos condicionais (isProfissional → especialidade/cor; temAcesso → email/senha/grupo)
- [x] Frontend: modal de reset de senha para usuários com acesso
- [x] Frontend: cards com badges de papel (Profissional/Acesso) e ações (editar, desativar, reset senha)
- [x] Atualizar AdminLayout: substituir "Profissionais" por "Equipe" na navegação
- [x] Atualizar App.tsx: adicionar rota /admin/equipe (mantendo /admin/profissionais e /admin/usuarios)

## Tela Unificada de Equipe + Tipos de Profissional (v7)
- [x] Tela unificada de Equipe (fusão de Profissionais + Usuários)
- [x] Aba de Serviços no modal de edição de membro da equipe
- [x] Tipos de Profissional como entidade própria (Manicure, Cabeleireiro, etc.)
- [x] Seleção múltipla de tipos por membro da equipe (aba Tipos no modal)
- [x] Agrupamento de serviços por tipo de profissional na tela de Serviços
- [x] Correção do carregamento de dados no modal de edição
- [x] Botão "Tipos de Profissional" na tela de Serviços para gerenciar tipos

## Dashboard + Onboarding de Equipe (v12)
- [x] Cards de Contas a Pagar no Dashboard para admins: Contas Vencidas, A Pagar Hoje, A Pagar na Semana
- [x] Cards clicáveis que redirecionam para a tela de Contas a Pagar
- [x] Wizard de Onboarding de Equipe: componente OnboardingEquipe.tsx com 5 passos
- [x] Passo 1: Boas-vindas com visão geral dos passos
- [x] Passo 2: Dados básicos (nome, telefone, e-mail, especialidade)
- [x] Passo 3: Configurações de profissional (cor do calendário, aparece na agenda, tipos)
- [x] Passo 4: Acesso ao sistema (grupo de permissões, senha)
- [x] Passo 5: Conclusão com opção de adicionar outro membro
- [x] Indicador de progresso visual com ícones por passo
- [x] Abertura automática quando equipe está vazia (com delay de 800ms)
- [x] Persistência de conclusão em localStorage (não reabre após concluído)
- [x] Botão "Guia de cadastro" no header da tela de Equipe

## QR Code + Push Notifications PWA (v13)
- [x] Correção QR Code WhatsApp: detectar loop de reconexão e limpar sessão corrompida após 5 tentativas
- [x] Método resetSession() no WhatsAppManager para forçar novo QR Code
- [x] Procedure whatsapp.resetSession no router tRPC
- [x] Botão "Resetar sessão" na tela WhatsApp (QR Code não aparece?)
- [x] Aviso de expiração do QR Code (~60 segundos) na tela WhatsApp
- [x] Tabela push_subscriptions criada no banco de dados
- [x] Serviço pushNotifications.ts com VAPID, subscribe, unsubscribe, sendPushToUser, sendPushToEmpresa
- [x] Service worker atualizado com handler de push notifications e suporte a som
- [x] Service worker registrado em todos os ambientes (dev + prod)
- [x] Hook usePushNotifications para gerenciar subscriptions no frontend
- [x] Seção Push Notifications (PWA) adicionada na página Notificações
- [x] Procedures tRPC: push.getVapidPublicKey, push.subscribe, push.unsubscribe, push.sendTest
- [x] Instruções de instalação PWA (Android/iPhone/Desktop) na página de Notificações

## Visibilidade de Dados para Admins vs Profissionais (v14)
- [ ] Backend: agendamentos — admin vê todos, profissional vê apenas os seus
- [ ] Backend: financeiro (comissões, contas a receber) — admin vê todos, profissional vê apenas os seus
- [ ] Backend: dashboard KPIs — admin vê dados consolidados de todos
- [ ] Frontend: tela de Agendamentos — filtro de profissional visível apenas para admins
- [ ] Frontend: tela de Financeiro — filtro de profissional visível apenas para admins
- [ ] Frontend: tela de Calendário — admin vê todos por padrão, profissional vê só o seu

## Visibilidade de Dados para Admins (2026-04-03)

- [x] Adicionar função resolveAdminContext no backend para determinar se o usuário é admin
- [x] Corrigir agendamentos.list para admin ver todos os profissionais
- [x] Corrigir financeiro.comissoes para admin ver todos os profissionais
- [x] Corrigir financeiro.dashboard para admin ver métricas consolidadas
- [x] Adicionar campo isAdmin ao retorno de auth.me
- [x] Atualizar Dashboard para usar isAdmin do auth.me
- [x] Adicionar filtro de profissional na página Agendamentos (visível apenas para admins)
- [x] Atualizar página Financeiro para usar isAdmin e mostrar filtro de profissional
- [x] Atualizar Calendário para remover filtro manual no frontend (backend já filtra)

## Permissões, Comissão Fixa, Custo, Confirmação por Link (Apr 03)

- [x] Bug crítico: helper requirePermissao aplicado em todas as mutations sensíveis (grupos, profissionais, serviços, systemUsers)
- [x] Schema: campo percentualComissao na tabela profissionais
- [x] Schema: campo custoFixo na tabela servicos
- [x] Migração SQL aplicada para os novos campos
- [x] Frontend Equipe: campo % Comissão padrão no formulário de profissional
- [x] Frontend Serviços: campo Custo Fixo no formulário de serviço
- [x] AgendamentoDetalheModal: pré-preencher percentual (serviço > profissional) e custoReposicao com custoFixo
- [x] AgendamentoDetalheModal: campo percentual somente leitura quando vem de configuração automática
- [x] Backend: filtrar campos sensíveis de serviços para profissionais não-admin
- [x] Backend: proteção contra profissional ver comissões de outros via profissionalId explícito
- [x] Schema: tabela tokens_confirmacao criada e migração aplicada
- [x] Backend: módulo confirmacao.ts com gerarTokenConfirmacao e rota Express GET /api/confirmar/:token
- [x] Backend: notificação push para admin e profissional após confirmação do cliente
- [x] Frontend: página pública ConfirmarAgendamento.tsx com estados (confirmado, já confirmado, expirado, inválido)
- [x] App.tsx: rota pública /confirmar/:token registrada
- [x] AgendamentoDetalheModal: botão "Link Confirm." para gerar e copiar link automaticamente
- [x] AgendamentoDetalheModal: exibição do link gerado com botão de copiar manual
- [x] Automacoes.tsx: variável {{link_confirmacao}} adicionada na lista de variáveis disponíveis

## Variável {{valor_reserva}} nas Automações

- [x] Frontend: adicionar {{valor_reserva}} na lista VARIAVEIS da página Automacoes.tsx
- [x] Backend: calcular valor_reserva (percentual reserva × valor serviço) ao processar variáveis de automação

## Tooltips, Imagem/PDF nas Automações, Bug Categoria/Tipo

- [ ] Corrigir bug: lista de Categoria/Tipo no modal de serviço não está sendo populada
- [ ] Adicionar tooltips explicativos nas variáveis de automação ({{nome_cliente}}, {{valor_reserva}}, etc.)
- [ ] Implementar seleção e envio de imagem/PDF nas mensagens de automação (upload para S3 + envio via WhatsApp)

## Tooltips, Imagem/PDF e Categoria/Tipo (Apr 03 2026)

- [x] Corrigir bug do campo Categoria/Tipo no modal de serviço (substituir datalist por Select confiável)
- [x] Adicionar tooltips explicativos com descrição e exemplo em cada variável de automação
- [x] Backend: procedure automacoes.uploadMidia para upload de imagem/PDF para S3
- [x] Backend: função sendMediaMessage no WhatsApp para envio de imagem/PDF via Baileys
- [x] Frontend: seção de anexo de mídia no editor de nó de automação (imagem ou PDF, máx 16MB, preview)

## Reserva, Lembrete Automático e Preview (Apr 03 2026)

- [x] Campo reservaPercentual nas Configurações → Agendamentos (já existia)
- [x] Job scheduler: lembrete automático às 9h do dia anterior com {{link_confirmacao}}
- [x] Preview em tempo real do template de mensagem nas Automações

## Rebranding para Hubly (Apr 03 2026)

- [x] Upload dos logos Hubly (logomarca e logo completo) para CDN
- [x] Atualizar paleta de cores para identidade Hubly (azul escuro #1a3a6b, azul médio #29abe2, verde #4caf50)
- [x] Atualizar nome Agendei → Hubly em todos os arquivos frontend e backend
- [x] Substituir logo na sidebar, topbar mobile, tela de login, Setup e ConfirmarAgendamento
- [x] Atualizar manifest.json (PWA) com nome, ícone e cores Hubly
- [x] Atualizar service worker com nome Hubly
- [x] Atualizar PWAInstallBanner com nome e cores Hubly
- [x] Atualizar SupportChat com nome Hubly

## Favicon Hubly (Apr 03 2026)

- [x] Gerar favicon.ico multi-tamanho (16x16, 32x32, 48x48, 64x64, 128x128, 256x256) a partir da logomarca
- [x] Fazer upload do favicon para CDN
- [x] Aplicar favicon no index.html, manifest.json e service worker

## Atualização Nome/Subtítulo Hubly (Apr 03 2026)

- [x] Substituir subtítulo "Centralize Your Service Management" por "Hub de Serviços Inteligentes"
- [x] Atualizar title, description e meta tags no index.html
- [x] Atualizar manifest.json
- [x] Atualizar textos na sidebar, login, Setup e ConfirmarAgendamento

## Open Graph / Social Preview (Apr 03 2026)

- [x] Gerar imagem OG 1200x630 com logo e identidade visual Hubly
- [x] Fazer upload da imagem OG para CDN
- [x] Adicionar meta tags og:title, og:description, og:image, og:type, og:url no index.html
- [x] Adicionar Twitter Card meta tags

## Renomear Planos para Hubly (Apr 03 2026)

- [x] Atualizar nomes dos planos no stripe-products.ts e plans.ts
- [x] Atualizar nomes na página /admin/planos (frontend)
- [x] Criar produtos e preços no Stripe com nomes Hubly Solo/Plus/Pro via API

## Correção Logo Sidebar (Apr 03 2026)

- [x] Remover fundo branco do logo e gerar versão com fundo transparente
- [x] Fazer upload do logo transparente para CDN
- [x] Corrigir o componente da sidebar para exibir o logo corretamente

## Hover Menu Lateral (Apr 03 2026)

- [x] Implementar efeitos de hover com transições suaves nos itens da sidebar

## Identidade Hubly na Página Pública /agendar (Apr 03 2026)

- [x] Aplicar logo, cores e tipografia Hubly no header da página pública
- [x] Atualizar paleta de cores dos botões, seleções e destaques
- [x] Adicionar rodapé "Powered by Hubly" com logo

## Portal Público - URL Slug, Capa e Compartilhamento (Apr 03 2026)

- [x] Adicionar campo slug na tabela empresa (ex: meu-salao)
- [x] Criar rota /agendar/:slug no frontend e backend
- [x] Manter compatibilidade com /agendar?e=ID (legado)
- [x] Gerar slug automático a partir do nome da empresa no Setup
- [x] Campo de edição de slug em Configurações → Portal
- [x] Imagem de capa com overlay gradiente Hubly no portal
- [x] Botão de compartilhamento (copiar link) no header do portal

## Validação de Slug Único (Apr 03 2026)

- [x] Procedure checkSlugDisponivel no backend (verifica se slug já está em uso por outra empresa)
- [x] Validação em tempo real no campo de slug (debounce + feedback visual)
- [x] Bloquear salvamento se slug já estiver em uso

## Histórico de Envios de Automações (Apr 03 2026)

- [x] Schema: tabela historico_envios_automacao (empresaId, automacaoId, clienteId, telefone, mensagem, status, criadoEm)
- [x] Migração SQL aplicada
- [x] Backend: registrar envio no histórico ao disparar mensagem de automação
- [x] Backend: procedure getHistoricoEnvios com filtros e paginação
- [x] Frontend: aba "Histórico" na página de Automações com tabela de envios

## Página de Sucesso Pós-Pagamento (Apr 03 2026)

- [x] Rota /admin/planos/sucesso no App.tsx
- [x] Página com identidade Hubly: confirmação do plano, próximos passos e CTA
- [x] Integrar success_url do Stripe para redirecionar para /admin/planos/sucesso
- [x] Buscar detalhes da sessão Stripe para exibir o plano contratado

## Correção de Permissões (Apr 03 2026)

- [ ] Administradora deve ver todos os agendamentos (não apenas os próprios)
- [ ] Profissional vê nome e valor dos serviços de outros profissionais (sem custo, sem edição)
- [ ] Profissional vê custo e pode editar apenas seus próprios serviços

## Correções de Permissão (03/04/2026)
- [x] Corrigir resolveAdminContext para usar getPermissoesGrupoByProfissional (tabela permissoes_grupo) em vez de getPermissoesByProfissional (tabela permissoes antiga sem agendamentosVerTodos)
- [x] Corrigir requirePermissao para usar getPermissoesGrupoByProfissional
- [x] Corrigir auth.me para usar getPermissoesGrupoByProfissional ao calcular isAdmin
- [x] Visibilidade granular de serviços: profissional vê dados completos (custo, comissão) apenas dos seus próprios serviços; outros serviços mostram apenas nome/preço/duração
- [x] Frontend Servicos.tsx: ocultar botão Novo Serviço e Tipos de Profissional para não-admins
- [x] Frontend Servicos.tsx: ocultar botão de editar para serviços que o profissional não possui vínculo
- [x] Frontend Servicos.tsx: ocultar percentual de comissão para serviços de outros profissionais

## Correções Profundas de Permissão (03/04/2026 v2)
- [ ] Menu lateral (AdminLayout): ocultar itens sem permissão para profissionais
- [ ] Dashboard: ocultar blocos de contas vencidas/a pagar para quem não tem financeiroVer
- [ ] Dashboard: mostrar apenas agendamentos do próprio profissional no painel do dia
- [ ] Financeiro: profissional vê apenas suas próprias comissões (não de outros)
- [ ] Financeiro: ocultar seções de receita/custos/despesas sem permissão
- [ ] Agenda/Calendário: filtrar por profissional logado por padrão
- [ ] Backend: procedure auth.me deve retornar objeto de permissões completo para o frontend
- [ ] Verificar todas as páginas com dados sensíveis e aplicar filtros de permissão

## Correções de Permissão (03/04/2026)
- [x] Criar função getPermissoesGrupoByProfissional que busca da tabela permissoes_grupo (correta)
- [x] Corrigir resolveAdminContext para usar tabela permissoes_grupo
- [x] Corrigir auth.me para retornar objeto completo de permissões do grupo
- [x] Criar hook usePermissoes centralizado no frontend
- [x] AdminLayout: filtrar itens do menu lateral por permissão (incluindo subitens)
- [x] Dashboard: ocultar blocos financeiros (receita, contas, comissões) sem permissão financeiroVer
- [x] Financeiro: ocultar botão Pagar para não-admins, filtrar comissões por profissional
- [x] ContasPagar: adicionar guarda de permissão financeiroVer no backend e frontend
- [x] ContasReceber: adicionar guarda de permissão financeiroVer no backend e frontend
- [x] IAFinanceiro: adicionar guarda de permissão financeiroVer
- [x] IAClientes: adicionar guarda de permissão clientesVer
- [x] Automacoes: adicionar guarda de permissão automacoesVer
- [x] WhatsApp: adicionar guarda de permissão automacoesVer
- [x] Clientes: adicionar guarda de permissão clientesVer
- [x] Servicos: adicionar guarda de permissão servicosVer
- [x] Configuracoes: adicionar guarda de permissão configuracoesVer
- [x] Profissionais: adicionar guarda de permissão profissionaisVer
- [x] Equipe: adicionar guarda de permissão profissionaisVer

## Melhorias Solicitadas (03/04/2026 - Lote 2)
- [x] Corrigir filtro de agenda no Dashboard: profissional vê apenas seus agendamentos no card "Minha Agenda"
- [x] Implementar prioridade de permissão individual sobre grupo (override)
- [x] Restringir agendamento: não-admin só pode agendar para si próprio
- [x] Busca inteligente de clientes com autocomplete (debounce, case-insensitive, sem acento)
- [x] Padronizar ícones por categoria de serviço usando Lucide
- [x] Proteger /assinatura e /planos apenas para admins (backend + frontend)

## Correções Dashboard (03/04/2026 - Lote 3)
- [x] Ocultar atalhos do Dashboard que o usuário não tem permissão de acessar
- [x] Menu de IA no sidebar deve ser visível apenas para administradores
- [x] Atalhos do Dashboard filtrados por permissão (clientes, automações, financeiro, equipe, plano)

## Visualização Detalhada de Receitas (03/04/2026)
- [x] Criar modal de detalhamento de receitas ao clicar no card "Receita do mês" no Dashboard
- [x] Seletor de período (mês/ano com navegação)
- [x] Exibir comissões do profissional logado
- [x] Listar serviços realizados com valores e status (paga/pendente)

## Melhorias Mobile e UX (04/04/2026)
- [x] Contas a Pagar: botão "Nova conta" reposicionado no header (sempre visível no mobile)
- [ ] Contas a Receber: mesma correção de responsividade mobile
- [ ] Financeiro: revisar responsividade geral no mobile
- [ ] Equipe: ocultar membros desativados da interface
- [x] Módulo Meios de Pagamento: cadastro (nome, tipo, parcelamento, taxa fixa, taxas por parcela)
- [x] Página "Comissões a Pagar" no menu financeiro com filtro por profissional e período
- [x] Meios de Pagamento integrados nos formulários de Contas a Pagar e Contas a Receber

## Melhorias Contas a Pagar/Receber (04/04/2026 - Lote 2)
- [x] Adicionar opções de recorrência: Quinzenal, Bimestral, Trimestral, Semestral (além de Semanal, Mensal, Anual)
- [x] Atualizar enum de recorrenciaTipo no backend e banco de dados para aceitar novos valores

## Gerenciamento de Clientes (04/04/2026)
- [x] Botão Editar cliente: modal com formulário preenchido (nome, telefone, whatsapp, email, CPF, nasc., endereço, obs)
- [x] Botão Excluir cliente: soft delete com confirmação (marca como inativo, não apaga)
- [x] Botão Reativar cliente: restaura clientes inativos
- [x] Toggle "Ver inativos" para gerenciar clientes removidos
- [x] Busca por CPF além de nome, telefone e email
- [x] Endpoints delete, restore e listAll adicionados no backend

## Página de Detalhes do Cliente (04/04/2026)
- [x] Botão Editar na página de detalhes: ativa modo de edição inline dos campos
- [x] Botão Salvar: confirma as alterações feitas no modo de edição
- [x] Botão Excluir com confirmação: remove o cliente com diálogo de confirmação e redireciona para a lista
- [x] Botão Cancelar: descarta alterações e volta ao modo de visualização
- [x] Exibe CPF, WhatsApp e endereço na visualização (campos que antes não apareciam)

## Bug: Erro ao clicar em Editar na ficha do cliente (04/04/2026)
- [x] Corrigido erro removeChild: removido TooltipTrigger asChild + Link do wouter (incompatibilidade de ref no React 19), substituido por Button com navigate()

## Múltiplos Serviços por Agendamento (04/04/2026)
- [x] Banco: criar tabela agendamento_itens (agendamentoId, servicoId, valorUnitario)
- [x] Backend: funções createAgendamentoItens, getItensByAgendamento, deleteItensByAgendamento no db.ts
- [x] Backend: atualizar endpoints create/update/list/getById de agendamentos
- [x] Backend: getAgendamentosByEmpresa retorna servicoNome (nome concatenado para múltiplos) e itens
- [x] Admin: NovaAgendaModal com lista dinâmica de serviços (+ Adicionar / remover), cálculo automático de valor e duração
- [x] Admin: AgendamentoDetalheModal exibindo lista de serviços com endpoint getItens
- [x] Portal: PortalCliente com seleção múltipla de serviços (checkboxes + resumo)
- [x] Portal: endpoint criarAgendamento aceita array de serviços e cria itens
- [x] Exibição: Agendamentos.tsx, Dashboard.tsx e ClienteDetalhe.tsx usam servicoNome do backend

## Edição de Valores dos Serviços no Agendamento (04/04/2026)
- [x] Backend: endpoint updateValores que atualiza valorUnitario de cada item e recalcula valorTotal
- [x] Admin: AgendamentoDetalheModal com campos de valor editáveis inline por serviço (nome fixo, só valor editável)
- [x] Recalcular valorTotal do agendamento ao salvar os valores editados

## Pagamentos Parciais e Desconto no Agendamento (04/04/2026)
- [x] Banco: tabela agendamento_pagamentos (agendamentoId, valor, meioPagamento, observacao, criadoEm)
- [x] Banco: campo desconto (decimal) na tabela agendamentos
- [x] Backend: endpoints addPagamento, removePagamento, getPagamentos, updateDesconto
- [x] Frontend: seção "Pagamento" no modal com lista de pagamentos + botão "+ Adicionar pagamento"
- [x] Frontend: campo de desconto editável com botões editar/salvar/cancelar
- [x] Frontend: rodapé com Itens / Desconto / Pago / Em aberto calculado automaticamente
- [x] Badge "Em aberto" (laranja) ou "Quitado" (verde) no header da seção
- [x] Meios de pagamento cadastrados aparecem no select além das opções padrão

## Bug: Rebarba branca no logo da sidebar (04/04/2026)
- [x] Removida rebarba branca do logo: processamento Python removeu 94 pixels quase-brancos de anti-aliasing, novo arquivo CDN sem rebarba aplicado em AdminLayout e PortalCliente

## Bug: Desalinhamento mobile no NovaAgendaModal (04/04/2026)
- [x] Linha de serviços: cada serviço agora em card próprio (select em linha 1, valor + lixeira em linha 2)
- [x] Botão "+ Adicionar serviço" mantido no header da seção (sem deslocamento)
- [x] Campos Início/Fim: movidos para linha própria com sm:col-span-2, sempre 2 colunas dentro do grid
- [x] Formulário de adicionar pagamento: campos empilhados (space-y-2) ao invés de grid-cols-2 apertado

## Melhorias Modal Agendamento - Lote 3 (04/04/2026)
- [x] Botão "Adicionar pagamento" fixo no rodapé do modal de detalhes (sem precisar rolar)
- [x] Resumo de pagamento ao concluir agendamento (serviços, total, pago, saldo em aberto)
- [x] Filtro "Com saldo em aberto" na lista de agendamentos

## Bug: Botão "Cancelar" cortado no NovaAgendaModal mobile (04/04/2026)
- [x] Corrigir modal de novo agendamento no mobile: botão "Cancelar" fica cortado abaixo da tela, modal não rola até o fim

## Bug: Botão X duplicado nos modais (04/04/2026)
- [x] Remover X duplicado do AgendamentoDetalheModal: adicionado showCloseButton={false} no DialogContent para desativar o X nativo do Radix (o header customizado já tem seu próprio botão X)
- [x] Modal de Permissões (Equipe): adicionado showCloseButton={false} no DialogContent com p-0 e header customizado
- [x] NovaAgendaModal e ReceitaDetalheModal: adicionado pr-12 no DialogHeader para evitar sobrepôr o título com o X nativo

## WhatsApp: Resiliência e UX (04/04/2026)
- [x] Backend: remover limpeza automática de sessão por tentativas — só limpar em loggedOut explícito
- [x] Backend: backoff exponencial entre tentativas de reconexão (5s → 15s → 30s → 60s → 120s, sem limite)
- [x] Backend: aguardar banco disponível antes de reconectar no init pós-deploy (retry por 30s)
- [x] Frontend: exibir "Verificando conexão..." ao abrir a tela de WhatsApp
- [x] Frontend: exibir feedback "Conectando..." imediato ao clicar em Conectar, bloqueando cliques duplos

## WhatsApp: Alerta Dashboard + Reconexão Manual + Log de Eventos (04/04/2026)
- [x] Backend: tabela wa_connection_log para registrar eventos de conexão/desconexão
- [x] Backend: expor log de eventos via tRPC (últimos 30 eventos)
- [x] Backend: expor nextReconnectAt (timestamp da próxima tentativa automática)
- [x] Dashboard: banner/alerta quando WhatsApp estiver desconectado com link para a tela
- [x] Menu lateral: badge OFF no item WhatsApp quando desconectado
- [x] Tela WhatsApp: botão "Reconectar agora" com contagem regressiva até próxima tentativa automática
- [x] Tela WhatsApp: histórico de eventos de conexão (conectado/desconectado com horário e motivo)

## WhatsApp: Ícone de status no header (04/04/2026)
- [x] Header: ícone MessageCircle com dot pulsante verde (conectado) ou cinza/vermelho (desconectado)
- [x] Header: tooltip ao passar o mouse mostrando status e número conectado
- [x] Header: clique no ícone navega para /admin/whatsapp

## Redesign Cards de Serviços (04/04/2026)
- [x] Remover ícones dos cards de serviços
- [x] Cards menores e mais elegantes com nome da categoria/profissional no topo à esquerda em cor harmônica com a identidade visual

## Color Picker Visual para Grupos de Serviço (04/04/2026)
- [x] Substituir input de cor nativo por paleta visual com swatches (24 cores) + input hex + seletor nativo no modal de Tipos de Profissional
- [x] Preview em tempo real da cor escolhida aplicada ao nome do grupo (label colorida no canto superior direito)

## Configurações Visuais + Upload de Imagem (04/04/2026)
- [x] Unificar imagem de capa no mesmo card de configurações visuais (logo + capa juntos)
- [x] Adicionar upload de arquivo para logo (além de URL) via S3
- [x] Adicionar upload de arquivo para imagem de capa (além de URL) via S3

## Stripe: Reconfigurações após renomear produtos (04/04/2026)
- [x] Identificar price IDs desatualizados no código e orientar usuário sobre reconfiguração

## Portal Público: Logo + Compressão + Página de Planos (04/04/2026)
- [x] Portal público: logo já exibido no cabeçalho (PortalHeader já tinha a lógica, faltava apenas o upload que foi implementado)
- [x] Upload de imagem: compressão via canvas antes de enviar ao S3 (max 800x800 logo, 1200x400 capa)
- [x] Página /planos: preços dinâmicos via trpc.planos.getStripePrices (busca do Stripe, fallback local)

## Stripe: Atualizar Price IDs (04/04/2026)
- [x] Identificado conflito: servidor usa chave LIVE mas stripe-products.ts tinha IDs do ambiente TEST
- [x] Buscados os Price IDs corretos do ambiente LIVE e atualizado stripe-products.ts

## Stripe: Configurar Webhook LIVE (04/04/2026)
- [x] Verificar webhooks existentes no Stripe LIVE (havia 2 webhooks antigos para domínios obsoletos)
- [x] Criar webhook para hubly.orizontech.com.br/api/stripe/webhook (ID: we_1TIU6YLUFOvpH4vDqjJljS8F)
- [x] Atualizar STRIPE_WEBHOOK_LIVE no stripe-webhook.ts com o novo signing secret

## Segurança: Remover chaves Stripe hardcoded (04/04/2026)
- [x] Remover sk_live hardcoded de server/stripe.ts → usa exclusivamente process.env.STRIPE_SECRET_KEY
- [x] Remover whsec hardcoded de server/stripe-webhook.ts → usa exclusivamente process.env.STRIPE_WEBHOOK_SECRET
- [x] Plataforma Manus injeta STRIPE_SECRET_KEY (sk_test) e STRIPE_WEBHOOK_SECRET automaticamente
- [x] Para produção LIVE: usuário deve atualizar em Settings → Payment com sk_live e whsec do webhook we_1TIU6YLUFOvpH4vDqjJljS8F

## Stripe: Desativar webhooks obsoletos (04/04/2026)
- [x] Excluído we_1THskRLUFOvpH4vDfhIM8Tpe (agendei-app-bkct9rps.manus.space)
- [x] Excluído we_1THpThLUFOvpH4vDBaQi7Xee (agendei-app.manus.space)
- [x] Único webhook ativo: we_1TIU6YLUFOvpH4vDqjJljS8F (hubly.orizontech.com.br)

## IA + Pipeline + Automações (04/04/2026)
- [x] Backend: endpoint gerarPipelinePorIA (IA analisa automações e cria colunas + cartões)
- [x] Frontend: botão "Gerar com IA" + modal na tela de Automações
- [x] Frontend: redirecionamento automático para Pipeline após geração
- [x] Backend: endpoint getMetricasJornada (métricas agregadas por fase)
- [x] Frontend: aba "Jornada ao Vivo" na tela de Automações com activity feed em tempo real

## Jornada ao Vivo: Melhorias (04/04/2026)
- [x] Backend: filtro de período (24h/7d/30d) no endpoint getMetricasJornada
- [x] Backend: mutation reenviarMensagem para reprocessar envios com falha
- [x] Backend: contagem de falhas recentes para badge no menu
- [x] Frontend: seletor de período na aba Jornada ao Vivo
- [x] Frontend: badge de erros no item Automações do menu lateral
- [x] Frontend: botão "Reenviar" nos itens com status falhou no feed

## Pipeline Favorita + Acesso Rápido no Card (04/04/2026)
- [x] Schema: campo pipelineFavoritaId na tabela empresas
- [x] Backend: endpoint setPipelineFavorita (salva qual pipeline é a favorita)
- [x] Backend: endpoint getDashboardPipeline (retorna colunas + cards da pipeline favorita)
- [x] Backend: endpoint getCardAgendamento (retorna agendamento vinculado ao card)
- [x] Frontend Pipeline: ações "Ver agendamento" e "Ver cliente" no menu "..." do card
- [x] Frontend Dashboard: widget de pipeline favorita com mini-kanban
- [x] Frontend Dashboard: seletor de pipeline favorita (somente admin)

## Dashboard Configurável por Usuário (04/04/2026)
- [x] Schema: tabela dashboard_config (userId, empresaId, layout JSON)
- [x] Backend: endpoint getDashboardConfig (carrega configuração do usuário)
- [x] Backend: endpoint saveDashboardConfig (salva configuração do usuário)
- [x] Frontend: definir catálogo de widgets disponíveis (id, título, tamanho padrão, permissão)
- [x] Frontend: modo de edição do dashboard (botão "Personalizar")
- [x] Frontend: drag-and-drop para reposicionar widgets
- [x] Frontend: toggle para mostrar/ocultar widgets
- [x] Frontend: botão "Salvar layout" e "Restaurar padrão"
- [x] Frontend: carregar configuração salva automaticamente ao logar

## Layouts Pré-definidos do Dashboard (04/04/2026)
- [x] Layout "Visão Geral": todos os widgets visíveis na ordem padrão
- [x] Layout "Foco Financeiro": Métricas, Contas a Pagar, Resumo Financeiro, Score IA, Pipeline, Plano e Uso
- [x] Layout "Agenda do Dia": Métricas, Agenda de Hoje, Ações Rápidas, Equipe
- [x] Seletor visual com cards clicáveis no modo de edição do Dashboard

## Bug: WhatsApp reconexão contínua (04/04/2026)
- [x] Investigar logs e código de gerenciamento de reconexão
- [x] Corrigir lógica: parar tentativas de reconexão quando já conectado
- [x] Ajustar intervalo de verificação de status para valor adequado

## Bug: Botão "Alterar Status" do agendamento não clicável (04/04/2026)
- [x] Investigar sobreposição/z-index no modal de agendamento
- [x] Corrigir o problema para o botão ser clicável

## Bug: Alterar status bloqueado em concluídos/cancelados (04/04/2026)
- [x] Investigar condição que bloqueia botões de status para agendamentos finalizados
- [x] Permitir alterar status mesmo em agendamentos concluídos/cancelados

## Feature: Exclusão completa de agendamento (04/04/2026)
- [x] Backend: endpoint deleteAgendamento com cascade (pagamentos, comissões, histórico, vínculos pipeline)
- [x] Frontend: botão "Excluir agendamento" no modal com confirmação

## Bug: Automações com delay longo não disparam (04/04/2026)
- [x] Investigar scheduler de automações (cron, lógica de agendamento)
- [x] Verificar como tarefas "X horas antes" são calculadas e armazenadas
- [x] Verificar se o cron está rodando e processando tarefas pendentes
- [x] Corrigir a lógica de disparo para delays longos (24h, 48h, etc.)

## Melhorias v9 — Fila de Automações, Ações em Lote, Consistência de Pipelines (04/04/2026)
### 1. Fila de envios de automações
- [ ] Backend: endpoint para listar fila de envios pendentes/enviados/falhos com filtros
- [x] Frontend: tela FilaAutomacoes.tsx com cards de status, tempo restante, filtros
- [ ] Frontend: atualização automática da lista (polling a cada 30s)
- [ ] Frontend: ordenação por próximos envios / mais recentes
- [ ] Frontend: filtros por status, período e tipo de automação
- [ ] Frontend: rota /admin/automacoes/fila e link no menu de Automações

### 2. Ações em lote em agendamentos
- [ ] Backend: endpoint bulkUpdateStatus para atualizar múltiplos agendamentos
- [ ] Frontend: checkboxes de seleção múltipla na tela de Agendamentos
- [ ] Frontend: barra de ações em lote (alterar status, cancelar)
- [ ] Frontend: modal de confirmação antes de executar ação em lote
- [ ] Frontend: feedback de sucesso/erro parcial após execução

### 3. Consistência de pipelines ao excluir/ocultar agendamentos
- [x] Backend: ao excluir agendamento, remover de todos os cards de pipeline vinculados
- [ ] Backend: ao cancelar agendamento, atualizar status do card na pipeline
- [ ] Frontend: garantir que cards de pipeline sem agendamento sejam removidos/atualizados
- [ ] Verificar deleteAgendamentoCompleto para incluir remoção de pipeline cards

### 4. Compatibilidade geral
- [ ] Garantir que nenhuma funcionalidade existente seja quebrada
- [ ] Testes unitários para novos endpoints

## Melhorias v9 - Fila de Automacoes, Acoes em Lote, Consistencia de Pipelines (04/04/2026)
- [x] Backend: endpoint listar fila de envios pendentes/enviados/falhos com filtros
- [x] Frontend: tela FilaAutomacoes.tsx com cards de status, tempo restante, filtros
- [x] Frontend: atualizacao automatica da lista (polling a cada 30s)
- [x] Frontend: filtros por status, periodo e tipo de automacao
- [x] Frontend: rota /admin/automacoes/fila e link no menu de Automacoes
- [x] Backend: endpoint bulkUpdateStatus para atualizar multiplos agendamentos
- [x] Frontend: checkboxes de selecao multipla na tela de Agendamentos
- [x] Frontend: barra de acoes em lote (alterar status, cancelar)
- [x] Frontend: modal de confirmacao antes de executar acao em lote
- [x] Frontend: feedback de sucesso/erro parcial apos execucao
- [x] Backend: ao excluir agendamento, remover de todos os cards de pipeline vinculados
- [ ] Backend: ao cancelar agendamento, atualizar status do card na pipeline
- [x] Verificar deleteAgendamentoCompleto para incluir remocao de pipeline cards
- [ ] Testes unitarios para novos endpoints

## Melhorias v10 — Origem do Agendamento + Gatilhos

- [ ] Regra de origem: portal → status pré_agendado automático
- [ ] Regra de origem: plataforma → status selecionável na criação (pré-agendado, confirmado, agendado, etc.)
- [ ] Corrigir gatilhos ausentes na UI de automações: horas_antes_agendamento e dias_depois_agendamento
- [ ] Validar integração frontend ↔ backend dos gatilhos corrigidos

## Onboarding e Cadastro
- [ ] Botão "Criar conta" na tela de login
- [ ] Detecção de novo usuário (sem empresa vinculada) após login OAuth
- [ ] Tela de onboarding wizard multi-etapas (nome empresa, tipo, horários, profissional, serviço)
- [ ] Redirecionamento automático para onboarding após primeiro login
- [ ] Marcar onboarding como concluído e redirecionar para dashboard

## Lógica de disparo por status inicial
- [ ] Adicionar evento agendamento_pre_agendado na UI de Automações
- [ ] Corrigir lógica de disparo no agendamentos.create: pre_agendado → busca agendamento_pre_agendado primeiro, fallback agendamento_criado; agendado → só agendamento_criado

## Modal Novo Agendamento — Melhorias (sessão atual)
- [x] Status padrão pre_agendado no select de status inicial
- [x] Exibir valor do sinal calculado com percentual real da empresa
- [x] Registrar automação na fila ao salvar pré-agendamento
- [x] Remover status aguardando_reserva: manter sempre status original (pre_agendado) quando comReserva=true
- [x] Variável {{valor_reserva}} nas automações: valor calculado com percentual da empresa (ex: 30% de R\$ 200 = R\$ 60,00)
## Fila Universal de Envios (sessão atual)
- [x] Criação de agendamento: enfileirar como pendente em vez de enviar direto (independente do WhatsApp estar conectado)
- [x] Worker de processamento: a cada 1 minuto, processar pendentes com enviarEm <= agora
- [x] Expiração: remover/marcar como expirado itens pendentes com enviarEm + 4h < agora (vale para envios imediatos e programados como 2h, 4h, 24h antes)
- [x] Lembretes agendados (dias_antes, horas_antes, horas_apos): também enfileirar como pendente em vez de enviar direto
- [x] Ao reconectar WhatsApp: processar fila imediatamente sem esperar o próximo ciclo de 1 minuto

## Fila de Envios - Detalhes (sessão atual)
- [x] Adicionar modal/painel de detalhes completos ao clicar em um item da fila: mensagem completa, horário de envio programado, automação vinculada, cliente, telefone, erro (se houver)
- [x] Exibir horário de envio programado (enviarEm) na lista, não apenas criadoEm
- [x] Botão de reenvio para itens com status falhou

## Bugs (sessão atual)
- [x] Bug: mensagem do nó de automação não está sendo salva ao clicar no botão salvar

## Melhorias (sessão atual)
- [x] Toggle "Solicitar valor de reserva" habilitado por padrão no modal de nova agenda

## Funcionalidades de Pré-agendamento (sessão atual)
- [x] Botão "Reserva recebida" no detalhe do agendamento pré-agendado para confirmar pagamento e mudar status para agendado
- [x] Cancelamento automático de pré-agendamentos não confirmados após prazo configurável (ex: 24h ou 48h)
- [x] Card de taxa de conversão de pré-agendamentos no Dashboard

## Auditoria de Gatilhos de Automação (04/04/2026)

### Inconsistências encontradas:
- [x] Bug: template "Solicitar reserva" usa evento_pre_agendamento (nome antigo) em vez de evento_agendamento_pre_agendado
- [x] Bug: update de agendamento (confirmado/cancelado) ainda envia direto pelo WhatsApp sem passar pela fila universal
- [x] Bug: evento agendamento_concluido não está implementado (UI não tem, backend não dispara ao mudar para concluido)
- [x] Bug: evento agendamento_confirmado não está na lista de eventos da UI (apenas no backend)
- [x] Melhoria: adicionar evento agendamento_concluido na UI e no backend (disparar ao mudar status para concluido)

## Fase 1 — Correções Críticas (Plano de Implantação)

- [x] WhatsApp: fluxo guiado com 6 estados visuais (aguarde, gerando QR, QR disponível, conectando, conectado, erro)
- [x] WhatsApp: bloquear múltiplos cliques simultâneos (apenas 1 tentativa ativa por vez)
- [x] Visibilidade por role: profissionais não-admin veem apenas agendado/confirmado/cancelado/remarcado
- [x] Visibilidade por role: ocultar informações financeiras, pre_agendado e dados admin para não-admin
- [x] Automações: variável {{nome}} com fallback "Cliente" quando nome não estiver cadastrado

## Fase 2 — Automações Avançadas (Plano de Implantação)

- [x] Gatilho cliente_criado: disparar automação de saudação ao cadastrar novo cliente
- [x] Gatilho cliente_criado: adicionar na UI de automações como evento disponível
- [x] Leitura de comprovante via IA: botão no modal de agendamento para upload de imagem
- [x] Leitura de comprovante via IA: endpoint que extrai valor, data e banco do comprovante
- [x] Leitura de comprovante via IA: registrar pagamento automaticamente após extração
- [x] Automação de cancelamento de pré-agendamento expirado: disparar gatilho pre_agendamento_cancelado com mensagem ao cliente
- [x] Gatilho pre_agendamento_cancelado: adicionar na UI de automações como evento disponível

## Fase 3 — Módulo de Pacotes (Plano de Implantação)

- [x] Busca de pacotes por cliente na tela de Pacotes (campo de busca por nome do cliente)
- [x] Exibir saldo de sessões restantes na listagem de pacotes do cliente
- [x] Adicionar parcelamento no cadastro de pacotes (número de parcelas + valor por parcela)
- [x] Vincular sessão de pacote ao criar agendamento (select de pacote ativo do cliente)
- [x] Descontar automaticamente uma sessão do pacote ao vincular ao agendamento
- [x] Atualizar status do pacote para "concluído" quando todas as sessões forem usadas
- [ ] Exibir histórico de sessões usadas por pacote no perfil do cliente (próxima fase)

## Fase 4 — Melhorias de Pacotes (Plano de Implantação)

- [x] Backend: endpoint histórico de sessões por pacote (quais agendamentos consumiram cada sessão)
- [x] Backend: notificação ao admin quando restar apenas 1-2 sessões em pacote ativo (já existia, confirmado)
- [x] Backend: endpoint renovarPacote (reabrir pacote concluído/vencido com novo valor e vencimento)
- [x] Frontend: seção "Histórico de Sessões" expansível no perfil do cliente (por pacote)
- [x] Frontend: botão "Renovar Pacote" no card de pacote concluído/vencido na tela de Pacotes
- [x] Frontend: modal de renovação (novo valor, forma de pagamento, vencimento, parcelamento)

## Fase 5 — WhatsApp na Renovação de Pacote

- [x] Backend: disparar automação de evento 'pacote_renovado' no endpoint renovarPacote
- [x] Backend: buscar telefone/whatsapp do cliente e processar variáveis do template
- [x] Frontend: adicionar gatilho 'Pacote renovado' na UI de Automações
- [x] Frontend: adicionar variáveis {{nome_pacote}}, {{data_vencimento}}, {{valor_pago}}, {{parcelas}} na lista de variáveis
- [x] Frontend: adicionar preview das novas variáveis no modal de pré-visualização

## Etapa 1 — Correções pós-testes

- [x] Voltar o botão "Confirmar Reserva" no modal de agendamento (aparece para todos os pré-agendamentos)
- [x] Corrigir busca de cliente na tela de Pacotes (filtro client-side + server-side)
- [x] Filtrar alertas/notificações por usuário: PlanLimitAlert e ícone WhatsApp ocultos para profissionais
- [x] Implementar seleção múltipla de agendamentos para exclusão em lote (botão Excluir + confirmação)

## Correção — Autocomplete de cliente no modal "Abrir Pacote"

- [x] Substituir Select de cliente por campo de busca com autocomplete (digita nome/sobrenome, lista em tempo real)

## Etapa 2 — Correções pós-testes (Fase 4)

- [x] Corrigir automação dias_antes_agendamento: updateMutation agora envia todos os campos temporais (diasAntesDepois, horaDisparo, tipoGatilho)
- [x] Adicionar parcelamento de cartão de crédito em agendamentos (campo numeroParcelas no modal de pagamento, só aparece para cartão crédito)
- [x] Implementar edição completa de pacote do cliente (modal com todos os campos + botão Editar no card do pacote)
- [x] Corrigir erro profissionalId undefined no bloqueio de agenda (backend usa ctx.systemUser.profissionalId como fallback)

## Etapa 3 — Correções pós-testes

- [ ] Modelo de pacotes: corrigir contabilização de serviços (dar baixa correta dos itens do pacote por serviço)
- [ ] Agendamento: exibir se cliente tem pacote ativo e permitir abater serviço do pacote (se o pacote tiver o serviço)
- [ ] Página pública /agendar: adicionar opção de upload de comprovante para confirmar reserva
- [x] Criar novo pacote direto pelo agendamento (botão "Abrir pacote" no modal de agendamento)
- [x] Fluxo completo de venda + consumo: vincular pacote ao cliente diretamente pelo agendamento (criar pacote + abater sessão no mesmo fluxo)
- [ ] Pacotes por cliente: garantir edição de pacote (botão Editar já implementado — verificar se está funcionando)

## Sistema de Notificação de Renovação de Assinatura

- [x] Backend: job diário no scheduler (às 9h) que verifica assinaturas com renovação em 1 ou 3 dias
- [x] Backend: cooldown de 20h via usageAlerts para evitar notificações duplicadas
- [x] Backend: notificação in-app (tipo "sistema") para o owner da empresa com link para /admin/assinatura
- [x] Frontend: banner de renovação próxima na página Assinatura (violeta/âmbar/vermelho conforme urgência)
- [x] Frontend: loading spinner no botão "Gerenciar" do banner
- [x] Frontend: spinner no botão "Portal do cliente" no cabeçalho da página Assinatura

## Botão "Testar Envio" na Configuração de Automação

- [x] Backend: procedure testarEnvioAutomacao (envia mensagem de teste para número informado substituindo variáveis com dados fictícios)
- [x] Frontend: botão "Testar envio" no modal/formulário de edição de automação com campo de número de destino

## Histórico de Envios de Teste

- [x] Adicionar coluna is_test na tabela historicoEnviosAutomacao e migration SQL
- [x] Atualizar helper registrarEnvioAutomacao para aceitar flag is_test
- [x] Registrar envios de teste na procedure testarEnvio com is_test=true
- [x] Exibir badge "Teste" no histórico de envios para diferenciar dos envios reais
- [x] Filtro por tipo (real/teste) na tela de histórico de envios


## Sistema de Aprovação de Bloqueios (v7)
- [x] Auto-aprovação para admins: bloqueios criados por admins nascem como "aprovado"
- [x] Modal de aprovação/rejeição: ao clicar na notificação, abrir modal com opções
- [x] Campo de observações: ao rejeitar, permitir digitar motivo
- [x] Notificações bidirecionais: enviar notificação para o solicitante (aprovado ou rejeitado com motivo)
- [x] Atualizar status: registrar aprovação/rejeição com aprovadoPorId e motivoRecusa
- [x] UI de bloqueios: exibir status (pendente/aprovado/recusado) com cores diferenciadas
- [x] Histórico de aprovação: mostrar quem aprovou/rejeitou e quando


## Melhorias na Página de Bloqueios (v8)
- [x] Indicador visual de bloqueios pendentes na sidebar para administradores
- [x] Filtros na página de bloqueios: "Meus bloqueios", "Aguardando aprovação", "Histórico"
- [x] Notificações para solicitante sobre aprovação/rejeição do bloqueio

- [x] Exclusão de bloqueios: qualquer usuário pode excluir qualquer registro de bloqueio
- [x] Notificação para admins: quando bloqueio é cancelado, notificar grupo admin


## Integração de Bloqueios no Calendário (v9)
- [ ] Integrar bloqueios no calendário visual - exibir períodos bloqueados com cor diferenciada
- [ ] Bloqueios recorrentes - permitir repetição semanal/mensal
- [ ] Relatório de bloqueios - página de análise com histórico e aprovações

## Permissões de Pacotes nos Grupos (v-atual)
- [ ] Adicionar colunas pacotesVer, pacotesEditar, pacotesExcluir na tabela permissoes_grupo (schema + migration)
- [ ] Atualizar tela de configuração de grupos para exibir seção Pacotes com os 3 toggles
- [ ] Aplicar validação de permissão nos endpoints de pacotes

## Grupo Administradores Protegido (v-atual)
- [x] Schema: coluna isAdmin na tabela grupos_permissoes + migration aplicada
- [x] Backend: bypass total de permissões para grupo isAdmin em getPermissoesGrupoByProfissional
- [x] Backend: proteção contra edição/exclusão/alteração de permissões do grupo isAdmin
- [x] Frontend: badge "Protegido" + borda âmbar + sem botões de editar/excluir para grupo isAdmin
- [x] Frontend: exibir "Acesso total ao sistema" e "Permissões imutáveis" para grupo isAdmin

## Escopo de Visibilidade por Grupo (v-atual)
- [ ] Schema: colunas notificacoesEscopo, agendaEscopo, calendarioEscopo (enum: proprio/todos) na tabela permissoes_grupo
- [ ] Backend: filtrar notificações por escopo do grupo do usuário logado
- [ ] Backend: filtrar agenda/calendário por escopo do grupo do usuário logado
- [ ] Frontend: seção de escopo de visibilidade no modal de permissões dos grupos

## Filtros Dinâmicos no Dashboard → Contas a Pagar (v-atual)
- [x] Dashboard: corrigir URLs dos cards de contas (de /admin/financeiro/contas-pagar para /admin/contas-pagar)
- [x] Dashboard: adicionar parâmetros ?filtro=vencidas, ?filtro=hoje, ?filtro=semana nos links dos cards
- [x] ContasPagar: implementar leitura do parâmetro ?filtro= da URL com useSearch() do wouter
- [x] ContasPagar: aplicar filtros automaticamente ao carregar a página (vencidas=status vencido, hoje=data de hoje, semana=próximos 7 dias)
- [x] ContasPagar: exibir indicador visual do filtro ativo com botão para limpar
- [x] Backend: getContasPagarByEmpresa já suporta dataInicio e dataFim como filtros SQL

## Melhorias de UI/UX (v-atual)
- [x] Notificações: remover da sidebar e adicionar sininho com badge no header desktop e mobile
- [x] Escopo de visibilidade: mover card para o topo do modal de permissões e tornar compacto
- [x] Manual: remover página separada da sidebar e incorporar no chat de Suporte
- [x] Cards do Dashboard: reduzir padding e fontes no mobile sem perder informações

## Formatação de Variáveis nas Automações (v-atual)
- [x] Corrigir formatação de horário nas variáveis: usar HH:mm sem segundos

## Variável link_agendamento nas Automações (v-atual)
- [ ] Buscar slug da empresa e construir link do portal em todos os templateVars do scheduler.ts
- [ ] Adicionar link_agendamento nos templateVars do routers.ts (criação/atualização de agendamentos)
- [ ] Exibir {{link_agendamento}} na lista de variáveis disponíveis no editor de automações

## Variável link_agendamento nas Automações
- [x] Adicionar {{link_agendamento}} em todos os templateVars do scheduler.ts (lembretes, horas antes/após, dias depois, aniversários, campanhas)
- [x] Adicionar {{link_agendamento}} nos templateVars do routers.ts (criação e atualização de agendamentos)
- [x] Exibir {{link_agendamento}} na lista de variáveis disponíveis no editor de automações

## Permissões de Pacotes nos Grupos
- [ ] Adicionar seção Pacotes no PermissoesEditor do Equipe.tsx (toggles pacotesVer, pacotesEditar, pacotesExcluir)
- [ ] Validar permissão pacotesVer nos endpoints de listagem de pacotes
- [ ] Validar permissão pacotesEditar nos endpoints de criação/edição de pacotes
- [ ] Validar permissão pacotesExcluir nos endpoints de exclusão de pacotes

## Permissões de Pacotes nos Grupos (v-atual)
- [x] Seção Pacotes com toggles pacotesVer/Editar/Excluir já existia no PermissoesEditor (frontend completo)
- [x] Validar permissões nos endpoints backend: listarModelos, criarModelo, editarModelo, desativarModelo, listarTodos, abrirPacote, cancelarPacote, editarPacote, renovarPacote

## Estabilidade WhatsApp (v-atual)
- [x] Reduzir backoff de reconexão (15s→5s, 30s→10s, 60s→15s, 120s→30s, 300s→60s)
- [x] Tratar código 408 (timeout) com reconexão imediata sem backoff
- [x] Adicionar keepalive/ping para evitar timeout 408

## Logs Detalhados WhatsApp (v-atual)
- [ ] Expandir tabela wa_connection_log com: statusCode, motivo, duracaoSessaoMs, tentativa, detalheTecnico
- [ ] Aplicar migration SQL com novos campos
- [ ] Atualizar whatsapp.ts para registrar logs detalhados em todos os eventos
- [ ] Atualizar página WhatsApp para exibir logs detalhados com filtros e cores por tipo

## Logs Detalhados WhatsApp (v-atual - concluído)
- [x] Expandir tabela wa_connection_log com: statusCode, motivo, duracaoSessaoMs, tentativa, detalheTecnico, telefone
- [x] Aplicar migration SQL com novos campos (8 colunas adicionadas)
- [x] Atualizar whatsapp.ts para registrar logs detalhados em todos os eventos (connected, disconnected, qr_ready, logged_out, reconnecting, reconnect_attempt, error, shutdown)
- [x] Atualizar página WhatsApp com seção "Diagnóstico de Conexão" com badges de statusCode, motivo, duração de sessão, tentativas e detalhe técnico colapsável

## Filtro de Serviço nas Automações (bug - v-atual)
- [x] Corrigir filtro de servicoId nas automações: mensagem está indo para todos os agendamentos ignorando o filtro de serviço configurado
  - Função verificarCondicoesFlow() adicionada no scheduler.ts
  - Função verificarCondicoesFlowRouter() adicionada no routers.ts
  - Verificado em todos os 4 tipos de lembrete (dias antes, horas antes, horas após, dias depois)
  - Verificado no disparo imediato ao criar agendamento
  - Verificado no disparo ao atualizar status (confirmado/cancelado/concluído)

## Múltiplos Profissionais por Agendamento (v-atual)
- [ ] Schema/migration: adicionar profissionalId por serviço na tabela agendamentos_servicos
- [ ] Backend: atualizar endpoints de criação/edição de agendamento para múltiplos profissionais
- [ ] Frontend: modal de agendamento com seletor de profissional por serviço
- [ ] Calendário: agendamento aparece na agenda de todos os profissionais vinculados
- [ ] Automações: enviar mensagem uma única vez mesmo com múltiplos profissionais

## Multi-profissional por Agendamento (v-atual)
- [x] Schema: adicionar profissionalId (nullable) na tabela agendamento_itens
- [x] Migration SQL: ALTER TABLE agendamento_itens ADD COLUMN profissionalId
- [x] Backend db.ts: incluir profissionalId nos selects de itens e no filtro de calendário por profissional
- [x] Backend routers.ts: aceitar profissionalId por item em create, updateServicos e updateValores
- [x] Frontend NovaAgendaModal: seletor de profissional por linha de serviço
- [x] Frontend AgendamentoDetalheModal: exibir e editar profissional por serviço
- [x] Calendário: agendamento aparece na agenda de todos os profissionais vinculados via itens

## Fluxo Profissional→Serviço por Card (NovaAgendaModal)
- [x] Remover seletor de profissional global do modal
- [x] Cada card de serviço: selecionar profissional primeiro → filtra serviços → seleciona serviço
- [x] profissionalId do agendamento derivado do primeiro item
- [x] Sem conceito de "profissional principal"
- [x] AgendamentoDetalheModal: modo de edição também segue fluxo profissional→serviço
- [x] Endpoint getAll adicionado em profissionalServicos para carregar vínculos em batch

## Caixa de Saída de Automações (v-atual)
- [x] Melhorar FilaAutomacoes.tsx: adicionar coluna de serviço, filtro por automação e renomear para Caixa de Saída
- [x] Adicionar campo servicoNome na tabela historico_envios_automacao
- [x] Persistir servicoNome ao enfileirar automações no routers.ts e scheduler.ts
- [x] Integrar na sidebar como "Caixa de Saída" sob Automações

## Comissão Multi-profissional (v-atual)
- [x] Ao concluir agendamento: iterar pelos itens e criar comissão separada por profissional de cada item
- [x] Usar percentualComissao do profissional do item (não do agendamento principal)
- [x] Evitar duplicação: verificar se já existe comissão para o agendamento antes de criar

## Portal Público: Fluxo Profissional→Serviço (v-atual)
- [x] Inverter fluxo: profissional primeiro, depois serviços filtrados por profissional
- [x] Atualizar steps: identificacao → profissional → servico → data → confirmacao
- [x] Filtrar serviços disponíveis pelo profissional selecionado
- [x] Endpoint getServicosPorProfissional adicionado no portal router

## Filtro por Automação na Caixa de Saída (v-atual)
- [x] Backend: adicionar parâmetro automacaoNome no getFilaEnvios e endpoint getAutomacoesNomes para listar automações distintas
- [x] Frontend: seletor de automação nos filtros da Caixa de Saída
- [x] Botão "Limpar filtros" limpa status e automação ao mesmo tempo

## Horário por Item em Agendamentos Multi-profissional (v-atual)
- [x] Migration SQL: adicionar horaInicio e horaFim na tabela agendamento_itens
- [x] Schema Drizzle: atualizar agendamentoItens com horaInicio e horaFim
- [x] Backend db.ts: retornar horaInicio/horaFim nos selects de itens
- [x] Backend routers.ts: aceitar horaInicio/horaFim por item em create e updateServicos
- [x] Frontend NovaAgendaModal: cálculo automático sequencial de horário por item (soma duração do serviço anterior)
- [x] Frontend NovaAgendaModal: seletor de hora por item (editável manualmente)
- [x] Frontend AgendamentoDetalheModal: exibir e editar horaInicio/horaFim por item

## Calendário com Bloco por Item (v-atual)
- [x] Backend: incluir itens (horaInicio/horaFim/profissionalId/servicoNome) na resposta do endpoint de listagem do calendário
- [x] Frontend: expandir agendamentos multi-profissional em blocos por item no calendário mensal
- [x] Frontend: cada bloco usa a cor do profissional do item
- [x] Frontend: blocos de item único (sem horaInicio/horaFim) mantêm comportamento atual
- [x] Frontend: view lista também usa blocos por item com borda colorida do profissional

## Comissões Agrupadas por Profissional no Financeiro (v-atual)
- [x] Backend: getComissoesByEmpresa enriquecido com servicoNome e clienteNome via join
- [x] Frontend Financeiro: seção de comissões com cards por profissional, expansível com detalhe por serviço
- [x] Exibir corretamente comissões de agendamentos multi-profissional (um item por profissional)
- [x] Totais de pendente/pago por profissional exibidos no cabeçalho do grupo
- [x] Linha colorida com cor do profissional em cada detalhe de comissão

## Filtro por Período no Financeiro (v-atual)
- [x] Seletores de data início e fim na tela de Financeiro
- [x] Passar dataInicio/dataFim para o endpoint financeiro.comissoes
- [x] Atalhos rápidos: Mês atual, Mês anterior, Últimos 30 dias
- [x] Inputs de data personalizada com destaque visual quando ativo

## Card de Resumo do Período no Financeiro (v-atual)
- [x] Card de resumo entre os métricas e a tabela de comissões
- [x] Exibir total geral, total pago e total pendente do período filtrado
- [x] Mostrar o intervalo de datas selecionado no card
- [x] Barra de progresso visual mostrando % pago
- [x] Contador de comissões no período
- [x] Card só aparece quando há comissões no período

## Capacitor - App Nativo iOS e Android (v-atual)
- [x] Instalar @capacitor/core, @capacitor/cli, @capacitor/ios, @capacitor/android
- [x] Instalar plugins: @capacitor/status-bar, @capacitor/splash-screen, @capacitor/push-notifications, @capacitor/app
- [x] Configurar capacitor.config.ts com appId com.orizontech.hubly
- [x] Atualizar manifest.json com theme_color e background_color corretos
- [x] Atualizar meta tags mobile no index.html (viewport-fit=cover, format-detection)
- [x] Executar npx cap add android - projeto android/ gerado com sucesso
- [x] Executar npx cap add ios - projeto ios/ gerado com sucesso
- [x] Criar MOBILE_BUILD_GUIDE.md com guia completo de build e publicação

## Ícones e Splash Screen Nativos (v-atual)
- [x] Gerar ícone do Hubly a partir do CDN (512x512)
- [x] Gerar todos os tamanhos para Android (mdpi 48px ao xxxhdpi 192px + round)
- [x] Gerar todos os tamanhos para iOS (20px ao 1024px) com Contents.json
- [x] Gerar splash screens Android (320x480 ao 1440x2560) com fundo #0f172a
- [x] Substituir ícones nos projetos android/ e ios/

## Notificações Push Nativas (v-atual)
- [x] Hook useMobileApp.ts criado com handler completo de push notifications
- [x] Solicita permissão, registra token e navega ao tocar na notificação
- [x] Permissões POST_NOTIFICATIONS adicionadas no AndroidManifest.xml
- [x] NSUserNotificationUsageDescription adicionada no Info.plist
- [x] MobileAppInit integrado no App.tsx

## Deep Links hubly:// (v-atual)
- [x] intent-filter hubly:// e https://hubly.orizontech.com.br no AndroidManifest.xml
- [x] CFBundleURLSchemes hubly:// no Info.plist do iOS
- [x] Handler appUrlOpen no useMobileApp.ts (hubly:// e https://)
- [x] Suporte a hubly://agendamento/:id e hubly://cliente/:id

## Firebase Cloud Messaging + APNs (v-atual)
- [ ] Configurar build.gradle Android com plugin google-services
- [ ] Criar google-services.json placeholder com instruções
- [ ] Criar guia APNs iOS (certificado, capability, entitlements)
- [ ] Atualizar useMobileApp.ts para registrar token FCM no backend
- [ ] Endpoint backend para salvar push token por usuário

## Publicação nas Lojas - Guia Completo (v-atual)
- [ ] Atualizar MOBILE_BUILD_GUIDE.md com passo a passo Play Store
- [ ] Adicionar passo a passo App Store (TestFlight + produção)
- [ ] Incluir checklist de screenshots, descrições e metadados
- [ ] Documentar processo de atualização de versão

## Tela de Configurações de Notificações (v-atual)
- [x] Schema: campos notif* já existiam na tabela users (novoAgendamento, confirmacao, cancelamento, lembrete, pagamento, comissao)
- [x] Backend: endpoints push.getPreferencias e push.salvarPreferencias
- [x] Frontend: seção "Notificações Push" na página Configuracoes.tsx com toggles por tipo
- [ ] Integrar na sidebar e registrar rota

## Bugs (v8 — Timezone)
- [x] Bug crítico: página de Agendamentos não exibia registros — causa: `new Date().toISOString()` retorna data UTC que diverge da data local do usuário (GMT-3). Corrigido com função `getLocalDateString()` em utils.ts, aplicada em Agendamentos.tsx, Calendario.tsx, Dashboard.tsx, ContasPagar.tsx, ContasReceber.tsx, ComissoesPagar.tsx, NovaAgendaModal.tsx, ReceitaDetalheModal.tsx e PortalCliente.tsx

## Configurações de Notificações Push (v8)
- [x] Schema: campos notif* já existiam na tabela users
- [x] Backend: push.getPreferencias e push.salvarPreferencias implementados
- [ ] Backend: respeitar preferências ao enviar push (filtrar por tipo)
- [x] Frontend: seção "Notificações Push" na página Configurações com toggles por tipo
- [x] Frontend: integrar usePushNotifications na seção de configurações

## Edição Completa de Agendamento (v9)
- [x] Modal de edição completa: trocar cliente, profissional, serviço, data, hora
- [x] Adicionar/remover itens de serviço no agendamento existente
- [x] Backend: clienteId adicionado ao endpoint agendamentos.update
- [x] Botão "Editar Agendamento" no modal de detalhe (AgendamentoDetalheModal)

## Bug: Agendamento Simultâneo (v9)
- [x] Corrigir erro ao criar agendamento com múltiplas profissionais no mesmo horário
- [x] Frontend: remover :00 extra nos horários dos itens (NovaAgendaModal e EditarAgendamentoModal)
- [x] Backend: sanitizar horaInicio/horaFim para varchar(5) nos endpoints create e updateServicos

## Atalhos de Período (v9.2)
- [x] Agendamentos: adicionar botões Hoje/Semana/Mês nos filtros de data
- [x] Dashboard: adicionar atalhos Hoje/Semana/Mês no widget de agenda

## Bug: Ordenação de Agendamentos (v9.3)
- [x] Corrigir ordenação: exibir por data + hora (não por ordem de criação)
- [x] Adicionar separadores de data na lista quando período é maior que um dia

## Bug: Layout Mobile Modais de Agendamento (v9.4)
- [x] NovaAgendaModal: corrigir campos truncados/sobrepostos no mobile
- [x] EditarAgendamentoModal: corrigir campos truncados/sobrepostos no mobile

## UX Mobile: Atalhos Agendamentos (v9.5)
- [x] Mover atalhos Hoje/Semana/Mês para fora do painel de filtros (sempre visíveis no mobile)

## Persistência de Filtro de Período (v9.6)
- [x] Salvar último período selecionado em localStorage ao trocar
- [x] Restaurar período salvo ao carregar a página de Agendamentos

## Atalhos Calendário + Contador (v9.7)
- [x] Calendário: adicionar botões Hoje/Semana/Mês na barra de navegação com contadores
- [x] Agendamentos: exibir contador de agendamentos em cada botão de período (ex: "Hoje · 5")

## WhatsApp: Limite de Eventos (v9.8)
- [x] Limitar exibição de eventos na lista de diagnóstico para apenas 5 mais recentes

## Auditoria Mobile: Responsividade (v10)
- [ ] Calendário: botões Hoje/Semana/Mês + botão Novo em layout responsivo (não sobrepostos)
- [ ] Dashboard: botões Personalizar/Restaurar/Salvar em layout responsivo (não sobrepostos com conteúdo)
- [ ] Todas as páginas: verificar truncamento de campos, botões e elementos no mobile
- [ ] Verificar overflow e scroll em modais, cards e listas

## UX: Encurtamento de Textos (v9.9)
- [ ] Dashboard: trocar "Salvar layout" por "Salvar"
- [ ] Dashboard: trocar "Restaurar padrão" por "Padrão"

## Calendário: Menu de Ações ao Clicar em Dia (v9.10)
- [x] Ao clicar em dia com agendamentos, abrir menu com opções: "Novo Agendamento" ou "Ver Agendamentos do Dia"
- [x] Se dia sem agendamentos, abrir diretamente o modal de novo agendamento

## Bugs: Menu Calendário (v9.11)
- [x] Botões "Mês" truncados em vermelho no mobile — falta espaço na barra de navegação (ocultos no mobile com `hidden lg:flex`)
- [x] Erro 404 ao clicar "Ver Agendamentos do Dia" — corrigido para usar `navigate()` do wouter com rota correta `/admin/agendamentos?data=...`
- [x] Página de Agendamentos agora lê parâmetro `?data` da URL e pré-preenche o filtro de data

## UX: Botão Novo no Calendário (v9.11.1)
- [x] Alterar botão "Novo" para exibir apenas o ícone de mais (+) no mobile

## UX: Menu de Contexto do Calendário (v9.11.2)
- [x] Remover botão "Novo Agendamento" da barra de navegação
- [x] Centralizar menu de contexto com opções "Novo Agendamento" e "Ver Agendamentos"

## Bug: Onboarding de Configuracao da Empresa (v9.11.3)
- [x] Verificar por quanto tempo o onboarding de "Configurar empresa" aparece apos a configuracao ser feita
- [x] Adicionar cache (staleTime: 5 minutos) para evitar recarregamentos desnecessarios
- [x] Implementar verificacao mais robusta: nao exibir onboarding durante carregamento da query
- [x] Mostrar loading spinner enquanto a empresa esta sendo carregada

## UX: Menu Centralizado no Calendário (v9.11.4)
- [x] Centralizar menu de contexto usando transform: translate(-50%, -50%)
- [x] Aumentar minWidth do menu para 250px para melhor legibilidade

## UX: Animação do Menu (v9.11.5)
- [x] Adicionar animação fade-in + scale ao menu de contexto
- [x] Usar cubic-bezier para easing suave (0.16, 1, 0.3, 1)
- [x] Duração de 0.2s para animação rápida e responsiva

## UX: Dashboard (v9.11.6)
- [x] Remover botão "+ Novo Agendamento" do Dashboard

## UX: Dashboard (v9.11.7)
- [x] Remover alerta de "WhatsApp desconectado" para evitar confusão com sininho de notificações

## UX: Header (v9.11.8)
- [x] Remover ícone de WhatsApp com badge de status do header mobile

## Feature: Sistema de Notificações em Overlay (v9.12)
- [ ] Criar componente NotificationStack para empilhar notificações
- [ ] Implementar notificações como cards flutuantes (bottom overlay)
- [ ] Adicionar botão de fechar (X) em cada notificação
- [ ] Auto-desaparecer após 5 segundos
- [ ] Animação suave de entrada/saída (fade-in/slide-up)
- [ ] Suportar múltiplas notificações empilhadas
- [ ] Integrar com sistema de toasts existente

## Feature: Sistema de Notificações em Overlay (v9.12) - IMPLEMENTAÇÃO COMPLETA
- [x] Criar componente NotificationStack para empilhar notificações
- [x] Implementar notificações como cards flutuantes (bottom overlay)
- [x] Adicionar botão de fechar (X) em cada notificação
- [x] Auto-desaparecer após 5 segundos
- [x] Animação suave de entrada/saída (slideUp)
- [x] Suportar múltiplas notificações empilhadas
- [x] Integrar NotificationProvider ao main.tsx
- [x] Adicionar animação slideUp ao index.css
- [ ] Testar com exemplos de notificações (success, error, warning, info)
- [ ] Integrar com sistema de toasts existente

## Feature: Web Push Notifications (v9.13)
- [ ] Criar Service Worker para gerenciar push notifications
- [ ] Implementar subscription a push notifications no app
- [ ] Adicionar backend para enviar push notifications
- [ ] Testar notificações em background/bloqueado
- [ ] Adicionar permissão de notificações no primeiro acesso

## Feature: Permissões Nativas do Sistema Operacional (v9.14)
- [x] Adicionar manifest.json com permissões de notificação
- [x] Implementar Notification API com permissões do SO
- [x] Adicionar meta tags de notificação no index.html
- [x] Adicionar screenshots e share_target no manifest.json
- [ ] Testar em Android (Chrome, Firefox, Samsung Internet)
- [ ] Testar em iOS (Safari, PWA)
- [ ] Adicionar botão nas Configurações para ativar/desativar
- [ ] Mostrar status de permissão (ativado/desativado/negado)

## Feature: Suporte a PDF em Comprovantes (v9.15)
- [x] Adicionar suporte a PDF no input de arquivo (accept="image/*,application/pdf")
- [x] Atualizar backend para processar PDF com LLM (file_url em vez de image_url)
- [x] Atualizar prompt do LLM para suportar PDF
- [ ] Implementar preview de PDF antes de enviar
- [ ] Testar com PDFs reais

## Feature: Preview de PDF (v9.16)
- [ ] Adicionar modal para visualizar PDF antes de processar
- [ ] Implementar visualização de página do PDF
- [ ] Adicionar botão para confirmar/cancelar

## Feature: Notificações de Agendamento (v9.17)
- [ ] Criar job para verificar agendamentos próximos
- [ ] Enviar notificação 1 hora antes do agendamento
- [ ] Adicionar configuração de tempo de notificação

## Feature: Notificações de Agendamento (v9.17)
- [x] Implementar preview de PDF no modal de comprovante
- [x] Adicionar campos notificacaoEnviada e notificacaoEnviadaEm no banco
- [x] Gerar e aplicar migração SQL
- [x] Criar job para verificar agendamentos próximos (1 hora antes)
- [ ] Integrar job no servidor (executar a cada 5 minutos)
- [ ] Enviar notificação push 1 hora antes do agendamento
- [ ] Adicionar configuração de tempo de notificação nas Configurações

## Feature: Integração de Job no Servidor (v9.19)
- [x] Integrar job de notificações no scheduler do servidor
- [x] Executar a cada 5 minutos
- [ ] Testar com agendamentos próximos

## Feature: Toggle de Notificações nas Configurações (v9.20)
- [x] Adicionar toggle para ativar/desativar push notifications (JA EXISTE)
- [x] Mostrar status (ativado/desativado/negado)
- [x] Salvar preferência no banco de dados

## Feature: Notificações de Confirmação (v9.21)
- [x] Enviar notificação para dono quando agendamento é confirmado
- [x] Enviar notificação para profissional quando agendamento é confirmado
- [x] Integrar com fluxo de confirmação do WhatsApp
- [ ] Testar com clientes reais


## Feature: Atualização de Ícones (v9.26)
- [x] Fazer upload do novo ícone do app (CDN)
- [x] Atualizar favicon.ico (múltiplas resoluções)
- [x] Atualizar apple-touch-icon.png (iOS)
- [x] Criar ícones para Android (192x192, 256x256, 384x384, 512x512)
- [x] Atualizar manifest.json com novos ícones
- [x] Atualizar index.html com referências aos novos ícones
- [ ] Testar em Android e iOS

## Bug: Sino em Push Notifications (v9.27.1)
- [x] Remover sino/badge das push notifications (removido do Service Worker)

## Feature: Integração com Obsidian (v9.31)
- [x] Criar gerador de documentação do projeto em Markdown
- [x] Exportar arquitetura, fluxos e configurações
- [x] Criar endpoint de sincronização sob demanda (tRPC)
- [x] Adicionar botão "Exportar para Obsidian" nas Configurações
- [x] Gerar documentação estruturada (5 arquivos MD)
- [x] Download automático de arquivo .md com toda documentação
- [ ] Testar importação no Obsidian

## Bug: Erro ao Exportar para Obsidian (v9.32.1)
- [x] Erro React 321 ao clicar em "Exportar para Obsidian" (corrigido)
- [x] Corrigir função de exportação (usar .query() em vez de .useQuery().refetch())

## Correção de Automações — Aniversário e Pré-Agendamento (Apr 20 2026)

- [x] Corrigir automação de aniversário: envio apenas dia 01 do mês, sem duplicidade, 1x por ano
- [x] Deduplicação de aniversário por ano (não por dia) usando historicoEnviosAutomacao existente
- [x] Corrigir fluxo de pré-agendamento: confirmarReserva não altera mais status para agendado
- [x] Pré-agendamento permanece como pre_agendado até confirmação explícita

## Botão Confirmar no Modal de Edição (Apr 20 2026)

- [x] Botão "Confirmar" destacado no modal de edição quando status = pre_agendado

## Correção de Automações — 4 Falhas (Apr 20 2026)

- [ ] Corrigir anti-duplicidade: considerar evento+agendamento+cliente (não bloquear eventos diferentes)
- [ ] Corrigir confirmarReserva: disparar automação de confirmação após reserva paga
- [ ] Corrigir exibição de múltiplos serviços no log/caixa de saída
- [ ] Garantir que filtro de serviço não bloqueie envios indevidamente

## Melhorias — 20 Abr 2026

- [ ] Coluna "Serviço" na tabela do histórico de envios (caixa de saída)
- [ ] Filtro "Sem profissional" na listagem de agendamentos
- [ ] Template padrão de automação para evento Reserva paga
- [ ] Atualizar manual do sistema

## Melhorias — 20 Abr 2026 (tarde)
- [ ] Card de pré-agendamentos pendentes no Dashboard com link para lista filtrada
- [ ] Dialog de confirmação ao ocultar modelo de pacote

## Sistema de Suporte (Chamados) — Apr 20 2026
- [x] Backend: suporte.ts reescrito com procedures abrirChamado, listarMeusChamados, getChamadoMensagens, responderChamadoCliente, avaliarChamado + chat IA
- [x] SupportChat.tsx: botão flutuante adicionado, abas Chat IA / Chamados, fluxo de abertura de chamado, lista de tickets, detalhe do chamado com thread e avaliação
- [x] Página /admin/suporte: listagem de chamados com status/prioridade, detalhe com thread, resposta, avaliação por estrelas
- [x] Sidebar: item Suporte agora navega para /admin/suporte (com highlight de rota ativa)
- [x] TypeScript: zero erros após todas as alterações

## Painel Orizontech — Apr 20 2026
- [x] Backend: orizontech.ts com gestão de empresas, assinaturas, WhatsApp API, chamados, base de conhecimento
- [x] Frontend: PainelOrizontech.tsx com tabs Empresas, Assinaturas, WhatsApp, Suporte, Base de Conhecimento
- [x] Planos Stripe criados: Essencial (R$97/mês), Profissional (R$197/mês), Premium (R$397/mês) com anuais
- [x] Schema: tabelas planos, chamados, chamado_mensagens, base_conhecimento; campos extras em empresas

## Melhorias de Suporte — Apr 20 2026 (tarde)
- [x] Painel Orizontech: aba de Chamados com listagem, detalhe, resposta e alteração de status
- [x] Backend orizontech: procedures listarChamados, getChamado, responderChamado, atualizarStatusChamado
- [x] Dashboard: card de pré-agendamentos pendentes com contador e link para lista filtrada
- [x] Push notification ao responder chamado: disparar push para o cliente quando suporte responder

## Integração Z-API — Apr 20 2026
- [x] Salvar ZAPI_INSTANCE_ID e ZAPI_TOKEN como secrets
- [x] Criar server/zapi.ts com funções de envio via Z-API REST
- [x] Criar server/whatsapp-router.ts: plano PRO usa Z-API, Solo/Plus usa Baileys
- [x] Substituir waManager.sendMessage em todos os pontos de envio (routers.ts + scheduler.ts)
- [x] Testes unitários para zapi.ts e whatsapp-router.ts (7 testes passando)

## Gerenciamento Z-API pela Interface — Apr 20 2026
- [x] Backend: procedures zapiGetQrCode, zapiGetStatus, zapiRestart, zapiDisconnect no router whatsapp
- [x] Frontend: página WhatsApp com QR Code inline, polling de status, botões conectar/desconectar/reiniciar
- [x] Polling automático a cada 10s até conectar, parar ao atingir status connected
- [x] Seção Z-API exclusiva para plano Pro, Baileys como fallback para outros planos

## Webhook Z-API — Confirmação de Entrega/Leitura — Apr 20 2026
- [ ] Schema: coluna messageStatus (sent/delivered/read/failed) na tabela historicoEnvios
- [ ] Endpoint POST /api/zapi/webhook para receber eventos de status da Z-API
- [ ] Atualizar historicoEnvios ao receber evento de entrega/leitura
- [ ] Frontend: exibir ícone de status (✓ enviado, ✓✓ entregue, ✓✓ azul lido) no histórico de envios

## Melhorias Z-API — Apr 20 2026
- [ ] Configurar webhook Z-API automaticamente ao conectar instância
- [ ] Invalidar cache de plano no webhook Stripe após upgrade/downgrade
- [ ] Exibir número conectado no badge ON da sidebar (tooltip com telefone Z-API)

## Melhorias Z-API e Stripe (v-atual)
- [x] zapi.ts: adicionar zapiSetWebhook (configura todos os webhooks via PUT /update-every-webhooks)
- [x] zapi.ts: adicionar zapiGetConnectedPhone (obtém número conectado via GET /device-properties)
- [x] routers.ts zapiGetQrCode: aceitar input { origin } e chamar zapiSetWebhook automaticamente ao detectar conexão
- [x] routers.ts whatsapp.getStatus: chamar zapiGetConnectedPhone quando PRO+conectado e retornar phoneNumber
- [x] AdminLayout sidebar: tooltip no ícone WhatsApp mostrando "Conectado: {telefone}" quando conectado
- [x] stripe-webhook.ts: importar invalidatePlanCache e chamar após checkout.session.completed, customer.subscription.updated e customer.subscription.deleted
- [x] zapi.test.ts: corrigir teste de roteamento — banco indisponível agora lança erro (sem fallback para FREE)
- [x] 156 testes passando, TypeScript sem erros

## WhatsApp.tsx — Melhorias de Exibição e Webhook (v-atual)
- [x] Passar origin ao chamar zapiGetQrCode: useState(() => window.location.origin) e input { origin: zapiOrigin }
- [x] Exibir número conectado (zapiStatus.phoneNumber) no CardDescription da seção PRO quando conectado

## WhatsApp — Nome do Dispositivo Conectado (v-atual)
- [x] Backend zapiGetStatus: retornar deviceName (pushName) junto com phoneNumber
- [x] Página WhatsApp PRO: CardDescription exibe "Nome · Número" quando conectado
- [x] Sidebar AdminLayout: tooltip exibe "Nome · Número" (ou apenas o disponível)

## WhatsApp — Placeholder no Campo de Teste (v-atual)
- [x] Card "Enviar mensagem de teste": placeholder dinâmico com número conectado (PRO: zapiStatus.phoneNumber, Baileys: baileysData.phoneNumber)
- [x] CardDescription exibe "Número conectado: Nome · Número" para plano PRO

## Integração OpenAI (2026-04-21)
- [x] Adicionar OPENAI_API_KEY como secret no projeto
- [x] Criar server/openai.ts com helper invokeOpenAI (suporte a multimodal e json_schema)
- [x] Substituir invokeLLM por invokeOpenAI em iaClientes.ts, iaFinanceiro.ts, pipeline.ts, suporte.ts e routers.ts
- [x] Auto-selecionar gpt-4o quando há imagens no conteúdo (análise de comprovante), gpt-4o-mini para texto
- [x] Atualizar mocks nos testes para apontar para ./openai
- [x] 156 testes passando, TypeScript sem erros

## Status "Agendado" na Fila de Envios (2026-04-21)
- [ ] Schema: verificar enum status em historicoEnvios e adicionar valor "agendado" se necessário
- [ ] Backend: gravar status="agendado" ao inserir mensagem com dataEnvio no futuro
- [ ] Frontend: badge "Agendado" com cor azul/roxo distinta na tela de fila de envios
- [ ] Frontend: filtro por status incluindo "Agendado"

## Status "Agendado" na Fila de Envios (2026-04-21)
- [x] Adicionar 'agendado' ao enum de status no schema e migration SQL aplicada
- [x] Lógica automática em registrarEnvioAutomacao: enviarEm > 60s no futuro → status 'agendado'
- [x] Scheduler: expirar e processar também registros com status 'agendado'
- [x] Frontend: badge azul Agendado com ícone CalendarCheck, card contador, filtro no Select e cancelamento de agendados
- [x] Backend: getFilaEnvios e getFilaTotais suportam status 'agendado' com contador separado

## Melhorias Caixa de Saída (2026-04-21)
- [x] Badge de agendados do dia na sidebar (ícone Automações)
- [x] Notificação in-app ao enviar item com status agendado com sucesso
- [x] Opção "Reagendar para amanhã" na modal de falha

## Auditoria Completa do Fluxo de Automações (2026-04-21)
- [ ] Seletor de delay (1h/6h/24h/48h) na modal de reagendar
- [ ] Auditar registrarEnvioAutomacao e todos os pontos de disparo
- [ ] Auditar scheduler: processarFilaEnvios, expiração, horário permitido
- [ ] Auditar router WhatsApp: routedSendMessage, fallback, planos
- [ ] Auditar triggers: agendamento_criado, lembrete, confirmacao, aniversario, data_comemorativa
- [ ] Corrigir problemas encontrados
- [ ] Relatório completo entregue

## Timezone, Índice Único e Texto Real no Pré-registro (2026-04-21)
- [x] Adicionar campo timezone na tabela empresas (default America/Sao_Paulo)
- [x] Adicionar índice único (empresaId, automacaoId, agendamentoId) em historicoEnviosAutomacao
- [x] Usar timezone da empresa no scheduler para comparação de horaDisparo
- [x] Gerar texto real da mensagem no pré-registro em vez de placeholder
- [x] Seletor de timezone nas configurações da empresa (frontend)

## Auditoria Completa do Módulo Financeiro (2026-04-21)
- [ ] Auditar schema financeiro (tabelas, campos, enums)
- [ ] Auditar routers financeiros (procedures, cálculos de comissão)
- [ ] Auditar frontend financeiro (páginas, componentes, fluxos)
- [ ] Auditar integrações (Stripe, taxas de maquininha, percentuais)
- [ ] Relatório completo com achados, problemas e recomendações

## Correções Financeiras (2026-04-21)
- [x] R3: Corrigir fallback de percentual (usar 0 em vez de percentualDona)
- [x] R4: Validar soma percentualComissao + percentualDona <= 100%
- [x] R1: Corrigir taxa de maquininha no fluxo automático (consultar agendamentoPagamentos)
- [x] R2: Conectar meios de pagamento configurados (taxasParcela) aos cálculos
- [x] R5: Persistir meioPagamentoId em contasPagar e contasReceber (schema + frontend)
- [x] R6: Geração automática de recorrências no scheduler
- [x] R7: Prevenir duplicatas na importação de agendamentos para contas a receber
- [x] R8: Dashboard financeiro consolidado com fluxo de caixa

## Melhorias Mobile (2026-04-21)
- [x] Ocultar badge de plano no header mobile
- [x] Exibir nome da empresa abaixo do logo no header mobile
- [x] Bottom nav fixa no mobile (Dashboard, Agenda, Clientes, Financeiro)

## Melhorias Mobile 2 (2026-04-21)
- [x] Bottom nav: botão + central destacado para novo agendamento
- [x] Header mobile: avatar do usuário logado ao lado das notificações
- [x] Swipe gesture para abrir sidebar no mobile

## Melhorias Mobile 3 (2026-04-21)
- [x] Swipe para fechar sidebar (gesto direita → esquerda dentro da sidebar)
- [x] Badge de pré-agendamentos pendentes no ícone Agenda da bottom nav
- [x] Haptic feedback (navigator.vibrate) no botão + da bottom nav

## Melhorias Mobile 4 (2026-04-21)
- [x] Tela de pré-agendamentos pendentes (/admin/pre-agendamentos) com confirmar/cancelar em 1 toque
- [x] Badge da bottom nav navega para /admin/pre-agendamentos ao clicar
- [x] Pull-to-refresh na main do AdminLayout (mobile)
- [x] Notificação push ao criar pré-agendamento pelo portal

## Bugs Críticos de Automações (2026-04-21)
- [x] Relatório detalhado de diagnóstico e correções propostas
- [x] Bug 1a: horas_apos_agendamento — filtrar apenas status='concluido'
- [x] Bug 1b: dias_depois_agendamento — filtrar apenas status='concluido'
- [x] Bug 1c: preRegistrarEnviosPendentes — não pré-registrar feedback para agendamentos não concluídos
- [x] Bug 2a: enviarLembretesAgendamentos — pular empresa se já tem automação dias_antes_agendamento
- [x] Bug 2b: enviarLembretesAgendamentos — adicionar deduplicação via jaEnviouLembrete
- [x] Bug 3a: verificarCondicoesFlow — aceitar todosServicos[] como parâmetro
- [x] Bug 3b: scheduler — buscar itens compostos de cada agendamento para lista completa de serviços
- [x] Bug 3c: db.ts — criar getAutomacoesByEvento que retorna todas as automações ativas
- [x] Bug 3d: routers.ts — iterar sobre todas as automações por evento com filtro de serviço individual

## Remoção do Lembrete Legado (2026-04-21)
- [x] Remover função enviarLembretesAgendamentos do scheduler.ts
- [x] Remover cron que chama enviarLembretesAgendamentos
- [ ] Validar que todas as empresas tém automação dias_antes_agendamento

## Templates de Automação Default (2026-04-21)
- [x] Adicionar campo isTemplate na tabela automacoes + migração
- [x] Criar server/automation-templates.ts com 8 templates default
- [x] Provisionar automações default ao criar empresa (apenas novas empresas)
- [x] Marcar isTemplate=false ao editar automação manualmente
- [x] Badge "Padrão" na UI para automações de template
- [x] Gerar pipeline automaticamente ao provisionar automações default

## Preview de Mensagem na Lista de Automações (2026-04-21)
- [x] Função para extrair preview (primeiras 80 caracteres) da mensagem
- [x] Exibir preview abaixo do gatilho na lista de automações

## Filtro por Tipo de Gatilho (2026-04-21)
- [x] Adicionar estado de filtro e abas de tipo de gatilho
- [x] Filtrar automações por tipo selecionado

## Teste Rápido de Automação (2026-04-21)
- [x] Criar procedure enviarTesteAutomacao no router
- [x] Adicionar modal de seleção de cliente de teste
- [x] Adicionar botão Enviar teste na lista de automações

## Restrição de 1 Pipeline por Empresa (2026-04-21)
- [x] Remover botão "Nova automação" da UI
- [x] Bloquear criação de segunda pipeline (validação no router)
- [x] Remover botão de exclusão de automações
- [x] Impedir que todas as automações sejam deletadas

## Correção Webhook Stripe em Produção (2026-04-21)
- [x] Investigar logs e diagnosticar erro do webhook (29 falhas desde 18/04)
- [x] Corrigir implementação do endpoint /api/stripe/webhook
- [x] Testar webhook localmente e em produção
- [x] Validar que Stripe recebe HTTP 200-299

## Simplificação da Tela Pipeline (2026-04-21)
- [x] Remover botão "Novo pipeline" da tela Pipeline
- [x] Remover botão de favoritar (estrela) da pipeline
- [x] Remover estilo de seleção (botão azul clicável) — exibir nome da pipeline como título fixo

## Ajustes na Tela de Automações (2026-04-21)
- [x] Remover botão de segmentação (ícone grupo de pessoas) da lista de automações
- [x] Corrigir botão de teste de automação para efetivamente disparar um envio de teste

## Melhorias no Teste de Automações (2026-04-21)
- [x] Pré-preencher telefone do usuário logado no modal de teste
- [x] Spinner no botão de teste enquanto o envio está sendo processado
- [x] Filtro "Apenas testes" na aba Histórico de automações

## Correção do Link de Confirmação nos Testes (2026-04-21)
- [x] Investigar como o link de confirmação é gerado nas variáveis de teste
- [x] Corrigir para usar o domínio correto hubly.orizontech.com.br

## Expiração do Link de Confirmação (2026-04-21)
- [x] Verificar estrutura atual dos tokens de confirmação no schema e backend
- [x] Adicionar campo expiresAt (48h) na geração do token
- [x] Validar expiração e uso único no procedure verificarToken
- [x] Atualizar página de confirmação do cliente com mensagem de link expirado/já utilizado

## Confirmação Automática Configurável e Notificação ao Admin (2026-04-21)
- [x] Adicionar campos confirmacaoAutoAtivo e confirmacaoAutoHorasAntes na tabela automações (schema + migração)
- [x] Backend: job periódico que confirma agendamentos automaticamente quando faltam X horas
- [x] Backend: notificação in-app ao admin/profissional quando cliente confirma pelo link
- [x] UI: painel de configuração de confirmação automática no editor de automações (tipo horas_antes_agendamento)

## Redesenho Mobile do Editor de Automações (2026-04-21)
- [x] Substituir canvas visual por interface em lista de nós no mobile
- [x] Configuração de nós via bottom sheet ao tocar no card
- [x] Painel de configuração de nó em bottom sheet no mobile

## Testes da Fila de Envios e Gatilhos de Automação (2026-04-22)
- [ ] Testes unitários: gatilho evento_agendamento_criado
- [ ] Testes unitários: gatilho evento_agendamento_confirmado
- [ ] Testes unitários: gatilho evento_agendamento_cancelado
- [ ] Testes unitários: gatilho horas_antes_agendamento
- [ ] Testes unitários: gatilho aniversario_cliente
- [ ] Testes unitários: gatilho data_fixa
- [ ] Testes da fila: enfileirar envio, processar, marcar como enviado
- [ ] Testes da fila: falha no envio, retentativa, expiração de 4h
- [ ] Testes da fila: prioridade de pre_agendado vs agendado_criado
- [ ] Testes de substituição de variáveis dinâmicas na mensagem

## Correção do Fluxo de Reserva Recebida (2026-04-22)
- [x] Corrigir atualização de status do pré-agendamento para "agendado" ao confirmar reserva
- [x] Corrigir abatimento do valor da reserva do saldo devedor do agendamento

## Remoção de Mensagens Hardcoded (2026-04-22)
- [x] Remover fallback hardcoded de dias_antes_agendamento no scheduler.ts
- [x] Remover fallback hardcoded de horas_antes_agendamento no scheduler.ts
- [x] Remover fallback hardcoded de horas_apos_agendamento no scheduler.ts
- [x] Remover fallback hardcoded de dias_depois_agendamento no scheduler.ts
- [x] Remover fallback hardcoded de aniversario no scheduler.ts
- [x] Remover fallback hardcoded de horario_fixo/data_fixa no scheduler.ts
- [x] Remover fallback hardcoded de pre_agendamento_cancelado no scheduler.ts
- [x] Remover fallback hardcoded de preRegistrarEnviosPendentes no scheduler.ts
- [x] Remover mensagens padrão hardcoded na criação de agendamento (routers.ts)
- [x] Remover bloco de mensagens padrão hardcoded para confirmado/cancelado/concluido (routers.ts)
- [x] Regra: se não há automação configurada ou corpoMensagem vazio → não enviar nada (continue/ignorar)

## Sidebar Branca e Limpeza de Enviados (2026-04-22)
- [x] Mudar sidebar de cor escura para branca no AdminLayout.tsx
- [x] Atualizar cores dos itens de menu para tema claro (texto cinza, hover cinza claro, active azul)
- [x] Atualizar cores dos badges (notificações, WhatsApp, automações) para tema claro
- [x] Adicionar mutation limparEnviados no backend (routers.ts) com filtro por período e automação
- [x] Adicionar UI de limpeza de enviados com filtro e modal de confirmação no FilaAutomacoes.tsx
- [x] Botão "Limpar enviados" aparece apenas quando há registros com status=enviado
- [x] Modal mostra filtros atuais (período, automação) antes de confirmar
- [x] Ação é irreversível (aviso no modal)

## Remoção do Botão Flutuante de Suporte (2026-04-22)
- [x] Remover botão flutuante de suporte (MessageCircle) da interface

## Modal de Confirmação ao Gerar Pipeline com IA (2026-04-22)
- [x] Adicionar aviso de confirmação ao modal de "Gerar pipeline com IA"
- [x] Aviso informa que a pipeline atual será atualizada se existir
- [x] Nota esclarecida sobre criação vs atualização de pipeline

## Preview e Restauração de Pipeline (2026-04-22)
- [x] Adicionar procedure previewPipelinePorIA no backend (retorna colunas/cartões sem salvar)
- [x] Adicionar tabela pipelineSnapshots no banco para salvar versões anteriores
- [x] Salvar snapshot após cada geração de pipeline
- [x] Adicionar procedure restaurarPipelineSnapshot no backend
- [x] Implementar UI de preview no modal (mostrar colunas antes de confirmar)
- [x] Implementar UI de histórico/restauração de pipeline

## Verificação de Duplicidade ao Salvar Automação (2026-04-22)
- [x] Implementar lógica de detecção de duplicidade no backend (mesmos campos-chave)
- [x] Retornar aviso com nome da automação duplicada ao salvar
- [x] Adicionar modal de aviso no frontend informando a automação conflitante

## Unificação Debug + Histórico de Envios (2026-04-22)
- [x] Adicionar detalhe de erro expansível no Histórico de Envios
- [x] Adicionar conteúdo da mensagem ao expandir item no Histórico
- [x] Adicionar toggle "Ao vivo" no Histórico (refetch a cada 5s)
- [x] Remover botão Debug do header de Automações
- [x] Remover componente DebugAutomacoesModal

## Bug: Filtro de Serviço nas Automações de Feedback (2026-04-22)
- [ ] Investigar onde o filtro servicoId/servicoNome não está sendo aplicado no scheduler
- [ ] Corrigir a lógica para disparar apenas a automação cujo serviço corresponde ao agendamento

## Bug: Variáveis de Template nas Automações (2026-04-22)
- [x] Auditar todos os templates de automação no banco buscando variáveis mal formatadas
- [x] Corrigir automação "Agendado amanhã" (ID 30001): {[data}} → {{data}}

## Editor de Variáveis como Chips Visuais (2026-04-22)
- [x] Criar componente VariableEditor com chips não editáveis para variáveis {{variavel}}
- [x] Integrar no editor de mensagem das automações
- [x] Garantir que o valor salvo no banco continue sendo texto com {{variavel}}
