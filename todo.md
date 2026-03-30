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
