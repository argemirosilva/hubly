# Documento de Requisitos — Migração WhatsApp: Baileys → Evolution API + Docker

## Introdução

Este documento especifica os requisitos para migrar a integração WhatsApp do Hubly, atualmente baseada na biblioteca Baileys (executada diretamente no processo Node.js/Express), para a Evolution API rodando em container Docker separado. A migração visa resolver problemas de estabilidade (sessão cai em deploy/restart), isolamento de processos (crash do WhatsApp derruba a API inteira), e habilitar suporte multi-instância (cada empresa com seu próprio número WhatsApp). A comunicação entre o Hubly e a Evolution API será feita via HTTP REST, com webhooks para notificações de status. A persistência de sessão será gerenciada pela própria Evolution API com Redis, eliminando a tabela `wa_session` do MySQL.

## Glossário

- **Hubly**: Aplicação principal (backend Node.js/Express + frontend React) que gerencia agendamentos, clientes, automações e financeiro.
- **Evolution_API**: Serviço open-source que encapsula a conexão WhatsApp (baseado em Baileys internamente) e expõe uma API REST para gerenciamento de instâncias, envio de mensagens e recebimento de webhooks.
- **Instância_WhatsApp**: Uma conexão WhatsApp individual gerenciada pela Evolution_API, identificada por um nome único (ex: `hubly-empresa-{empresaId}`).
- **Webhook_Receiver**: Endpoint HTTP no Hubly que recebe notificações da Evolution_API sobre mudanças de status de conexão, QR codes e confirmações de entrega.
- **Camada_Adaptadora**: Módulo TypeScript (`server/whatsapp-evolution.ts`) que substitui o `WhatsAppManager` atual, traduzindo chamadas internas do Hubly para requisições HTTP à Evolution_API.
- **Scheduler**: Processo agendado do Hubly que processa automações e envia mensagens pendentes a cada 15 minutos.
- **Fila_Mensagens**: Tabela `historico_envios_automacao` com status `pendente`, usada como fila de mensagens a serem enviadas.
- **Plano**: Nível de assinatura da empresa (FREE, SOLO, PLUS, PRO) que define limites de notificações WhatsApp por mês (`notificacoesWhatsappMes`).
- **Docker_Compose**: Arquivo de orquestração que define os containers da Evolution_API e Redis junto à infraestrutura existente.
- **Redis**: Banco de dados in-memory usado pela Evolution_API para persistência de sessões WhatsApp.
- **Empresa**: Entidade do Hubly que representa um negócio cliente (salão, clínica, barbearia, etc.).

## Requisitos

### Requisito 1: Infraestrutura Docker (Evolution API + Redis)

**User Story:** Como administrador do sistema, eu quero que a Evolution API e o Redis rodem em containers Docker separados do Hubly, para que a conexão WhatsApp seja isolada do processo principal e sobreviva a deploys.

#### Critérios de Aceitação

1. THE Docker_Compose SHALL definir um serviço `evolution-api` usando a imagem oficial `atendai/evolution-api:latest` com variáveis de ambiente para autenticação, porta, e configuração de webhook.
2. THE Docker_Compose SHALL definir um serviço `redis` usando a imagem `redis:7-alpine` com volume persistente para dados.
3. THE Evolution_API SHALL utilizar o Redis como store de sessões, configurado via variável de ambiente `STORE_SESSION=redis` e `REDIS_URI`.
4. WHEN o container da Evolution_API reiniciar, THE Evolution_API SHALL restaurar automaticamente todas as sessões WhatsApp ativas a partir do Redis.
5. THE Docker_Compose SHALL configurar uma rede Docker interna (`hubly-network`) para comunicação entre o Hubly, a Evolution_API e o Redis.
6. THE Docker_Compose SHALL definir health checks para a Evolution_API (endpoint `/ping`) e para o Redis (comando `redis-cli ping`).
7. THE Docker_Compose SHALL expor a porta da Evolution_API apenas na rede interna, sem acesso externo direto.
8. IF o container da Evolution_API falhar no health check por 3 tentativas consecutivas, THEN THE Docker_Compose SHALL reiniciar o container automaticamente via política `restart: unless-stopped`.

---

### Requisito 2: Camada Adaptadora (Substituição do WhatsAppManager)

**User Story:** Como desenvolvedor, eu quero uma camada adaptadora que substitua o `WhatsAppManager` atual (Baileys direto) por chamadas HTTP à Evolution API, para que todo o código existente do Hubly continue funcionando sem alterações nos consumidores.

#### Critérios de Aceitação

1. THE Camada_Adaptadora SHALL exportar um objeto `waManager` com a mesma interface pública do `WhatsAppManager` atual: `getState()`, `connect()`, `disconnect()`, `resetSession()`, `sendMessage(phoneNumber, message)`, `sendMediaMessage(phoneNumber, mediaUrl, caption?, mimeType?)` e `init()`.
2. THE Camada_Adaptadora SHALL manter os mesmos tipos exportados: `WAStatus` (`disconnected`, `connecting`, `qr_ready`, `scanning`, `connected`, `logged_out`) e `WAState`.
3. WHEN `connect()` for chamado, THE Camada_Adaptadora SHALL criar uma instância na Evolution_API via `POST /instance/create` e solicitar o QR code via `GET /instance/connect/{instanceName}`.
4. WHEN `disconnect()` for chamado, THE Camada_Adaptadora SHALL chamar `DELETE /instance/logout/{instanceName}` na Evolution_API e atualizar o estado local para `disconnected`.
5. WHEN `sendMessage()` for chamado, THE Camada_Adaptadora SHALL enviar a mensagem via `POST /message/sendText/{instanceName}` na Evolution_API e retornar `true` em caso de sucesso ou `false` em caso de falha.
6. WHEN `sendMediaMessage()` for chamado, THE Camada_Adaptadora SHALL enviar a mídia via `POST /message/sendMedia/{instanceName}` na Evolution_API, diferenciando entre imagem e documento pelo `mimeType`.
7. THE Camada_Adaptadora SHALL manter compatibilidade com o `EventEmitter`, emitindo os mesmos eventos: `qr`, `connected`, `disconnected`, `logged_out`, `state_change`.
8. IF a Evolution_API retornar erro HTTP (4xx ou 5xx) em qualquer chamada, THEN THE Camada_Adaptadora SHALL logar o erro e retornar `false` para operações de envio ou emitir evento `disconnected` para operações de conexão.
9. THE Camada_Adaptadora SHALL ler a URL base da Evolution_API e a API key a partir de variáveis de ambiente (`EVOLUTION_API_URL` e `EVOLUTION_API_KEY`).

---

### Requisito 3: Migração do Envio de Mensagens (Texto + Mídia)

**User Story:** Como sistema de automações, eu quero que todas as funções de envio de mensagens (confirmação, cancelamento, lembrete, pacote vencendo) continuem funcionando identicamente após a migração, para que nenhum cliente deixe de receber notificações.

#### Critérios de Aceitação

1. THE Camada_Adaptadora SHALL formatar o número de telefone no padrão internacional (55 + DDD + número) antes de enviar à Evolution_API, removendo caracteres não numéricos.
2. WHEN `sendAgendamentoConfirmacao()` for chamado, THE Hubly SHALL enviar a mensagem de confirmação via Camada_Adaptadora com o mesmo template de texto atual.
3. WHEN `sendAgendamentoCancelado()` for chamado, THE Hubly SHALL enviar a mensagem de cancelamento via Camada_Adaptadora com o mesmo template de texto atual.
4. WHEN `sendPacoteVencendo()` for chamado, THE Hubly SHALL enviar a mensagem de pacote vencendo via Camada_Adaptadora com o mesmo template de texto atual.
5. WHEN `sendWAMedia()` for chamado, THE Camada_Adaptadora SHALL enviar o arquivo via Evolution_API diferenciando entre documento (PDF, application/*) e imagem (image/*) pelo mimeType.
6. THE Camada_Adaptadora SHALL retornar `false` quando a instância WhatsApp não estiver conectada, sem lançar exceção, mantendo o mesmo comportamento do `WhatsAppManager` atual.
7. WHEN uma mensagem for enviada com sucesso, THE Camada_Adaptadora SHALL logar no console `[WhatsApp] Mensagem enviada para {jid}` mantendo o mesmo formato de log atual.

---

### Requisito 4: Migração do Fluxo de Autenticação QR Code

**User Story:** Como administrador da empresa, eu quero continuar autenticando o WhatsApp via QR Code na página `/admin/whatsapp`, para que o processo de conexão seja transparente e familiar.

#### Critérios de Aceitação

1. WHEN o usuário clicar em "Conectar WhatsApp", THE Camada_Adaptadora SHALL solicitar a criação de instância e obtenção do QR code à Evolution_API.
2. WHEN a Evolution_API gerar um QR code, THE Webhook_Receiver SHALL receber o evento `qrcode.updated` e atualizar o estado local com o QR code em formato base64 data URL.
3. THE Camada_Adaptadora SHALL converter o QR code recebido da Evolution_API para o formato `data:image/png;base64,...` compatível com o componente `<img>` do frontend.
4. WHEN o QR code for escaneado com sucesso, THE Webhook_Receiver SHALL receber o evento `connection.update` com status `open` e atualizar o estado para `connected`.
5. WHEN o QR code expirar sem ser escaneado, THE Camada_Adaptadora SHALL emitir evento `state_change` com status `disconnected` para que o frontend mostre o botão de reconectar.
6. THE Hubly SHALL manter o polling do status via tRPC (`whatsapp.getStatus`) com os mesmos intervalos atuais: 2s durante QR/connecting, 10s quando desconectado, 30s quando conectado.

---

### Requisito 5: Migração da Persistência de Sessão

**User Story:** Como administrador do sistema, eu quero que as sessões WhatsApp sobrevivam a reinicializações do servidor e deploys, para que a conexão não caia a cada deploy.

#### Critérios de Aceitação

1. THE Evolution_API SHALL persistir todas as sessões WhatsApp no Redis, eliminando a necessidade da tabela `wa_session` no MySQL do Hubly.
2. WHEN o container da Evolution_API reiniciar, THE Evolution_API SHALL reconectar automaticamente todas as instâncias que estavam ativas antes do restart.
3. THE Hubly SHALL manter a tabela `wa_session` no MySQL durante o período de migração (sem deletar), mas a Camada_Adaptadora não a utilizará para leitura ou escrita.
4. WHEN o Hubly (servidor Express) reiniciar, THE Camada_Adaptadora SHALL consultar a Evolution_API via `GET /instance/fetchInstances` para verificar quais instâncias estão ativas e sincronizar o estado local.
5. THE Camada_Adaptadora SHALL eliminar a lógica de backoff exponencial (15s, 30s, 60s, 120s, 300s) do lado do Hubly, delegando a reconexão automática à Evolution_API.

---

### Requisito 6: Integração via Webhooks (Evolution API → Hubly)

**User Story:** Como sistema, eu quero receber notificações em tempo real da Evolution API sobre mudanças de status de conexão e QR codes, para que o frontend reflita o estado atual sem depender apenas de polling.

#### Critérios de Aceitação

1. THE Hubly SHALL expor um endpoint HTTP `POST /api/webhooks/evolution` para receber eventos da Evolution_API.
2. THE Webhook_Receiver SHALL validar o header `apikey` de cada requisição recebida, comparando com a `EVOLUTION_API_KEY` configurada.
3. WHEN o Webhook_Receiver receber um evento `connection.update`, THE Webhook_Receiver SHALL atualizar o estado da instância correspondente na Camada_Adaptadora e registrar o evento na tabela `wa_connection_log`.
4. WHEN o Webhook_Receiver receber um evento `qrcode.updated`, THE Webhook_Receiver SHALL atualizar o QR code no estado da instância correspondente e emitir evento `qr` via EventEmitter.
5. IF o Webhook_Receiver receber um evento com `instanceName` desconhecido, THEN THE Webhook_Receiver SHALL ignorar o evento e logar um aviso.
6. THE Webhook_Receiver SHALL responder com HTTP 200 em até 5 segundos para todos os eventos recebidos, processando a lógica de forma assíncrona quando necessário.
7. THE Evolution_API SHALL ser configurada com a URL do webhook do Hubly via variável de ambiente `WEBHOOK_URL` no Docker Compose.

---

### Requisito 7: Suporte Multi-Instância por Empresa

**User Story:** Como administrador de uma empresa, eu quero conectar meu próprio número de WhatsApp independente de outras empresas, para que cada empresa tenha sua própria conexão e número.

#### Critérios de Aceitação

1. THE Camada_Adaptadora SHALL criar instâncias na Evolution_API com nome no formato `hubly-empresa-{empresaId}` para identificação única.
2. WHEN uma empresa solicitar conexão WhatsApp, THE Camada_Adaptadora SHALL criar ou reutilizar a instância correspondente ao `empresaId` da empresa.
3. THE Hubly SHALL armazenar o `instanceName` da Evolution_API na tabela `empresas`, no campo `whatsappInstanceName` (novo campo a ser adicionado via migration).
4. WHEN o Scheduler processar automações de uma empresa, THE Scheduler SHALL utilizar a instância WhatsApp específica daquela empresa para enviar mensagens.
5. WHEN uma empresa não tiver instância WhatsApp configurada, THE Hubly SHALL exibir o fluxo de conexão QR Code na página `/admin/whatsapp`.
6. THE página WhatsApp (`/admin/whatsapp`) SHALL exibir o status de conexão específico da empresa do usuário logado, não de uma conexão global.
7. IF uma empresa tentar conectar uma instância que já existe na Evolution_API, THEN THE Camada_Adaptadora SHALL reutilizar a instância existente em vez de criar uma nova.

---

### Requisito 8: Compatibilidade com Automações Existentes

**User Story:** Como sistema de automações, eu quero que todas as automações configuradas (lembretes, confirmações, cancelamentos, pacotes vencendo) continuem funcionando sem alteração após a migração, para que nenhuma funcionalidade seja perdida.

#### Critérios de Aceitação

1. THE Scheduler SHALL continuar processando automações do tipo `dias_antes_agendamento`, `horas_antes_agendamento`, `horas_apos_agendamento` e `dias_depois_agendamento` com a mesma lógica de janela de tempo atual.
2. THE Scheduler SHALL utilizar a Camada_Adaptadora (novo `waManager`) para enviar mensagens, sem alteração na lógica de template de mensagem ou deduplicação.
3. THE Hubly SHALL continuar registrando envios na tabela `historico_envios_automacao` com os mesmos campos e status (`enviado`, `falhou`, `pendente`).
4. WHEN o Scheduler encontrar mensagens com status `pendente` na Fila_Mensagens, THE Scheduler SHALL tentar enviá-las via Camada_Adaptadora utilizando a instância da empresa correspondente.
5. THE Hubly SHALL continuar usando as funções helper `sendAgendamentoConfirmacao`, `sendAgendamentoCancelado`, `sendPacoteVencendo` e `sendWAMedia` com as mesmas assinaturas e comportamento.
6. IF a instância WhatsApp de uma empresa estiver desconectada durante o processamento de automações, THEN THE Scheduler SHALL marcar a mensagem como `falhou` com detalhe `Instância WhatsApp desconectada` na tabela `historico_envios_automacao`.

---

### Requisito 9: Transparência no Frontend (Página WhatsApp)

**User Story:** Como administrador da empresa, eu quero que a página de WhatsApp (`/admin/whatsapp`) funcione visualmente igual ou melhor após a migração, para que a transição seja transparente.

#### Critérios de Aceitação

1. THE página WhatsApp SHALL exibir os mesmos estados visuais atuais: `disconnected`, `connecting`, `qr_ready`, `scanning`, `connected`, `logged_out` com os mesmos ícones e cores.
2. THE página WhatsApp SHALL exibir o QR Code no mesmo formato visual atual (imagem 224x224px com borda verde).
3. THE página WhatsApp SHALL manter os botões "Conectar WhatsApp", "Desconectar", "Resetar sessão" e "Enviar Mensagem de Teste" com o mesmo comportamento.
4. THE página WhatsApp SHALL exibir o número de telefone conectado e a data/hora de conexão quando o status for `connected`.
5. THE página WhatsApp SHALL exibir o histórico de conexão (tabela `wa_connection_log`) com os mesmos eventos e formato visual.
6. THE tRPC router `whatsapp` SHALL manter os mesmos endpoints: `getStatus`, `getConnectionLog`, `connect`, `disconnect`, `resetSession`, `sendTest`.
7. WHEN o usuário clicar em "Resetar sessão", THE Camada_Adaptadora SHALL deletar a instância na Evolution_API via `DELETE /instance/delete/{instanceName}` e limpar o estado local.

---

### Requisito 10: Controle de Limites de Plano

**User Story:** Como sistema de billing, eu quero que os limites de notificações WhatsApp por mês (`notificacoesWhatsappMes`) continuem sendo respeitados após a migração, para que empresas não excedam seus planos.

#### Critérios de Aceitação

1. THE Camada_Adaptadora SHALL verificar o limite de notificações WhatsApp do plano da empresa antes de enviar cada mensagem.
2. WHEN o limite mensal de notificações for atingido, THE Camada_Adaptadora SHALL retornar `false` e registrar o envio como `falhou` com detalhe `Limite mensal de notificações WhatsApp atingido` na tabela `historico_envios_automacao`.
3. THE Hubly SHALL continuar contabilizando notificações enviadas por mês por empresa, usando a mesma lógica de contagem atual baseada na tabela `historico_envios_automacao`.
4. THE limites por plano SHALL permanecer inalterados: FREE=10, SOLO=100, PLUS=400, PRO=1000 notificações WhatsApp por mês.

---

### Requisito 11: Plano de Rollback

**User Story:** Como administrador do sistema, eu quero ter um plano de rollback documentado caso a migração para Evolution API falhe, para que o sistema possa voltar ao funcionamento anterior rapidamente.

#### Critérios de Aceitação

1. THE Hubly SHALL manter o código do `WhatsAppManager` original (Baileys) no repositório durante o período de migração, renomeado para `server/whatsapp-baileys.ts`.
2. THE Hubly SHALL utilizar uma variável de ambiente `WHATSAPP_PROVIDER` com valores `evolution` (padrão) ou `baileys` para selecionar qual implementação usar.
3. WHEN `WHATSAPP_PROVIDER` for configurado como `baileys`, THE Hubly SHALL importar e utilizar o `WhatsAppManager` original do arquivo `server/whatsapp-baileys.ts`.
4. THE tabela `wa_session` no MySQL SHALL ser mantida intacta durante a migração para permitir rollback sem perda de sessão Baileys.
5. THE Hubly SHALL documentar no README os passos de rollback: alterar variável de ambiente, reiniciar servidor, verificar reconexão.

---

### Requisito 12: Impactos Negativos e Riscos

**User Story:** Como stakeholder, eu quero entender todos os riscos e impactos negativos da migração, para que a decisão seja informada e os riscos sejam mitigados.

#### Critérios de Aceitação

1. THE documentação de migração SHALL listar o risco de downtime durante a transição: período estimado de 5-15 minutos onde mensagens WhatsApp não serão enviadas enquanto a Evolution_API é provisionada e a instância reconectada.
2. THE documentação de migração SHALL listar o risco de perda de mensagens: mensagens com status `pendente` na Fila_Mensagens durante a transição podem falhar se a instância não estiver conectada na Evolution_API.
3. THE documentação de migração SHALL listar o risco de estabilidade da Evolution_API: como projeto open-source, pode ter bugs, atualizações breaking, ou ser descontinuado.
4. THE documentação de migração SHALL listar o risco de banimento: a Evolution_API ainda usa protocolo não-oficial do WhatsApp (Baileys internamente), mantendo o mesmo risco de ban da implementação atual.
5. THE documentação de migração SHALL listar o impacto de infraestrutura: necessidade de mais recursos de servidor (RAM para Redis ~50-100MB, CPU para Evolution_API container, disco para volumes Docker).
6. THE documentação de migração SHALL listar o impacto de custo: aumento estimado de 10-20% no custo de servidor devido aos containers adicionais.
7. THE documentação de migração SHALL listar o risco de latência: comunicação HTTP entre containers adiciona 1-5ms de latência por requisição comparado à chamada direta em processo.
8. THE documentação de migração SHALL listar o risco de complexidade operacional: monitoramento de 3 serviços (Hubly, Evolution_API, Redis) em vez de 1, necessidade de conhecimento Docker para debugging.
9. THE documentação de migração SHALL listar o risco de dependência: o Hubly passa a depender do projeto Evolution_API (manutenção por terceiros) para funcionalidade crítica de negócio.
10. THE documentação de migração SHALL listar a mitigação para cada risco identificado.

---

### Requisito 13: Plano de Testes

**User Story:** Como desenvolvedor, eu quero um plano de testes abrangente para validar a migração, para que todos os cenários sejam verificados antes de ir para produção.

#### Critérios de Aceitação

1. THE plano de testes SHALL incluir testes unitários para a Camada_Adaptadora: formatação de número de telefone, construção de payloads HTTP, tratamento de erros da Evolution_API, e mapeamento de estados.
2. THE plano de testes SHALL incluir testes de integração: conexão com Evolution_API real, envio de mensagem de texto, envio de mídia (imagem e documento), fluxo completo de QR code, e recebimento de webhooks.
3. THE plano de testes SHALL incluir checklist de teste manual: verificar página WhatsApp no frontend, testar conexão/desconexão, testar envio de mensagem de teste, verificar automações de lembrete, verificar automações de confirmação de agendamento, verificar automações de cancelamento, verificar notificação de pacote vencendo.
4. THE plano de testes SHALL incluir teste de resiliência: reiniciar container da Evolution_API e verificar reconexão automática, reiniciar container do Redis e verificar recuperação de sessão, reiniciar servidor Hubly e verificar sincronização de estado.
5. THE plano de testes SHALL incluir teste de rollback: alternar `WHATSAPP_PROVIDER` para `baileys`, reiniciar servidor, verificar que a conexão Baileys funciona corretamente.
6. THE plano de testes SHALL incluir teste de limites de plano: enviar mensagens até atingir o limite do plano e verificar que mensagens subsequentes são bloqueadas com mensagem de erro adequada.
7. THE plano de testes SHALL incluir teste multi-instância: conectar duas empresas diferentes com números WhatsApp distintos e verificar que mensagens são enviadas pela instância correta de cada empresa.
