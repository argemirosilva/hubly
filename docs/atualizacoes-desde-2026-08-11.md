# Atualizações do Hubly desde 11/08/2026

**Período analisado:** 11 a 25 de agosto de 2026. O primeiro registro de alteração disponível no repositório é de **12/08/2026**.  
**Versão sincronizada localmente:** atualização remota mais recente de 25/08/2026, complementada pelas migrações e correções locais descritas ao final deste documento.

> Este resumo foi consolidado a partir do histórico do repositório conectado ao Hubly. Ele agrupa alterações relacionadas para facilitar a leitura; uma mesma área pode ter recebido várias melhorias sucessivas no período.

## Visão geral

O período trouxe avanços relevantes em **acesso e planos**, **agendamentos e automações**, **pacotes**, **Marketing**, **integração de dados**, **site público** e **experiência mobile/PWA**. Também foram aplicadas nesta sincronização as migrações que estavam pendentes no banco local, de modo que o código atualizado e a estrutura de dados voltassem a operar juntos.

| Área | Principais entregas |
|---|---|
| Acesso e dados | Correção de administradora proprietária e exportação SQL segura por empresa. |
| Agenda e automações | Proteções contra conflito e mensagens indevidas; reagendamento recalcula lembretes. |
| Pacotes | Sessões agendáveis, finanças de pacote, custo/margem, histórico e tratamento de conflitos. |
| Marketing | Tipos personalizados, múltiplas publicações, status Programado e persistência de roteiro. |
| Integração | API privada de leitura e base para sincronização reversa de ideias de Marketing. |
| Site e PWA | Site público, páginas de recursos/planos/cadastro, SEO social e cache atualizado. |

## 1. Acesso, planos e exportação de dados

Em 12/08, foi corrigido o caso em que contas criadas por e-mail e senha poderiam não ser reconhecidas como administradoras, mesmo sendo proprietárias da empresa. A identificação passou a considerar diretamente o vínculo de propriedade, e as telas de **Planos**, **Assinatura** e **Financeiro** passaram a aguardar a consulta de permissões em vez de bloquear o acesso antecipadamente.

Também foi incluída a exportação SQL administrativa em Configurações. Ela exporta a estrutura necessária e os dados da empresa atual, isolando os dados de outras empresas e excluindo itens sensíveis como tokens, sessões, chaves e credenciais de integração.

| Melhoria | Como o sistema se comporta agora |
|---|---|
| Proprietária não reconhecida como admin | A proprietária tem acesso administrativo pelo vínculo de empresa, mesmo se a leitura do grupo atrasar ou falhar. |
| Consulta de permissões | As telas sensíveis exibem carregamento durante a validação, evitando bloqueio indevido. |
| Exportação SQL | Administradoras podem exportar dados da própria empresa sem incluir segredos operacionais ou informações de outras empresas. |

## 2. Agenda, pré-agendamentos e automações

Foram reforçadas as regras de disponibilidade: agendamentos cancelados, cancelados pela cliente, faltas e remarcados não ocupam mais horário em verificações de conflito. Essa proteção foi aplicada tanto no painel quanto no portal.

O fluxo de pré-agendamento também foi ajustado. A ação de confirmar reserva passou a registrar o sinal como pagamento parcial, promover o atendimento para agendado, atualizar o Pipeline e disparar o evento correto de automação.

O conjunto de correções de automação passou a revogar mensagens pendentes quando um atendimento é cancelado, marcado como falta ou remarcado. O worker revalida o status antes de chamar o WhatsApp, reduzindo a possibilidade de uma mensagem ser enviada após o cancelamento. A fila também passou a recuperar processamentos interrompidos e a usar a instância de WhatsApp correta de cada empresa PRO.

| Situação | Comportamento atualizado |
|---|---|
| Cancelamento/falta/remarcação | Envios pendentes e agendados vinculados são revogados; somente a automação específica permitida para o evento permanece elegível. |
| Sinal recebido após o prazo | O fluxo reconhece a promoção para Agendado e aciona o evento de criação/agendamento correspondente, sem depender de mensagens de pré-agendamento. |
| Data ou horário alterados | Lembretes futuros calculados com a data antiga são cancelados e recriados conforme a nova data/hora. |
| Lembrete que já passou após reagendar | É colocado como pendente para envio imediato quando ainda fizer sentido, em vez de ser descartado. |
| Automação filtrada por serviço | Cursos, maquiagem externa e demais serviços passam a respeitar o filtro de serviço no pré-registro e antes do envio. |

## 3. Pacotes, sessões e financeiro

O módulo de Pacotes recebeu uma evolução extensa. Ao abrir um pacote, é possível criar sessões com data, hora, profissional e serviço. Sessões futuras são mantidas como reserva até a conclusão do atendimento e são liberadas em casos de cancelamento ou remarcação.

O sistema também passou a permitir múltiplos serviços do mesmo pacote em uma única sessão, calculando duração total e registrando o consumo de cada item. Para conflitos de agenda na abertura, são apresentadas opções para ajustar horários, abrir o pacote sem as sessões conflitantes ou confirmar conscientemente a sobreposição.

No financeiro, o pacote agora possui valor total, sinal, pagamentos parciais, saldo devedor, custo total e margem prevista. O financeiro individual dos agendamentos vinculados deixa de duplicar a cobrança do pacote.

| Recurso | Resultado prático |
|---|---|
| Histórico de sessões | Cada pacote exibe sessões clicáveis com data, hora, serviço, profissional e status. |
| Desfazer uso | Um consumo manual acidental pode ser revertido sem recriar o pacote; consumos de atendimentos concluídos continuam protegidos. |
| Exclusão definitiva | Só é permitida para pacotes cancelados sem sessões, agendamentos ou pagamentos reais vinculados. |
| Custo e margem | São cadastrados no modelo e acompanhados na abertura, edição, cards e relatório financeiro. |
| Automação de pacote | Sessões criadas pelo pacote entram no fluxo normal de “Agendamento criado”, respeitando filtros por serviço. |

## 4. Marketing e Redes Sociais

O Marketing recebeu correções e recursos para organizar o conteúdo em ideias e publicações. Ideias sem data permanecem no Banco de Ideias; quando recebem data, entram no calendário editorial como publicações planejadas.

Os tipos de conteúdo agora aceitam tipos padrão e tipos personalizados da empresa. O formulário, os filtros e a persistência usam o nome real do tipo personalizado, evitando o erro que ocorria ao salvar tipos como “MM”, “Tutorial” ou “Carrossel”.

Também foi criado o status **Programado**, visível no calendário, filtros e cards. O fluxo passou a permitir adicionar novas publicações ao editar um conteúdo existente: cada uma pode ter sua própria plataforma, formato, data, horário e responsável, preservando tema, roteiro, observações e tags comuns.

| Recurso | Resultado prático |
|---|---|
| Tipos personalizados | Podem ser usados em posts e ideias sem ficarem limitados ao enum antigo de categorias padrão. |
| Roteiro | É salvo e reaberto corretamente durante a edição. |
| Publicações múltiplas | Um mesmo conteúdo pode gerar várias publicações independentes com datas, redes e horários diferentes. |
| Status Programado | Diferencia conteúdo somente editado de conteúdo já programado para publicação. |
| Banco de Ideias | Mantém conteúdos sem data separados de Calendário e Meus Posts. |

## 5. Integrações e sincronização de dados

Foi adicionada uma API privada versionada de sincronização **somente leitura**, destinada a um aplicativo ou sistema próprio que precisa consultar as empresas e entidades operacionais do Hubly. Ela inclui carga paginada, cursor incremental, tratamento de exclusões, credenciais revogáveis, assinatura HMAC, auditoria e sanitização de campos sensíveis.

Na atualização mais recente, entrou também a base de uma **sincronização reversa** para ideias de Marketing. O endpoint de entrada recebe lotes autenticados, vincula cada registro a uma empresa e usa identificadores externos e `X-Request-Id` para evitar duplicidade de processamento. A ativação com outro sistema depende do provisionamento de credenciais e da definição do contrato final com o desenvolvedor da outra ponta.

| Integração | Estado atual |
|---|---|
| Leitura do Hubly por sistema externo | API privada v1 disponível, com autenticação, auditoria, paginação e catálogo de entidades. |
| Escrita externa no Hubly | Estrutura de sincronização reversa preparada inicialmente para Ideias de Marketing. Deve ser homologada com credenciais e identificadores externos antes do uso em produção. |
| Dados sensíveis | Tokens, senhas, sessões e chaves são excluídos da API e da exportação de dados. |

## 6. Site público, planos e experiência PWA

Foi criada uma experiência pública para o Hubly, com página inicial, recursos, como funciona, páginas por solução, assinaturas e cadastro. Os botões de conversão levam ao fluxo de criar conta, enquanto o acesso existente permanece separado.

O site recebeu metadados de compartilhamento, imagem Open Graph, FAQ expansível e ajustes de cache do Service Worker, reduzindo o risco de navegadores continuarem mostrando a versão antiga.

| Área pública | Atualização |
|---|---|
| Páginas | Início, Recursos, Como funciona, Para seu negócio, soluções por área, Assinaturas e Cadastro. |
| Compartilhamento | Título, descrição, cor de tema, URL canônica e imagem Open Graph atualizados. |
| Cache | Service Worker versionado para buscar a versão atual em instalações e navegadores já existentes. |
| Mobile/PWA | Ajustes de responsividade, safe area, alvos de toque e manifesto para melhor comportamento em Android e iOS. |

## 7. O que foi aplicado localmente nesta sincronização

Após trazer a versão do Git, o banco local ainda não possuía algumas migrações que o código atualizado já utilizava. Elas foram aplicadas sem remoção de dados.

| Ajuste local aplicado | Finalidade | Validação |
|---|---|---|
| `marketing_posts.tipo` convertido para `VARCHAR(100)` | Permitir armazenar tipos personalizados de conteúdo sem rejeição pelo enum antigo. | Coluna confirmada como `varchar(100)`. |
| `historico_envios_automacao.processandoEm` | Permitir que o worker recupere envios interrompidos. | Coluna criada e leitura validada. |
| `historico_envios_automacao.enviadoEm` e `canceladoEm` | Registrar envio efetivo e cancelamento na fila. | Colunas criadas e leitura validada. |
| Ajustes de compilação | Corrigidos contratos de rota, permissões administrativas, paginação de sincronização e referências do router. | Verificação TypeScript sem erros. |
| Testes focalizados | Marketing e sincronização. | 10 arquivos e 26 testes aprovados. |

> Não houve exclusão ou sobrescrita de dados existentes durante as migrações locais.

## Próximos passos recomendados

O sistema está atualizado e as validações técnicas principais passaram. Como próximos testes funcionais, recomenda-se criar um post com o tipo personalizado **MM** ou outro tipo cadastrado, confirmar que uma automação pendente é processada normalmente e, caso a sincronização reversa seja ativada, realizar primeiro uma homologação com uma empresa de teste.
