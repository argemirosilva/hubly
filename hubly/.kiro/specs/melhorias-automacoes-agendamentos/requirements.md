# Documento de Requisitos — Melhorias em Automações, Agendamentos e Permissões

## Introdução

Este documento especifica melhorias no sistema Hubly/Agendei abrangendo três áreas principais: (1) correções e melhorias no módulo de automações (diagnóstico de triggers, envio de imagens, debug em tempo real, correção de procedure), (2) melhorias na experiência de agendamento (pacotes na primeira tela, filtro por profissional no calendário), e (3) controle de permissões e notificações (fluxo de aprovação de bloqueio de agenda, notificações filtradas por usuário).

## Glossário

- **Sistema_Agendamento**: Módulo responsável pela criação e gestão de agendamentos, incluindo o modal `NovaAgendaModal` e a tela de calendário.
- **Motor_Automacoes**: Módulo backend responsável por processar triggers, enfileirar e disparar automações via WhatsApp (scheduler.ts, routers.ts, whatsapp.ts).
- **Tela_Automacoes**: Interface frontend de configuração de automações (Automacoes.tsx), incluindo o editor de fluxo visual.
- **Calendario**: Tela de visualização mensal de agendamentos com grid e lista (Calendario.tsx).
- **Modulo_Bloqueios**: Módulo de solicitação e aprovação de bloqueios de agenda (Bloqueios.tsx e routers de bloqueios).
- **Modulo_Notificacoes**: Módulo de notificações do sistema e de pacotes (Notificacoes.tsx e routers de notificações).
- **Administrador**: Usuário owner OAuth ou system_user com permissão `agendamentosVerTodos`.
- **Usuario_Nao_Admin**: System_user sem permissão `agendamentosVerTodos`, vinculado a um profissional específico.
- **Pacote_Ativo**: Pacote de serviços do cliente com status "ativo" e sessões disponíveis.
- **Trigger**: Gatilho configurado em uma automação que determina quando a automação deve ser disparada.
- **Fila_Automacoes**: Tabela `historico_envios_automacao` com registros de status "pendente" aguardando envio.
- **WhatsApp_Manager**: Singleton `waManager` responsável pela conexão e envio de mensagens via WhatsApp (Baileys).

## Requisitos

### Requisito 1: Aba de Pacotes na Primeira Tela de Agendamento

**User Story:** Como atendente, eu quero ver os pacotes ativos do cliente logo ao selecioná-lo na tela de agendamento, para que eu possa vincular sessões de pacote sem precisar selecionar o serviço primeiro.

#### Critérios de Aceitação

1. WHEN um cliente com Pacote_Ativo é selecionado no modal de agendamento, THE Sistema_Agendamento SHALL exibir uma aba ou seção de pacotes ativos visível antes da seleção de serviço.
2. WHEN o atendente seleciona uma sessão de pacote na aba de pacotes, THE Sistema_Agendamento SHALL preencher automaticamente o serviço correspondente e vincular o `pacoteClienteItemId` ao item de serviço.
3. WHEN um cliente sem pacotes ativos é selecionado, THE Sistema_Agendamento SHALL ocultar a aba de pacotes e manter o fluxo atual de seleção de serviço.
4. THE Sistema_Agendamento SHALL exibir para cada pacote ativo o nome do pacote, o serviço vinculado e a quantidade de sessões disponíveis.

### Requisito 2: Diagnóstico Completo dos Triggers de Automações

**User Story:** Como administrador, eu quero que todos os triggers de automações sejam verificados e corrigidos, para que as automações sejam enfileiradas corretamente na fila de envio.

#### Critérios de Aceitação

1. WHEN uma automação com trigger do tipo "evento" é ativada e o evento correspondente ocorre (agendamento criado, confirmado, cancelado, concluído, cliente criado, pré-agendamento expirado, pacote renovado), THE Motor_Automacoes SHALL enfileirar o envio na Fila_Automacoes com status "pendente" em até 5 segundos após o evento.
2. WHEN uma automação com trigger do tipo "dias_antes_agendamento" está ativa, THE Motor_Automacoes SHALL verificar e enfileirar envios para agendamentos na data alvo dentro da janela de 15 minutos do horário configurado.
3. WHEN uma automação com trigger do tipo "horas_antes_agendamento" está ativa, THE Motor_Automacoes SHALL calcular o timestamp de disparo subtraindo o delay do horário do agendamento e enfileirar o envio quando o timestamp cair na janela de execução.
4. WHEN uma automação com trigger do tipo "horas_apos_agendamento" está ativa, THE Motor_Automacoes SHALL calcular o timestamp de disparo somando o delay ao horário do agendamento e enfileirar o envio quando o timestamp cair na janela de execução.
5. WHEN uma automação com trigger do tipo "dias_depois_agendamento" está ativa, THE Motor_Automacoes SHALL verificar e enfileirar envios para agendamentos da data alvo (hoje menos N dias) dentro da janela de 15 minutos do horário configurado.
6. WHEN uma automação com trigger do tipo "aniversario_mes" está ativa, THE Motor_Automacoes SHALL enfileirar envios para clientes cujo mês de nascimento corresponde ao mês atual, no horário configurado.
7. WHEN uma automação com trigger do tipo "data_fixa" está ativa, THE Motor_Automacoes SHALL enfileirar envios na data e horário exatos configurados.
8. IF um envio já foi registrado para a mesma combinação de automação e agendamento (ou cliente, conforme o tipo), THEN THE Motor_Automacoes SHALL ignorar o envio duplicado (deduplicação).

### Requisito 3: Tela Modal de Debug de Automações em Tempo Real

**User Story:** Como administrador, eu quero acompanhar o fluxo de execução das automações em tempo real, para que eu possa identificar rapidamente onde uma automação falha.

#### Critérios de Aceitação

1. THE Tela_Automacoes SHALL disponibilizar um botão "Debug" acessível a partir da lista de automações ou do editor de fluxo.
2. WHEN o Administrador abre o modal de debug, THE Tela_Automacoes SHALL exibir uma lista em tempo real dos eventos de automação, incluindo: timestamp, nome da automação, tipo de trigger, status (pendente, enviado, falhou), cliente destinatário e mensagem de erro quando aplicável.
3. WHEN um novo envio é registrado na Fila_Automacoes, THE Tela_Automacoes SHALL atualizar a lista de debug automaticamente via polling a cada 5 segundos ou via invalidação de query.
4. THE Tela_Automacoes SHALL permitir filtrar os eventos de debug por automação específica, por status (pendente, enviado, falhou) e por período (última hora, últimas 24h, últimos 7 dias).
5. IF um envio possui status "falhou", THEN THE Tela_Automacoes SHALL exibir o detalhe do erro em destaque visual (cor vermelha) com o campo `erroDetalhe` visível.

### Requisito 4: Correção do Envio de Imagens na Automação

**User Story:** Como administrador, eu quero que as imagens cadastradas nas automações sejam enviadas junto com a mensagem de texto, para que o cliente receba a comunicação visual completa.

#### Critérios de Aceitação

1. WHEN uma automação com mídia (campo `midiaUrl` preenchido) é disparada, THE Motor_Automacoes SHALL enviar a mídia via `waManager.sendMediaMessage` antes ou junto com a mensagem de texto.
2. WHEN a mídia é uma imagem (extensão jpg, jpeg, png, gif, webp), THE WhatsApp_Manager SHALL enviar como mensagem de imagem com o texto da automação como caption.
3. WHEN a mídia é um documento (extensão pdf), THE WhatsApp_Manager SHALL enviar como mensagem de documento com o texto da automação como caption.
4. IF o envio da mídia falha, THEN THE Motor_Automacoes SHALL registrar o erro no campo `erroDetalhe` do histórico de envios e marcar o status como "falhou".
5. IF a URL da mídia está inacessível ou inválida, THEN THE Motor_Automacoes SHALL enviar apenas a mensagem de texto e registrar um aviso no log.

### Requisito 5: Correção do Erro "No procedure found on path automacoes.testarEnvio"

**User Story:** Como administrador, eu quero testar o envio de uma automação antes de ativá-la, para que eu possa validar que a mensagem percorre todo o fluxo (fila → processamento → envio) corretamente.

#### Critérios de Aceitação

1. THE Motor_Automacoes SHALL expor uma procedure tRPC `automacoes.testarEnvio` que aceita como parâmetros o ID da automação e um número de telefone de teste.
2. WHEN o Administrador aciona o teste de envio na Tela_Automacoes, THE Motor_Automacoes SHALL enfileirar o envio na Fila_Automacoes com status "pendente" e flag `is_teste = true`, substituindo variáveis por dados de exemplo e usando o telefone informado como destinatário — o envio NÃO deve ser feito diretamente, deve passar pela fila para validar todo o processo.
3. WHEN o envio de teste é enfileirado com sucesso, THE Tela_Automacoes SHALL exibir uma notificação informando que o teste foi enfileirado e pode ser acompanhado na fila/debug.
4. WHEN o scheduler processa um envio com flag `is_teste = true`, THE Motor_Automacoes SHALL executar o fluxo completo normalmente (incluindo mídia se configurada) e registrar o resultado no histórico.
5. IF o WhatsApp_Manager não está conectado no momento do processamento pela fila, THEN THE Motor_Automacoes SHALL marcar o envio como "falhou" com o erro informando que o WhatsApp não está conectado.
6. IF a automação possui mídia configurada, THEN THE Motor_Automacoes SHALL incluir a mídia no envio de teste enfileirado.

### Requisito 6: Filtro por Profissional no Calendário

**User Story:** Como administrador, eu quero filtrar os agendamentos do calendário por profissional, para que eu possa visualizar a agenda de um membro específico da equipe.

#### Critérios de Aceitação

1. WHILE o Administrador está na tela de Calendario, THE Calendario SHALL exibir um campo de seleção com auto-busca (autocomplete) contendo a lista de profissionais ativos.
2. WHEN o Administrador seleciona um profissional no filtro, THE Calendario SHALL exibir somente os agendamentos vinculados ao profissional selecionado.
3. WHEN o Administrador limpa o filtro de profissional, THE Calendario SHALL exibir todos os agendamentos (comportamento padrão atual).
4. THE Calendario SHALL manter o filtro de profissional selecionado ao navegar entre meses.
5. WHILE um Usuario_Nao_Admin está na tela de Calendario, THE Calendario SHALL ocultar o campo de filtro por profissional, pois o backend já filtra automaticamente pelo profissional vinculado.

### Requisito 7: Fluxo de Aprovação de Bloqueio de Agenda

**User Story:** Como administrador, eu quero que usuários não-admin apenas solicitem bloqueios de agenda e que somente administradores possam aprovar, para que eu mantenha controle sobre a disponibilidade da equipe.

#### Critérios de Aceitação

1. WHEN um Usuario_Nao_Admin solicita um bloqueio de agenda, THE Modulo_Bloqueios SHALL criar o bloqueio com status "pendente" e registrar o profissional solicitante.
2. WHEN um bloqueio com status "pendente" é criado por um Usuario_Nao_Admin, THE Modulo_Notificacoes SHALL enviar uma notificação para todos os Administradores informando a solicitação de bloqueio.
3. WHILE um Usuario_Nao_Admin está na tela de bloqueios, THE Modulo_Bloqueios SHALL ocultar os botões de "Aprovar" e "Recusar", exibindo apenas o status atual da solicitação.
4. WHILE um Administrador está na tela de bloqueios, THE Modulo_Bloqueios SHALL exibir os botões "Aprovar" e "Recusar" para bloqueios com status "pendente".
5. WHEN um Administrador aprova um bloqueio, THE Modulo_Bloqueios SHALL atualizar o status para "aprovado" e enviar uma notificação ao profissional solicitante.
6. WHEN um Administrador recusa um bloqueio, THE Modulo_Bloqueios SHALL atualizar o status para "recusado" e enviar uma notificação ao profissional solicitante com o motivo da recusa.
7. IF um Usuario_Nao_Admin tenta aprovar ou recusar um bloqueio via API, THEN THE Modulo_Bloqueios SHALL retornar erro de permissão (FORBIDDEN).

### Requisito 8: Notificações Filtradas por Usuário Não-Admin

**User Story:** Como profissional (usuário não-admin), eu quero ver apenas notificações referentes aos meus próprios eventos, para que eu não seja sobrecarregado com informações de outros membros da equipe.

#### Critérios de Aceitação

1. WHILE um Usuario_Nao_Admin acessa a tela de notificações, THE Modulo_Notificacoes SHALL exibir somente notificações cujo `destinatarioId` corresponde ao profissional vinculado ao usuário.
2. WHEN um novo agendamento é criado para um profissional específico, THE Modulo_Notificacoes SHALL criar a notificação com o `destinatarioId` do profissional correspondente.
3. WHEN um agendamento é alterado, remarcado ou cancelado, THE Modulo_Notificacoes SHALL criar a notificação com o `destinatarioId` do profissional vinculado ao agendamento.
4. WHEN uma solicitação de bloqueio de agenda é aprovada ou recusada, THE Modulo_Notificacoes SHALL criar a notificação com o `destinatarioId` do profissional que fez a solicitação.
5. WHILE um Administrador acessa a tela de notificações, THE Modulo_Notificacoes SHALL exibir todas as notificações da empresa, sem filtro por destinatário.
6. THE Modulo_Notificacoes SHALL incluir o campo `destinatarioId` (nullable) na tabela de notificações, onde NULL indica notificação visível para todos os administradores.

### Requisito 9: Automação de Renovação e Validade de Pacotes

**User Story:** Como administrador, eu quero habilitar automações de renovação nos pacotes e configurar data de validade opcional, para que o sistema avise automaticamente os clientes quando o pacote estiver vencendo ou com sessões acabando.

#### Critérios de Aceitação

1. THE Sistema_Agendamento SHALL permitir ao Administrador habilitar/desabilitar a automação de renovação em cada pacote, via toggle na tela de configuração do pacote.
2. THE Sistema_Agendamento SHALL permitir ao Administrador definir uma data de validade opcional no pacote do cliente. WHEN a data de validade não é preenchida, o pacote não expira por tempo.
3. WHEN a automação de renovação está habilitada e o pacote possui data de validade, THE Motor_Automacoes SHALL enfileirar um envio usando o trigger `pacote_vencendo` uma semana antes (7 dias) da data de validade.
4. WHEN a automação de renovação está habilitada e o pacote possui data de validade, THE Motor_Automacoes SHALL enfileirar um envio usando o trigger `pacote_vencendo` 1 dia antes da data de validade.
5. WHEN a automação de renovação está habilitada e qualquer um dos serviços do pacote estiver com exatamente 1 sessão restante, THE Motor_Automacoes SHALL enfileirar um envio usando o trigger `sessoes_acabando`.
6. THE Motor_Automacoes SHALL aplicar deduplicação para evitar envios repetidos do mesmo aviso (mesmo pacote + mesmo tipo de aviso + mesma data alvo).
7. WHEN a automação de renovação está desabilitada no pacote, THE Motor_Automacoes SHALL ignorar todos os triggers de `pacote_vencendo` e `sessoes_acabando` para aquele pacote.
