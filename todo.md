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
