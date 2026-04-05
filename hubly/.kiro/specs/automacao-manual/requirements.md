# Documento de Requisitos — Automação Manual + Envio Rápido de Mensagem

## Introdução

O sistema Hubly possui um módulo de automações que dispara mensagens automaticamente com base em gatilhos (evento, data fixa, aniversário, etc.). Porém, quando o dono do negócio recebe uma notificação de vencimento de pacote, não existe uma forma rápida de enviar uma mensagem de renovação ao cliente. Esta feature adiciona um novo tipo de gatilho `manual` às automações, permitindo que o usuário dispare mensagens pré-configuradas com um ou dois cliques diretamente a partir das notificações de pacotes. O objetivo é reduzir o atrito entre "ver a notificação" e "agir sobre ela", mantendo o princípio de mínimo de cliques da Orizon.

## Glossário

- **Sistema_Hubly**: O sistema SaaS de gestão para salões, clínicas e barbearias
- **Módulo_Automações**: Subsistema responsável por gerenciar e executar automações de mensagens
- **Automação_Manual**: Automação com tipoGatilho `manual` que serve como template de mensagem, disparada exclusivamente por ação do usuário
- **Notificação_Pacote**: Notificação do sistema sobre estado de pacotes de clientes (tipos: `vencimento_proximo`, `sessoes_restantes`, `pacote_vencido`)
- **Modal_Envio_Rápido**: Componente de interface compacto que exibe preview da mensagem e permite envio com um clique
- **Variável_Template**: Placeholder no corpo da mensagem (ex: `{{nome_cliente}}`) que é substituído por dados reais do cliente/pacote no momento do envio
- **Histórico_Envios**: Tabela `historico_envios_automacao` que registra cada mensagem enviada
- **WhatsApp_Manager**: Serviço singleton (`waManager`) responsável pela conexão e envio de mensagens via WhatsApp
- **Procedimento_tRPC**: Endpoint do backend exposto via tRPC para chamadas do frontend

## Requisitos

### Requisito 1: Migração do banco — novo tipo de gatilho `manual`

**User Story:** Como desenvolvedor, eu quero adicionar o valor `manual` ao enum `tipoGatilho` da tabela `automacoes`, para que o sistema suporte automações disparadas manualmente pelo usuário.

#### Critérios de Aceitação

1. WHEN a migração for executada, THE Sistema_Hubly SHALL adicionar o valor `manual` ao enum `tipoGatilho` da tabela `automacoes`, preservando todos os valores existentes (`evento`, `data_fixa`, `aniversario_mes`, `dias_antes_agendamento`, `horas_antes_agendamento`, `horas_apos_agendamento`, `dias_depois_agendamento`)
2. WHEN a migração for executada, THE Sistema_Hubly SHALL adicionar os valores `renovacao_pacote`, `mensagem_avulsa` e `lembrete_manual` como opções válidas para o campo `evento` de automações com tipoGatilho `manual`
3. WHEN o schema Drizzle for atualizado, THE Módulo_Automações SHALL incluir `manual` na definição do enum `tipoGatilho` no arquivo `drizzle/schema.ts`

### Requisito 2: Automações manuais não disparam automaticamente

**User Story:** Como dono de negócio, eu quero que automações do tipo `manual` funcionem apenas como templates de mensagem, para que elas não sejam enviadas automaticamente pelo scheduler.

#### Critérios de Aceitação

1. WHILE uma automação possuir tipoGatilho `manual`, THE Módulo_Automações SHALL ignorar essa automação em todos os ciclos de execução automática do scheduler
2. THE Módulo_Automações SHALL permitir criar, editar e excluir automações com tipoGatilho `manual` usando os mesmos endpoints existentes de CRUD de automações
3. WHEN uma automação manual for listada na página de automações, THE Sistema_Hubly SHALL exibir um indicador visual diferenciando-a das automações automáticas

### Requisito 3: Procedimento tRPC para envio manual

**User Story:** Como dono de negócio, eu quero um endpoint que processe o envio de uma mensagem manual, para que eu possa disparar mensagens pré-configuradas para clientes específicos.

#### Critérios de Aceitação

1. THE Sistema_Hubly SHALL expor um Procedimento_tRPC `automacoes.enviarManual` que aceite como parâmetros: `automacaoId` (number), `clienteId` (number) e `notificacaoPacoteId` (number, opcional)
2. WHEN o Procedimento_tRPC `enviarManual` for chamado, THE Módulo_Automações SHALL buscar o template da automação, os dados do cliente e os dados do pacote associado
3. WHEN o Procedimento_tRPC `enviarManual` for chamado, THE Módulo_Automações SHALL substituir todas as Variáveis_Template no corpo da mensagem pelos valores reais do cliente e pacote
4. WHEN o WhatsApp_Manager estiver desconectado, THE Procedimento_tRPC SHALL retornar um erro com código `PRECONDITION_FAILED` e mensagem descritiva
5. WHEN o envio for bem-sucedido, THE Procedimento_tRPC SHALL registrar o envio na tabela Histórico_Envios com status `enviado`
6. IF o envio falhar, THEN THE Procedimento_tRPC SHALL registrar o envio na tabela Histórico_Envios com status `falhou` e o detalhe do erro

### Requisito 4: Substituição de variáveis de pacote

**User Story:** Como dono de negócio, eu quero que as mensagens de renovação incluam dados do pacote do cliente, para que a mensagem seja personalizada e relevante.

#### Critérios de Aceitação

1. THE Módulo_Automações SHALL suportar as seguintes Variáveis_Template adicionais para automações manuais: `{{pacote}}`, `{{sessoes_restantes}}`, `{{sessoes_total}}`, `{{data_vencimento}}`
2. WHEN a variável `{{pacote}}` for encontrada no template, THE Módulo_Automações SHALL substituí-la pelo nome do pacote do cliente
3. WHEN a variável `{{sessoes_restantes}}` for encontrada no template, THE Módulo_Automações SHALL substituí-la pela quantidade de sessões ainda disponíveis no pacote
4. WHEN a variável `{{sessoes_total}}` for encontrada no template, THE Módulo_Automações SHALL substituí-la pela quantidade total de sessões do pacote
5. WHEN a variável `{{data_vencimento}}` for encontrada no template, THE Módulo_Automações SHALL substituí-la pela data de vencimento do pacote no formato `DD/MM/AAAA`
6. THE Módulo_Automações SHALL manter compatibilidade com todas as Variáveis_Template existentes (`{{nome_cliente}}`, `{{primeiro_nome}}`, `{{empresa}}`, etc.)

### Requisito 5: Botão "Enviar mensagem" nas notificações de pacote

**User Story:** Como dono de negócio, eu quero ver um botão de envio rápido nas notificações de pacote, para que eu possa agir imediatamente ao ver um alerta de vencimento.

#### Critérios de Aceitação

1. WHEN uma Notificação_Pacote dos tipos `vencimento_proximo`, `sessoes_restantes` ou `pacote_vencido` for renderizada, THE Sistema_Hubly SHALL exibir um botão "Enviar mensagem" junto à notificação
2. WHEN o botão "Enviar mensagem" for clicado, THE Sistema_Hubly SHALL abrir o Modal_Envio_Rápido com os dados do cliente e pacote da notificação pré-carregados
3. WHEN nenhuma automação manual do tipo `renovacao_pacote` estiver cadastrada para a empresa, THE Sistema_Hubly SHALL exibir o botão em estado desabilitado com tooltip explicativo informando que é necessário criar uma automação manual primeiro
4. THE Sistema_Hubly SHALL posicionar o botão de forma que não interfira com a ação de marcar a notificação como lida

### Requisito 6: Modal de envio rápido com preview

**User Story:** Como dono de negócio, eu quero visualizar a mensagem final antes de enviar, para que eu tenha confiança de que o conteúdo está correto.

#### Critérios de Aceitação

1. WHEN o Modal_Envio_Rápido for aberto, THE Sistema_Hubly SHALL exibir o nome do cliente destinatário e o telefone de destino
2. WHEN o Modal_Envio_Rápido for aberto, THE Sistema_Hubly SHALL exibir a mensagem com todas as Variáveis_Template já substituídas pelos valores reais
3. THE Modal_Envio_Rápido SHALL exibir um botão "Enviar via WhatsApp" como ação principal
4. WHEN o botão "Enviar via WhatsApp" for clicado, THE Modal_Envio_Rápido SHALL desabilitar o botão e exibir um indicador de carregamento até a conclusão do envio
5. THE Modal_Envio_Rápido SHALL ocupar o mínimo de espaço visual necessário, utilizando o componente Dialog existente do sistema de design

### Requisito 7: Feedback visual de sucesso e erro

**User Story:** Como dono de negócio, eu quero receber confirmação visual após o envio, para que eu saiba se a mensagem foi entregue com sucesso.

#### Critérios de Aceitação

1. WHEN o envio for concluído com sucesso, THE Sistema_Hubly SHALL exibir um toast de sucesso com a mensagem "Mensagem enviada com sucesso" e fechar o Modal_Envio_Rápido automaticamente
2. IF o envio falhar, THEN THE Sistema_Hubly SHALL exibir um toast de erro com a descrição do problema, mantendo o Modal_Envio_Rápido aberto para permitir nova tentativa
3. IF o WhatsApp_Manager estiver desconectado no momento do clique, THEN THE Sistema_Hubly SHALL exibir um toast de erro informando que o WhatsApp não está conectado

### Requisito 8: Marcar notificação como lida após envio

**User Story:** Como dono de negócio, eu quero que a notificação seja automaticamente marcada como lida após enviar a mensagem, para que minha lista de pendências fique atualizada sem ação extra.

#### Critérios de Aceitação

1. WHEN o envio via Modal_Envio_Rápido for concluído com sucesso, THE Sistema_Hubly SHALL marcar a Notificação_Pacote correspondente como lida automaticamente
2. WHEN a notificação for marcada como lida após envio, THE Sistema_Hubly SHALL atualizar a contagem de notificações não lidas na interface sem necessidade de recarregar a página
3. IF o envio falhar, THEN THE Sistema_Hubly SHALL manter a Notificação_Pacote como não lida

### Requisito 9: Registro no histórico de envios

**User Story:** Como dono de negócio, eu quero que cada mensagem manual enviada fique registrada no histórico, para que eu tenha rastreabilidade completa dos envios.

#### Critérios de Aceitação

1. WHEN uma mensagem for enviada via automação manual, THE Módulo_Automações SHALL registrar na tabela Histórico_Envios os campos: `empresaId`, `automacaoId`, `automacaoNome`, `clienteId`, `clienteNome`, `telefone`, `canal` (whatsapp), `mensagem` (texto final com variáveis substituídas) e `status`
2. THE Módulo_Automações SHALL exibir os envios manuais na página de fila/histórico de automações existente, sem distinção visual que confunda com envios automáticos

### Requisito 10: Extensibilidade para outros cenários manuais

**User Story:** Como dono de negócio, eu quero poder criar automações manuais para diferentes situações além de renovação de pacote, para que eu tenha templates prontos para cobranças, parabéns e outros cenários.

#### Critérios de Aceitação

1. THE Módulo_Automações SHALL permitir criar automações manuais com qualquer um dos eventos: `renovacao_pacote`, `mensagem_avulsa`, `lembrete_manual`
2. WHEN o usuário criar uma nova automação, THE Sistema_Hubly SHALL oferecer `manual` como opção de tipo de gatilho no formulário de criação
3. THE Módulo_Automações SHALL permitir que futuras integrações (ex: tela de clientes, tela financeira) reutilizem o Procedimento_tRPC `enviarManual` para disparar automações manuais em outros contextos
