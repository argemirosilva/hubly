# Documento de Requisitos — Hubly (Agendei)

## Introdução

Hubly é uma plataforma SaaS brasileira para gestão de negócios de beleza e estética (salões, clínicas, barbearias, consultórios). O sistema oferece agendamento, gestão de clientes, financeiro, equipe, automações via WhatsApp, inteligência artificial, portal público de agendamento e assinatura com planos escalonados. A arquitetura é monorepo (client/server/shared) com multi-tenancy por empresa, usando React 19 + tRPC 11 + Drizzle ORM + MySQL.

## Glossário

- **Sistema**: A plataforma Hubly como um todo (frontend + backend + banco de dados)
- **Empresa**: Entidade principal de isolamento multi-tenant; representa um salão, clínica ou barbearia cadastrada
- **Owner**: Usuário proprietário da Empresa, autenticado via OAuth (Manus), com acesso total
- **Profissional**: Registro na tabela `profissionais` que pode representar um prestador de serviço (isProfissional=true) e/ou um usuário do sistema (temAcesso=true)
- **SystemUser**: Profissional com temAcesso=true que faz login via email/senha (autenticação dual)
- **Cliente**: Pessoa física cadastrada na Empresa que recebe serviços
- **Agendamento**: Registro de um atendimento marcado, com data, hora, profissional, serviço(s) e status
- **Serviço**: Tipo de atendimento oferecido pela Empresa (ex: corte, coloração, manicure)
- **Comissão**: Valor calculado para o Profissional com base no serviço prestado
- **Automação**: Regra configurável que dispara mensagens automáticas via WhatsApp/email/SMS
- **Pacote**: Conjunto de sessões de serviços vendido ao Cliente com validade
- **Pipeline**: Quadro Kanban para gestão de leads/clientes
- **Portal_Público**: Interface web pública para agendamento online pelo Cliente
- **Scheduler**: Processo agendado que roda a cada 15 minutos para lembretes, automações e recálculos
- **Plano**: Nível de assinatura da Empresa (FREE, SOLO, PLUS, PRO) com limites específicos
- **Score_Financeiro**: Pontuação de 0 a 100 calculada por IA para saúde financeira da Empresa
- **Prontuário**: Registro médico/estético vinculado ao Cliente (anamnese, evolução, fotos, documentos)
- **Grupo_Permissões**: Conjunto nomeado de permissões granulares atribuído a Profissionais com acesso
- **WhatsApp_Manager**: Módulo de integração WhatsApp via Baileys com persistência de sessão no banco
- **Bloqueio**: Período de indisponibilidade na agenda de um Profissional
- **Reserva**: Pagamento antecipado parcial para confirmar um Agendamento

## Requisitos

### Requisito 1: Autenticação Dual (OAuth + Email/Senha)

**User Story:** Como Owner ou Profissional, quero acessar o sistema de forma segura, para que eu possa gerenciar minha empresa ou realizar minhas tarefas.

#### Critérios de Aceitação

1. WHEN um Owner acessa a plataforma, THE Sistema SHALL autenticar o Owner via OAuth (Manus) e criar uma sessão com cookie seguro
2. WHEN um SystemUser fornece email e senha válidos, THE Sistema SHALL autenticar o SystemUser via bcrypt e criar uma sessão com cookie `system_session`
3. IF um SystemUser fornecer credenciais inválidas, THEN THE Sistema SHALL retornar erro de autenticação sem revelar qual campo está incorreto
4. WHEN um SystemUser autenticado faz uma requisição, THE Sistema SHALL resolver o contexto tRPC com os dados do Profissional vinculado (empresaId, permissões, profissionalId)
5. WHEN um Owner autenticado faz uma requisição, THE Sistema SHALL conceder acesso total a todas as funcionalidades da Empresa
6. WHEN o usuário solicita logout, THE Sistema SHALL limpar o cookie de sessão correspondente (OAuth ou system_session)

### Requisito 2: Gestão de Empresas (Multi-Tenant)

**User Story:** Como Owner, quero cadastrar e configurar minha empresa, para que o sistema funcione de acordo com meu negócio.

#### Critérios de Aceitação

1. WHEN um Owner autenticado sem empresa cadastrada envia os dados de criação, THE Sistema SHALL criar uma Empresa vinculada ao Owner com tipo (salão, clínica, barbearia, consultório, outro)
2. THE Sistema SHALL isolar todos os dados por empresaId, garantindo que nenhuma Empresa acesse dados de outra
3. WHEN o Owner atualiza as configurações da Empresa, THE Sistema SHALL persistir campos de personalização incluindo cores (corPrimaria, corSecundaria), logo, horário de funcionamento (horaAbertura, horaFechamento), dias de funcionamento, intervalo de minutos e templates de mensagem WhatsApp
4. WHEN o Owner configura o portal público, THE Sistema SHALL validar que o slug é único entre todas as Empresas
5. WHEN o Owner faz upload de logo ou capa, THE Sistema SHALL armazenar o arquivo no AWS S3 e atualizar a URL na Empresa

### Requisito 3: Gestão de Profissionais

**User Story:** Como Owner, quero cadastrar e gerenciar os profissionais da minha equipe, para que eles possam atender clientes e acessar o sistema.

#### Critérios de Aceitação

1. WHEN o Owner cria um Profissional, THE Sistema SHALL registrar nome, email, telefone, especialidade, cor do calendário e vincular à Empresa
2. WHEN o Owner ativa o acesso ao sistema para um Profissional (temAcesso=true), THE Sistema SHALL permitir definir senha e grupo de permissões para login via email/senha
3. THE Sistema SHALL distinguir entre Profissionais que aparecem na agenda (isProfissional=true) e usuários administrativos que apenas acessam o sistema (isProfissional=false)
4. WHEN o Owner atribui um Grupo_Permissões a um Profissional, THE Sistema SHALL aplicar as permissões granulares do grupo ao acesso do Profissional
5. WHEN o plano da Empresa atinge o limite de profissionais, THE Sistema SHALL impedir a criação de novos Profissionais e exibir mensagem orientando upgrade
6. WHEN o Owner desativa um Profissional (ativo=false), THE Sistema SHALL impedir que o Profissional apareça em novos agendamentos mantendo o histórico existente

### Requisito 4: Sistema de Permissões Granulares

**User Story:** Como Owner, quero controlar exatamente o que cada membro da equipe pode fazer, para que eu mantenha segurança e organização.

#### Critérios de Aceitação

1. THE Sistema SHALL suportar Grupos_Permissões com mais de 50 permissões booleanas organizadas por módulo (agendamentos, clientes, profissionais, serviços, financeiro, bloqueios, automações, notificações, relatórios, configurações, usuários, dashboard)
2. WHEN um SystemUser realiza uma ação protegida, THE Sistema SHALL verificar a permissão correspondente no Grupo_Permissões vinculado ao Profissional
3. IF um SystemUser não possuir a permissão necessária, THEN THE Sistema SHALL retornar erro FORBIDDEN com mensagem indicando a permissão faltante
4. WHEN o Owner cria um Grupo_Permissões, THE Sistema SHALL permitir definir nome, descrição, cor e todas as permissões booleanas individualmente
5. THE Sistema SHALL permitir que o Owner defina um grupo como padrão (isDefault) para novos membros da Empresa

### Requisito 5: Gestão de Clientes

**User Story:** Como Owner ou Profissional autorizado, quero cadastrar e gerenciar clientes, para que eu tenha um histórico completo de cada pessoa atendida.

#### Critérios de Aceitação

1. WHEN um usuário autorizado cria um Cliente, THE Sistema SHALL registrar nome, email, telefone, WhatsApp, CPF, data de nascimento, endereço, observações e tags
2. THE Sistema SHALL manter contadores automáticos de totalGasto, totalAtendimentos e ultimoAtendimento para cada Cliente
3. WHEN um Cliente é criado com telefone/WhatsApp, THE Sistema SHALL disparar a automação `cliente_criado` se configurada pela Empresa
4. WHEN um usuário autorizado adiciona um Prontuário ao Cliente, THE Sistema SHALL registrar título, conteúdo, tipo (anamnese, evolução, foto, documento, contrato, outro) e opcionalmente vincular a um Agendamento e Profissional
5. WHEN um usuário faz upload de arquivo para o Prontuário, THE Sistema SHALL armazenar o arquivo no AWS S3 e vincular URL, chave, nome e tipo ao registro
6. WHEN um Cliente é excluído (soft delete via ativo=false), THE Sistema SHALL manter todos os dados históricos e permitir restauração
7. THE Sistema SHALL suportar classificação de Clientes por tags personalizáveis e saldo de sessões de pacotes

### Requisito 6: Gestão de Serviços

**User Story:** Como Owner, quero cadastrar os serviços oferecidos pelo meu negócio, para que eles possam ser agendados e precificados corretamente.

#### Critérios de Aceitação

1. WHEN o Owner cria um Serviço, THE Sistema SHALL registrar nome, descrição, valor, duração em minutos, categoria, cor, percentual de comissão e custo fixo de insumos
2. THE Sistema SHALL suportar vínculo N:N entre Profissionais e Serviços via tabela profissionalServicos
3. WHEN um SystemUser sem permissão de edição de serviços lista os serviços, THE Sistema SHALL ocultar os campos custoFixo e percentualComissao dos serviços que não são do Profissional
4. THE Sistema SHALL disponibilizar uma listagem pública de serviços (sem autenticação) para uso no Portal_Público
5. WHEN o Owner desativa um Serviço (ativo=false), THE Sistema SHALL impedir que o Serviço apareça em novos agendamentos mantendo o histórico existente

### Requisito 7: Agendamentos

**User Story:** Como Owner ou Profissional autorizado, quero criar e gerenciar agendamentos, para que os atendimentos sejam organizados e rastreados.

#### Critérios de Aceitação

1. WHEN um usuário autorizado cria um Agendamento, THE Sistema SHALL registrar empresaId, clienteId, profissionalId, servicoId, data, horaInicio, horaFim, valorTotal e status inicial
2. THE Sistema SHALL suportar o fluxo de status: pre_agendado → aguardando_reserva → agendado → confirmado → em_andamento → concluido, com transições alternativas para cancelado e faltou
3. WHEN um Agendamento é criado, THE Sistema SHALL permitir adicionar múltiplos serviços via agendamento_itens, cada um com valorUnitario e opcionalmente vinculado a um item de pacote
4. WHEN um Agendamento é criado, THE Sistema SHALL permitir registrar múltiplos pagamentos via agendamento_pagamentos com valor, meio de pagamento e número de parcelas
5. WHEN o status de um Agendamento muda, THE Sistema SHALL disparar automações configuradas para o evento correspondente (ex: agendamento_confirmado, agendamento_cancelado)
6. WHEN um Agendamento é confirmado, THE Sistema SHALL registrar a data/hora de confirmação (confirmadoEm)
7. WHEN um Agendamento é concluído, THE Sistema SHALL registrar a data/hora de conclusão (concluidoEm) e calcular comissões automaticamente
8. THE Sistema SHALL suportar desconto por Agendamento e observações internas visíveis apenas para a equipe
9. WHEN o plano da Empresa atinge o limite mensal de agendamentos, THE Sistema SHALL impedir a criação de novos Agendamentos e exibir mensagem orientando upgrade
10. WHEN um Agendamento é excluído, THE Sistema SHALL remover o Agendamento, seus itens e pagamentos associados e decrementar o contador de uso mensal

### Requisito 8: Sistema de Reservas

**User Story:** Como Owner, quero exigir um pagamento antecipado para confirmar agendamentos, para que eu reduza faltas e cancelamentos de última hora.

#### Critérios de Aceitação

1. WHEN a Empresa configura reservaPercentual maior que zero, THE Sistema SHALL calcular o valorReserva como percentual do valorTotal do Agendamento
2. WHEN um Agendamento com reserva é criado, THE Sistema SHALL definir status aguardando_reserva e calcular reservaExpiracaoEm baseado em reservaHorasExpiracao da Empresa
3. WHEN o pagamento da reserva é registrado, THE Sistema SHALL atualizar reservaPaga=true, reservaPagaEm e transicionar o status para agendado
4. IF a reserva não for paga até reservaExpiracaoEm, THEN THE Sistema SHALL notificar sobre a expiração da reserva

### Requisito 9: Calendário e Visualização de Agenda

**User Story:** Como Owner ou Profissional, quero visualizar a agenda em formato de calendário, para que eu tenha uma visão clara dos atendimentos do dia.

#### Critérios de Aceitação

1. THE Sistema SHALL exibir agendamentos em visualização de calendário com cores por status configuráveis pela Empresa (via tabela cores_status)
2. WHEN um SystemUser sem permissão agendamentosVerTodos acessa o calendário, THE Sistema SHALL filtrar para exibir apenas os agendamentos do Profissional logado
3. WHEN um Owner ou SystemUser com permissão agendamentosVerTodos acessa o calendário, THE Sistema SHALL exibir agendamentos de todos os Profissionais com cores distintas por profissional (corCalendario)
4. THE Sistema SHALL exibir bloqueios de agenda sobrepostos ao calendário para indicar indisponibilidade

### Requisito 10: Bloqueios de Agenda

**User Story:** Como Profissional, quero bloquear horários na minha agenda, para que clientes não sejam agendados em períodos de indisponibilidade.

#### Critérios de Aceitação

1. WHEN um Profissional solicita um bloqueio, THE Sistema SHALL registrar dataInicio, horaInicio, dataFim, horaFim, motivo e status pendente
2. WHEN o Owner aprova um bloqueio, THE Sistema SHALL atualizar o status para aprovado e registrar aprovadoPorId
3. IF o Owner recusa um bloqueio, THEN THE Sistema SHALL atualizar o status para recusado e registrar motivoRecusa
4. THE Sistema SHALL gerar notificações para o Profissional quando um bloqueio é aprovado ou recusado
5. WHILE um bloqueio está aprovado, THE Sistema SHALL impedir agendamentos no período bloqueado para o Profissional correspondente

### Requisito 11: Financeiro — Comissões

**User Story:** Como Owner, quero calcular e rastrear comissões dos profissionais automaticamente, para que o pagamento da equipe seja justo e transparente.

#### Critérios de Aceitação

1. WHEN um Agendamento é concluído, THE Sistema SHALL calcular a comissão usando: valorServico, percentualComissao (do serviço ou do profissional), tipoPagamento, taxaMaquininha, custoReposicao, resultando em valorLiquido, valorComissao e receitaDona
2. THE Sistema SHALL suportar percentual de comissão configurável por Serviço e por Profissional (percentualComissao)
3. THE Sistema SHALL suportar percentualDona configurável na Empresa para cálculo da receita da proprietária
4. WHEN o Owner marca comissões como pagas, THE Sistema SHALL registrar paga=true e pagaEm com timestamp
5. WHERE o plano da Empresa inclui a feature comissões, THE Sistema SHALL disponibilizar a visualização detalhada de comissões por profissional e período

### Requisito 12: Financeiro — Contas a Pagar e Receber

**User Story:** Como Owner, quero gerenciar contas a pagar e receber, para que eu tenha controle completo do fluxo de caixa.

#### Critérios de Aceitação

1. WHEN o Owner cria uma conta a pagar, THE Sistema SHALL registrar descrição, valor, data de vencimento, categoria de despesa, status de pagamento e meio de pagamento
2. WHEN o Owner cria uma conta a receber, THE Sistema SHALL registrar descrição, valor, data de vencimento, cliente vinculado e status de recebimento
3. THE Sistema SHALL calcular métricas de contas a pagar (total pendente, total pago, total vencido) e contas a receber (total a receber, total recebido)
4. WHEN o Owner solicita importação de agendamentos para contas a receber, THE Sistema SHALL criar registros de contas a receber baseados nos agendamentos concluídos
5. THE Sistema SHALL suportar categorias de despesa personalizáveis por Empresa

### Requisito 13: Financeiro — Meios de Pagamento e Taxas

**User Story:** Como Owner, quero configurar meios de pagamento e suas taxas, para que o cálculo de comissões e receita líquida seja preciso.

#### Critérios de Aceitação

1. WHEN o Owner cria um meio de pagamento, THE Sistema SHALL registrar nome, tipo e status ativo
2. THE Sistema SHALL suportar configuração de taxas por parcela para cada meio de pagamento (via tabela taxas_parcela)
3. WHEN um pagamento é registrado em um Agendamento, THE Sistema SHALL aplicar a taxa correspondente ao meio de pagamento e número de parcelas selecionados
4. THE Sistema SHALL suportar os tipos de pagamento: dinheiro, PIX, cartão de débito, cartão de crédito e outro

### Requisito 14: Dashboard e Métricas

**User Story:** Como Owner ou Profissional autorizado, quero visualizar métricas do negócio em um dashboard, para que eu tome decisões informadas.

#### Critérios de Aceitação

1. THE Sistema SHALL calcular e exibir métricas de dashboard incluindo agendamentos do dia, receita do período, clientes ativos e taxa de ocupação
2. WHEN um SystemUser sem permissão dashboardVerMetricas acessa o dashboard, THE Sistema SHALL exibir apenas métricas do próprio Profissional
3. THE Sistema SHALL suportar configuração personalizada do dashboard por usuário (via tabela dashboard_config) com visibilidade, ordem e tamanho dos widgets
4. WHEN o usuário salva a configuração do dashboard, THE Sistema SHALL persistir as preferências vinculadas ao userId e empresaId

### Requisito 15: Integração WhatsApp (Baileys)

**User Story:** Como Owner, quero conectar o WhatsApp da empresa ao sistema, para que mensagens automáticas sejam enviadas aos clientes.

#### Critérios de Aceitação

1. WHEN o Owner solicita conexão do WhatsApp, THE WhatsApp_Manager SHALL gerar um QR Code e exibir para escaneamento
2. WHEN o QR Code é escaneado com sucesso, THE WhatsApp_Manager SHALL estabelecer conexão, salvar credenciais no banco (tabela wa_session) e registrar o número conectado
3. WHILE o WhatsApp está conectado, THE WhatsApp_Manager SHALL manter a conexão ativa com keepAlive a cada 25 segundos
4. IF a conexão WhatsApp cair por motivo diferente de logout, THEN THE WhatsApp_Manager SHALL reconectar automaticamente com backoff exponencial (15s, 30s, 60s, 120s, 300s) até o máximo de 10 tentativas
5. IF o usuário deslogar do WhatsApp pelo dispositivo, THEN THE WhatsApp_Manager SHALL limpar a sessão do banco e definir status como logged_out
6. WHEN o servidor é reiniciado, THE WhatsApp_Manager SHALL verificar se há sessão salva no banco e reconectar automaticamente
7. WHEN uma mensagem de texto é enviada, THE WhatsApp_Manager SHALL formatar o número com código do país 55 (Brasil) e enviar via protocolo WhatsApp
8. THE WhatsApp_Manager SHALL suportar envio de mídia (imagens e documentos PDF) além de mensagens de texto
9. THE Sistema SHALL registrar eventos de conexão (connected, disconnected, qr_ready, logged_out, reconnecting) na tabela wa_connection_log mantendo os últimos 50 registros

### Requisito 16: Automações

**User Story:** Como Owner, quero configurar mensagens automáticas baseadas em eventos e datas, para que meus clientes recebam comunicações no momento certo sem intervenção manual.

#### Critérios de Aceitação

1. THE Sistema SHALL suportar automações com gatilhos do tipo: evento (mudança de status), data_fixa, aniversario_mes, dias_antes_agendamento, horas_antes_agendamento, horas_apos_agendamento e dias_depois_agendamento
2. WHEN uma automação do tipo evento é configurada, THE Sistema SHALL disparar a mensagem quando o evento correspondente ocorrer (ex: agendamento_confirmado, agendamento_cancelado, cliente_criado)
3. WHEN uma automação do tipo dias_antes_agendamento é configurada, THE Scheduler SHALL verificar a cada 15 minutos se há agendamentos na data alvo e disparar na hora configurada (horaDisparo)
4. WHEN uma automação do tipo horas_antes_agendamento é configurada, THE Scheduler SHALL calcular o timestamp exato de disparo (horário do agendamento menos delayMinutos) e disparar dentro da janela de 15 minutos
5. WHEN uma automação do tipo horas_apos_agendamento é configurada, THE Scheduler SHALL calcular o timestamp exato de disparo (horário do agendamento mais delayMinutos) e disparar dentro da janela de 15 minutos
6. THE Sistema SHALL suportar variáveis de template nas mensagens: {{nome_cliente}}, {{primeiro_nome}}, {{servico}}, {{data}}, {{hora}}, {{profissional}}, {{empresa}}, {{valor}}, {{valor_reserva}}, {{link_confirmacao}}
7. THE Sistema SHALL suportar canais de envio: WhatsApp, email e SMS
8. THE Sistema SHALL suportar segmentação de automações por: todas, por_profissional ou por_tag
9. THE Sistema SHALL registrar cada envio no histórico (tabela historico_envios_automacao) com status enviado, falhou ou pendente
10. THE Sistema SHALL implementar deduplicação de envios por automacaoId + agendamentoId para evitar mensagens duplicadas
11. WHEN o WhatsApp não está conectado no momento do disparo, THE Sistema SHALL enfileirar a mensagem como pendente para envio posterior

### Requisito 17: Lembretes Automáticos de Agendamento

**User Story:** Como Owner, quero que meus clientes recebam lembretes automáticos do agendamento do dia seguinte, para que reduzam faltas.

#### Critérios de Aceitação

1. THE Scheduler SHALL executar verificação de lembretes a cada 15 minutos
2. WHEN há agendamentos para o dia seguinte com status agendado ou confirmado, THE Scheduler SHALL enviar lembrete via WhatsApp para cada Cliente com telefone cadastrado
3. THE Sistema SHALL gerar um link de confirmação único (token) para cada lembrete enviado, permitindo que o Cliente confirme o agendamento via link
4. WHEN a Empresa tem template de lembrete configurado (waMsgLembrete ou automação dias_antes_agendamento), THE Scheduler SHALL usar o template personalizado com substituição de variáveis
5. IF a Empresa não tem template configurado, THEN THE Scheduler SHALL usar a mensagem padrão com detalhes do agendamento

### Requisito 18: Pacotes de Serviços

**User Story:** Como Owner, quero vender pacotes de sessões para clientes, para que eu fidelize clientes e garanta receita antecipada.

#### Critérios de Aceitação

1. WHEN o Owner cria um modelo de pacote, THE Sistema SHALL registrar nome, descrição, valor total, validade em dias e itens (serviços com quantidade)
2. WHEN um pacote é vendido a um Cliente, THE Sistema SHALL criar um registro de pacote_cliente com data de início, data de vencimento calculada e status ativo
3. WHEN uma sessão de pacote é utilizada em um Agendamento, THE Sistema SHALL incrementar quantidadeUsada no item correspondente do pacote_cliente
4. THE Scheduler SHALL verificar pacotes com vencimento próximo (até 7 dias) e gerar notificações de alerta
5. THE Scheduler SHALL verificar pacotes com poucas sessões restantes (1 ou 2) e gerar notificações de alerta
6. THE Sistema SHALL evitar notificações duplicadas verificando se já existe notificação recente (24h para vencimento, 48h para sessões)
7. WHERE o plano da Empresa inclui a feature pacotesServicos, THE Sistema SHALL disponibilizar o módulo de pacotes

### Requisito 19: Portal Público de Agendamento

**User Story:** Como Owner, quero oferecer um portal online para que clientes agendem diretamente, para que eu reduza o trabalho manual de marcação.

#### Critérios de Aceitação

1. WHEN a Empresa ativa o portal (portalAtivo=true) e configura um slug único, THE Portal_Público SHALL estar acessível via URL /agendar/{slug}
2. THE Portal_Público SHALL exibir os serviços ativos da Empresa, profissionais disponíveis e horários livres sem exigir autenticação
3. WHEN um Cliente agenda pelo portal, THE Sistema SHALL criar o Agendamento com status pré-definido (agendado ou pre_agendado conforme configuração)
4. WHERE a Empresa configura autoConfirmarPortal=true, THE Sistema SHALL criar agendamentos do portal com status agendado automaticamente
5. THE Portal_Público SHALL exibir personalização da Empresa: logo, cores, imagem de capa (portalHeaderUrl) e mensagem de boas-vindas (portalMensagemBemVindo)
6. WHERE o plano da Empresa inclui a feature portalCliente, THE Sistema SHALL disponibilizar o portal público

### Requisito 20: Confirmação de Agendamento via Token

**User Story:** Como Cliente, quero confirmar meu agendamento clicando em um link recebido por WhatsApp, para que o processo seja simples e rápido.

#### Critérios de Aceitação

1. WHEN o Sistema gera um link de confirmação, THE Sistema SHALL criar um token único (tabela tokensConfirmacao) vinculado ao agendamentoId e empresaId
2. WHEN o Cliente acessa o link /confirmar/{token}, THE Sistema SHALL validar o token e exibir os detalhes do agendamento
3. WHEN o Cliente confirma o agendamento via link, THE Sistema SHALL atualizar o status para confirmado e registrar confirmadoEm
4. IF o token for inválido ou expirado, THEN THE Sistema SHALL exibir mensagem de erro apropriada

### Requisito 21: IA Financeira

**User Story:** Como Owner, quero receber análises inteligentes sobre a saúde financeira do meu negócio, para que eu tome decisões proativas.

#### Critérios de Aceitação

1. THE Sistema SHALL calcular um Score_Financeiro de 0 a 100 para cada Empresa com status (saudavel, atencao, risco), explicação textual, motivos e dicas de melhoria
2. THE Scheduler SHALL recalcular o Score_Financeiro periodicamente
3. THE Sistema SHALL gerar alertas financeiros proativos com tipos: caixa_negativo, contas_vencendo, inadimplencia, gastos_altos, score_caiu, receita_baixa, concentracao_receita, fluxo_negativo e geral
4. THE Sistema SHALL classificar alertas por prioridade (alta, média, baixa) com título, mensagem e sugestão de ação
5. WHERE o plano da Empresa inclui a feature iaFinanceira, THE Sistema SHALL disponibilizar o módulo de IA financeira

### Requisito 22: IA de Clientes

**User Story:** Como Owner, quero que o sistema analise e classifique meus clientes automaticamente, para que eu identifique oportunidades e riscos.

#### Critérios de Aceitação

1. THE Sistema SHALL classificar Clientes nas categorias: principal, bom_pagador, em_crescimento, em_queda, inativo e outras categorias relevantes
2. THE Sistema SHALL gerar análises por Cliente com dados de frequência, gasto médio, tendência e recomendações
3. THE Sistema SHALL gerar insights agregados sobre a base de clientes da Empresa
4. WHERE o plano da Empresa inclui a feature iaTotal, THE Sistema SHALL disponibilizar o módulo completo de IA de clientes

### Requisito 23: Pipeline Kanban

**User Story:** Como Owner, quero gerenciar leads e oportunidades em um quadro Kanban, para que eu acompanhe o funil de vendas visualmente.

#### Critérios de Aceitação

1. WHEN o Owner cria uma Pipeline, THE Sistema SHALL registrar nome e ordem, vinculada à Empresa
2. THE Sistema SHALL suportar múltiplas colunas por Pipeline com nome, ordem e cor personalizáveis
3. WHEN o Owner cria um cartão na Pipeline, THE Sistema SHALL registrar título, descrição, status (em_andamento, congelado, cancelado, concluido), cliente vinculado, responsável, lembrete, valor e opcionalmente agendamento vinculado
4. THE Sistema SHALL suportar drag-and-drop de cartões entre colunas com atualização de ordem
5. THE Sistema SHALL permitir que a Empresa defina uma Pipeline favorita (pipelineFavoritaId)

### Requisito 24: Notificações do Sistema

**User Story:** Como Profissional, quero receber notificações sobre eventos relevantes, para que eu esteja sempre informado sobre mudanças na agenda e aprovações.

#### Critérios de Aceitação

1. THE Sistema SHALL gerar notificações para eventos: agendamento_criado, agendamento_confirmado, agendamento_cancelado, agendamento_remarcado, bloqueio_aprovado, bloqueio_recusado, bloqueio_solicitado, reserva_expirada, lembrete e sistema
2. WHEN uma notificação é gerada, THE Sistema SHALL registrar empresaId, destinatarioId, tipo, título, mensagem e dados de contexto
3. WHEN o usuário marca uma notificação como lida, THE Sistema SHALL atualizar lida=true e lidaEm
4. THE Sistema SHALL suportar marcar todas as notificações como lidas de uma vez
5. THE Sistema SHALL suportar push notifications via PWA (tabela push_subscriptions e web-push)

### Requisito 25: Assinatura e Planos

**User Story:** Como Owner, quero escolher um plano de assinatura adequado ao meu negócio, para que eu tenha acesso às funcionalidades que preciso.

#### Critérios de Aceitação

1. THE Sistema SHALL oferecer 4 planos: FREE (R$0), SOLO (R$29,90/mês), PLUS (R$69,90/mês) e PRO (R$129,90/mês) com opção de pagamento anual com desconto
2. THE Sistema SHALL aplicar limites por plano: FREE (1 profissional, 15 agendamentos/mês, 10 WhatsApp/mês, 50 clientes), SOLO (1 profissional, ilimitado agendamentos, 100 WhatsApp/mês, ilimitado clientes), PLUS (5 profissionais, 400 WhatsApp/mês), PRO (20 profissionais, 1000 WhatsApp/mês)
3. THE Sistema SHALL controlar acesso a features por plano: iaMarketing (SOLO+), iaFinanceira (PLUS+), iaTotal (PRO), linkPersonalizado (SOLO+), pacotesServicos (SOLO+), comissoes (SOLO+), relatoriosAvancados (SOLO+), multiplosCaixas (PLUS+), portalCliente (SOLO+)
4. WHEN o Owner seleciona um plano pago, THE Sistema SHALL criar uma sessão de checkout no Stripe com o preço correspondente
5. WHEN o Stripe confirma o pagamento via webhook, THE Sistema SHALL atualizar a assinatura da Empresa com plano, status e datas
6. THE Sistema SHALL rastrear uso mensal (agendamentos, WhatsApp, clientes) via tabela usage_tracker e alertar quando próximo dos limites
7. WHEN o uso atinge 80% ou 100% do limite, THE Sistema SHALL gerar alertas de uso para o Owner

### Requisito 26: Relatórios

**User Story:** Como Owner, quero gerar relatórios detalhados sobre o desempenho do negócio, para que eu analise tendências e tome decisões baseadas em dados.

#### Critérios de Aceitação

1. THE Sistema SHALL gerar relatórios financeiros com receita, despesas, lucro líquido e comparativos por período
2. THE Sistema SHALL gerar relatórios de clientes com frequência de visitas, gasto médio e taxa de retenção
3. THE Sistema SHALL gerar relatórios de agendamentos com taxa de ocupação, cancelamentos e faltas por profissional
4. THE Sistema SHALL gerar relatórios de comissões por profissional e período
5. THE Sistema SHALL suportar exportação de relatórios
6. WHERE o plano da Empresa inclui a feature relatoriosAvancados, THE Sistema SHALL disponibilizar relatórios detalhados

### Requisito 27: Onboarding

**User Story:** Como novo Owner, quero ser guiado na configuração inicial do sistema, para que eu comece a usar rapidamente sem confusão.

#### Critérios de Aceitação

1. WHEN um Owner cria uma nova Empresa, THE Sistema SHALL exibir o fluxo de onboarding se onboardingConcluido=false
2. THE Sistema SHALL guiar o Owner pelas etapas: dados da empresa, cadastro de profissionais, cadastro de serviços e configurações iniciais
3. WHEN o Owner conclui o onboarding, THE Sistema SHALL atualizar onboardingConcluido=true e redirecionar para o dashboard

### Requisito 28: Importação de Dados (Zandu)

**User Story:** Como Owner que migra de outro sistema, quero importar meus dados existentes, para que eu não perca histórico ao mudar para o Hubly.

#### Critérios de Aceitação

1. WHEN o Owner inicia uma importação Zandu, THE Sistema SHALL processar os dados do sistema externo e mapear para as entidades do Hubly (clientes, serviços, agendamentos)
2. THE Sistema SHALL validar os dados importados e reportar erros de mapeamento
3. THE Sistema SHALL vincular os dados importados à Empresa do Owner

### Requisito 29: Suporte ao Usuário

**User Story:** Como Owner ou Profissional, quero acessar suporte dentro do sistema, para que eu resolva dúvidas sem sair da plataforma.

#### Critérios de Aceitação

1. THE Sistema SHALL disponibilizar um chat de suporte integrado (componente SupportChat) acessível em todas as páginas administrativas
2. THE Sistema SHALL disponibilizar um manual de uso acessível via rota /admin/manual

### Requisito 30: PWA e Experiência Mobile

**User Story:** Como Owner ou Profissional, quero acessar o sistema pelo celular como um aplicativo, para que eu gerencie o negócio de qualquer lugar.

#### Critérios de Aceitação

1. THE Sistema SHALL funcionar como Progressive Web App (PWA) com manifest.json, service worker e ícones para instalação
2. THE Sistema SHALL exibir banner de instalação PWA para dispositivos compatíveis
3. THE Sistema SHALL suportar push notifications via service worker e web-push
4. THE Sistema SHALL adaptar a interface para dispositivos móveis (responsivo)

### Requisito 31: Scheduler (Tarefas Agendadas)

**User Story:** Como sistema, quero executar tarefas periódicas automaticamente, para que lembretes, automações e recálculos ocorram sem intervenção manual.

#### Critérios de Aceitação

1. THE Scheduler SHALL executar a cada 15 minutos as seguintes tarefas: verificação de pacotes vencendo, envio de lembretes de agendamento, processamento de automações agendadas e processamento da fila de envios pendentes
2. WHEN o Scheduler processa automações do tipo dias_antes_agendamento, THE Scheduler SHALL verificar se o horário atual está dentro da janela de 15 minutos do horaDisparo configurado
3. WHEN o Scheduler processa automações do tipo horas_antes_agendamento ou horas_apos_agendamento, THE Scheduler SHALL calcular o timestamp exato de disparo e verificar se cai na janela de 15 minutos atual
4. THE Scheduler SHALL implementar deduplicação para evitar envios repetidos usando a combinação automacaoId + agendamentoId no histórico de envios
5. WHEN o Scheduler processa a fila de envios pendentes, THE Sistema SHALL enviar mensagens com status pendente cuja data enviarEm já passou e o WhatsApp está conectado

### Requisito 32: Armazenamento de Arquivos (AWS S3)

**User Story:** Como Owner, quero fazer upload de arquivos (logos, fotos, documentos), para que eles fiquem armazenados de forma segura e acessível.

#### Critérios de Aceitação

1. WHEN um arquivo é enviado para upload, THE Sistema SHALL armazenar o arquivo no AWS S3 com chave única contendo empresaId e nanoid
2. THE Sistema SHALL suportar upload de imagens (logo, capa, fotos de prontuário) e documentos (PDF, contratos)
3. THE Sistema SHALL retornar a URL pública do arquivo armazenado para exibição no frontend
4. THE Sistema SHALL aceitar uploads de até 50MB (configurado no body parser do Express)

### Requisito 33: Convites de Usuário

**User Story:** Como Owner, quero convidar membros da equipe para acessar o sistema, para que eles possam usar a plataforma com suas próprias credenciais.

#### Critérios de Aceitação

1. WHEN o Owner cria um convite, THE Sistema SHALL gerar um token único com data de expiração e vincular ao email e opcionalmente a um Grupo_Permissões
2. WHEN o convidado acessa o link com token válido, THE Sistema SHALL permitir que o convidado crie sua conta (SystemUser) vinculada à Empresa
3. IF o token do convite estiver expirado, THEN THE Sistema SHALL rejeitar o acesso e informar que o convite expirou
4. WHEN o convite é aceito, THE Sistema SHALL atualizar o status para aceito e registrar aceitoEm

### Requisito 34: Configurações da Empresa

**User Story:** Como Owner, quero personalizar diversas configurações do sistema, para que ele se adapte ao fluxo do meu negócio.

#### Critérios de Aceitação

1. THE Sistema SHALL permitir configuração de horário de funcionamento (horaAbertura, horaFechamento, diasFuncionamento, intervaloMinutos)
2. THE Sistema SHALL permitir configuração de templates de mensagem WhatsApp para confirmação, cancelamento e lembrete com variáveis de template
3. THE Sistema SHALL permitir configuração de taxa de maquininha (taxaMaquininha) e percentual da dona (percentualDona) para cálculo de comissões
4. THE Sistema SHALL permitir configuração de reserva (reservaPercentual, reservaHorasExpiracao)
5. THE Sistema SHALL permitir personalização visual (corPrimaria, corSecundaria, logoUrl)
6. THE Sistema SHALL permitir configuração de cores de status dos agendamentos (tabela cores_status) com cores para cada status

### Requisito 35: Tipos de Profissional

**User Story:** Como Owner, quero categorizar profissionais por tipo/especialidade, para que eu organize melhor a equipe.

#### Critérios de Aceitação

1. WHEN o Owner cria um tipo de profissional, THE Sistema SHALL registrar nome e vincular à Empresa
2. THE Sistema SHALL suportar vínculo N:N entre Profissionais e Tipos via tabela de associação
3. THE Sistema SHALL permitir edição e exclusão de tipos de profissional
