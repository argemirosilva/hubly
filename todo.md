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
