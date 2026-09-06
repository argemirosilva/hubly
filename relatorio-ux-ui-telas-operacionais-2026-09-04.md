# Auditoria UX/UI — telas operacionais do Hubly

**Data da avaliação:** 4 de setembro de 2026  
**Plano revisado em:** 5 de setembro de 2026, após alinhamento com a cliente
**Perspectiva:** UX/UI sênior para operação diária de negócio de serviços  
**Ambiente revisado:** sessão autenticada da profissional Maria, em produção, com dados reais. A avaliação foi somente de leitura: nenhum cadastro, agendamento, pagamento ou automação foi alterado.

## Resumo executivo

O Hubly já tem uma base visual consistente, com boa identidade, hierarquia de navegação e cobertura funcional para uma rotina completa: agenda, clientes, cobranças, pacotes, relacionamento e conteúdo. Os maiores ganhos de experiência não estão em acrescentar funções; estão em **diminuir o ruído em momentos de decisão**, **explicitar o que pede ação agora** e **evitar que valores zerados ou estados ambíguos prejudiquem a confiança nos dados**.

O produto hoje privilegia a cobertura de informação. A evolução recomendada é privilegiar a orientação operacional: a profissional deve abrir a tela e responder rapidamente, sem procurar filtros ou interpretar números, a três perguntas: **o que vence hoje, o que precisa de mim e qual ação resolve isso?**

| Avaliação geral | Leitura |
|---|---|
| Cobertura da rotina | Alta. As principais jornadas estão disponíveis e conectadas. |
| Descoberta de ações | Média. Há ações úteis, porém parte delas fica escondida entre muitos filtros, indicadores ou ícones. |
| Clareza dos dados | Média. Alguns valores e estados exigem contexto para não parecerem erro. |
| Segurança operacional | Média. Ações destrutivas e ações de alteração de status poderiam ter uma hierarquia mais cuidadosa. |
| Responsividade | O portal público foi validado em 375×812 sem quebras. Para as telas internas, a validação mobile passa a ser obrigatória antes de considerar qualquer melhoria concluída ou pronta para migração ao aplicativo. |

> **Direção de UX recomendada:** não fazer uma reformulação ampla. O melhor caminho é uma sequência de ajustes cirúrgicos, começando por prioridades do dia, transparência de estado e redução da densidade de controles.

## Decisões de produto incorporadas após o retorno da cliente

O retorno da cliente acrescentou três restrições importantes ao plano. Elas não anulam a auditoria; tornam as recomendações mais precisas e evitam interpretações que poderiam descaracterizar a rotina já consolidada no Hubly.

| Tema | Decisão incorporada ao plano |
|---|---|
| Dashboard | Deve continuar **personalizável por usuária**. A orientação por prioridade organiza os componentes escolhidos, mas não impõe uma tela fixa nem remove a liberdade de selecionar atalhos e informações úteis. |
| Calendário | Deve preservar a lógica atual, os dias e horários livres e a visão de planejamento. A melhoria atua somente na descoberta e leitura de horários com múltiplos agendamentos. |
| Preparação para aplicativo | Toda melhoria passa a ter aceite mobile obrigatório, evitando campos sobrepostos, botões cortados, ações escondidas pelo teclado e elementos fora das áreas seguras do Android e do iOS. |

## Escopo revisado

Foram avaliadas as telas operacionais de uso recorrente: **Dashboard, Calendário, Agendamentos, Clientes, Financeiro, Contas a Receber, Pacotes, Pipeline, Marketing, Automações e o portal público de agendamento**.

Ficaram deliberadamente fora da análise as telas técnicas ou administrativas de configuração, como configurações gerais, integrações, meios de pagamento, permissões detalhadas, importação, assinatura e suporte técnico.

## Acertos que devem ser preservados

| Elemento | Por que funciona |
|---|---|
| Agenda do dia no Dashboard | Dá contexto imediato e reduz a necessidade de abrir o Calendário para checar atendimentos próximos. |
| Lista de Agendamentos | Mostra cliente, serviço, profissional, status, valor e saldo em aberto no mesmo item; favorece a conferência rápida. |
| Estrutura de Pacotes | Reúne sessões, saldo, pagamento e renovação na mesma entidade, acompanhando o modelo mental da profissional. |
| Análise financeira clicável | A passagem do resumo para uma tela detalhada filtrada evita relatórios duplicados e dá rastreabilidade aos números. |
| Portal em etapas | No celular, a identificação antes da escolha de serviço reduz o esforço inicial e torna a jornada progressiva. |
| Linguagem visual | Cartões, chips de status e superfícies seguem uma linguagem reconhecível, com aparência acolhedora e adequada ao segmento. |

## Achados priorizados

### P0 — remover obstrução recorrente do convite de instalação

O convite de instalação do aplicativo apareceu sobre a região inferior direita do Dashboard, Calendário, Marketing, Automações, Contas a Receber e portal público. Em telas longas, ele cobre conteúdo ou ações; no portal, concorre diretamente com a conversão do agendamento.

**Impacto:** alto, porque é persistente, ocupa uma zona útil da interface e afeta tanto a profissional quanto a cliente.  
**Recomendação:** transformar o convite em banner discreto no topo ou em card contextual após uma ação concluída. Quando dispensado, não deve reaparecer no mesmo período. Em telas de conversão, como o portal, não deve sobrepor formulário ou CTA.

### P1 — organizar o Dashboard personalizável por prioridades

O Dashboard reúne agenda, indicadores, equipe, pipeline, pré-agendamentos e recebimentos. A cobertura é boa e sua personalização deve ser preservada, pois a primeira tela precisa refletir o que cada usuária considera útil. O problema observado não é a possibilidade de escolher componentes, mas a falta de uma hierarquia clara entre os componentes escolhidos: conteúdos volumosos podem competir com atendimentos e pendências que exigem ação imediata.

**Impacto:** alto para rotina de abertura do sistema.  
**Recomendação revisada:** manter a escolha individual de componentes e permitir que a própria usuária defina o que aparece, o que fica oculto e a ordem de seus atalhos. Dentro dessa personalização, oferecer um componente opcional “**Hoje precisa de atenção**”, com até três itens acionáveis, como saldo a cobrar, confirmação pendente, pacote próximo do fim ou mensagem com falha. A agenda do dia permanece disponível e pode ser posicionada como prioridade pela usuária. A orientação por prioridade funciona como uma camada de organização, não como um Dashboard fixo para todas as contas.

| O que será preservado | O que será melhorado |
|---|---|
| Escolha dos componentes exibidos | Ordem inicial sugerida conforme urgência e frequência de uso |
| Atalhos definidos pela usuária | Possibilidade de reordenar, ocultar e restaurar componentes |
| Agenda do dia e demais blocos atuais | Componente opcional de pendências acionáveis e destaque de alertas reais |
| Diferenças de rotina entre proprietária e profissional | Preferências salvas por usuária, sem impor a mesma tela a todos |

### P1 — tornar Pipeline uma ferramenta de decisão, não apenas de status

O Pipeline mostra contagens por etapa, mas os cartões trazem o subtítulo genérico “Em andamento”. A mesma cliente pode aparecer várias vezes e não está claro se são jornadas diferentes ou repetição. Também não há destaque para próxima ação, prazo ou atraso.

**Impacto:** alto, pois dificulta priorizar contatos e pode induzir mensagens repetidas.  
**Recomendação:** exibir em cada cartão a **próxima ação**, a data de referência e um motivo de presença na coluna, por exemplo: “aguarda sinal até hoje, 18h” ou “enviar confirmação amanhã”. Incluir busca e filtros de urgência; se uma cliente tiver várias ocorrências, agrupar por agendamento ou diferenciar cada uma por data e serviço.

### P1 — explicar números financeiros zerados e diferenças de base

Financeiro, Clientes e Contas a Receber mostram combinações de atividade existente com valores zerados. Exemplo: há atendimento e pagamento exibidos, mas indicadores de receita ou de atividade aparecem em R$ 0,00 em outro bloco. Embora algumas diferenças sejam consequência do escopo da profissional ou de bases financeiras distintas, elas não estão visíveis para quem consulta.

**Impacto:** alto para confiança no produto.  
**Recomendação:** todo KPI financeiro deve trazer uma legenda curta de base e período, como “recebimentos registrados neste mês” ou “atendimentos concluídos do seu escopo”. Para blocos sem dados, substituir zero puro por um estado explicativo: “Sem recebimentos registrados neste período” ou “Este indicador é consolidado da empresa”. Manter a rota de análise detalhada como fonte de conferência.

### P1 — reduzir risco de ações destrutivas e acidentais em listas

Em Clientes e Contas a Receber, editar e remover aparecem repetidamente ao lado de cada linha. Em Automações, ativar, testar e abrir mais opções são ícones pequenos, visualmente próximos. Em Pacotes cancelados, ações de pagamento, sessões e exclusão recebem peso semelhante.

**Impacto:** alto, especialmente em celular.  
**Recomendação:** deixar a ação principal visível e mover ações secundárias e destrutivas para menu de contexto com rótulo. A remoção deve permanecer no final do menu, em vermelho, com confirmação que identifica claramente o item. Cards em estado cancelado ou concluído devem priorizar “ver histórico” e colocar ações excepcionais em um menu “Mais ações”.

### P2 — simplificar filtros em Agendamentos e Marketing

A lista de Agendamentos dispõe de busca, atalhos de período, duas datas, status, profissional, saldo e limpar. O Marketing inicia com abas, navegação temporal, visualizações, tipo, criação, IA, período, foco, filtros de serviços e métricas. São recursos válidos, mas todos competem pela atenção antes da tarefa principal.

**Recomendação:** adotar um padrão único: **busca + filtro rápido visível + botão “Filtros” com contador**. As opções menos frequentes entram em um painel recolhível. Em Marketing, manter no topo apenas período, “Novo post” e “Gerar pauta”; deslocar serviços, foco especial, visualização e filtros detalhados para uma faixa secundária ou drawer.

### P2 — melhorar descoberta e leitura do Calendário

O Calendário preserva a visão mensal e usa “+1 mais” quando necessário, o que é positivo. Porém, as células comprimem informações de atendimento, enquanto sobra muito espaço nos dias vazios. Os controles de mudança de mês não ficaram evidentes na avaliação visual.

**Recomendação revisada:** preservar os dias e horários vazios, a visão mensal e a lógica atual de navegação. A melhoria deve ocorrer apenas quando o espaço do calendário não comportar todos os agendamentos: o indicador “+1 mais” ou “+2 mais” precisa ter maior contraste, área de toque adequada e comportamento previsível. Ao acioná-lo, o sistema abre uma lista lateral no desktop ou inferior no celular com todos os agendamentos daquele dia ou horário, sem ocultar compromissos nem poluir as demais células. Os controles de mudança de mês devem ganhar rótulos e áreas de toque claras. No celular, as visões diária e semanal podem ser oferecidas como atalhos, mas a visão mensal continua disponível e não deve ser substituída sem validação com a usuária.

> **Esclarecimento:** a proposta não remove espaços vazios do calendário. Ela evita que, em horários cheios, um atendimento fique comprimido, escondido ou pareça inexistente.

| Situação | Comportamento esperado |
|---|---|
| Dia ou horário sem agendamento | Permanece visível como espaço livre. |
| Um agendamento | Continua exibido diretamente na célula ou faixa horária. |
| Vários agendamentos sem espaço suficiente | Exibe o primeiro conteúdo legível e um indicador claro da quantidade restante. |
| Toque no indicador de eventos adicionais | Abre a lista completa daquele dia ou horário, sem alterar os demais eventos. |
| Celular | Usa painel inferior ou tela de detalhe; não comprime botões nem informações essenciais. |

### P2 — diferenciar estado do pacote, estado das sessões e estado financeiro

Um pacote pode aparecer como concluído e, ao mesmo tempo, ter R$ 0,00 recebidos e saldo em aberto. Isso pode ser válido na regra de negócio, mas visualmente é contraditório. O card também reúne muitas linhas e botões para cada serviço.

**Recomendação:** separar em três chips: **uso das sessões**, **situação financeira** e **validade**. Exemplo: “Sessões concluídas”, “Pagamento pendente” e “Válido até…”. No card inicial, exibir só o resumo e duas ações principais; detalhes por serviço podem ser recolhidos.

### P2 — dar saúde operacional às Automações

A tela informa total, ativas e pausadas, mas não informa de forma imediata se uma automação está saudável. Para a operação diária, “Ativa” não responde se a última mensagem foi enviada, falhou ou está aguardando o próximo gatilho.

**Recomendação:** adicionar um status operacional: “último envio”, “próximo envio” ou “precisa de atenção”. Criar uma visualização padrão “Pendências” antes da listagem completa. Tornar a prévia de mensagem clicável para abrir o conteúdo completo e o histórico recente.

### P2 — ajustar portal público para manter foco na reserva

O portal em 375×812 não apresentou quebra visual, e o campo e CTA possuem bom tamanho. Entretanto, a primeira etapa deixa uma grande área vazia até o rodapé, e horário de funcionamento está pequeno e distante do momento de decisão.

**Recomendação:** reduzir a altura mínima da página nas primeiras etapas, aproximar a informação de funcionamento do botão e usar um bloco de orientação de leitura fácil. O convite PWA não deve sobrepor essa jornada. A marca institucional no rodapé pode ser menor, mas ainda precisa conservar legibilidade.

## Plano de melhoria recomendado

| Ordem | Frente | Entregas | Resultado esperado |
|---|---|---|---|
| 1 | Prioridade, personalização e segurança | Ajustar convite PWA; permitir ordenar e ocultar componentes do Dashboard; oferecer “Hoje precisa de atenção” como componente opcional; revisar ações destrutivas e estados financeiros. | Reduzir distrações e orientar a rotina sem retirar o controle da usuária. |
| 2 | Leitura e filtros | Padrão de filtros recolhíveis; melhorar somente a leitura de múltiplos eventos no Calendário; cards de Pacotes por estado. | Acelerar a consulta sem remover horários livres, alterar a lógica da agenda ou perder recursos avançados. |
| 3 | Execução de relacionamento | Pipeline com próxima ação e urgência; saúde de Automações; diferenciação de ocorrências da mesma cliente. | Aumentar a previsibilidade de contatos e reduzir mensagens indevidas. |
| 4 | Conteúdo e portal | Marketing com modo de foco; refinamento do portal público e revisão das etapas móveis autenticadas. | Melhorar planejamento de conteúdo e conversão de agendamento. |
| Transversal | Prontidão mobile | Aplicar a matriz de aceite mobile em todas as entregas anteriores antes de marcar cada uma como concluída. | Evitar retrabalho e impedir que problemas de responsividade sejam levados para o aplicativo. |

## Critérios obrigatórios de preparação mobile

A futura migração para aplicativo não deve ser tratada como uma etapa em que a interface será corrigida depois. As telas web operacionais precisam ser construídas e aceitas desde agora com comportamento mobile previsível. Dessa forma, a migração poderá reaproveitar os mesmos fluxos sem carregar problemas estruturais de layout.

| Área de validação | Critério de aceite obrigatório |
|---|---|
| Larguras de tela | Não apresentar sobreposição, corte ou rolagem horizontal acidental em 320, 360, 375, 390 e 430 px. Validar também 768 px e desktop. |
| Campos e filtros | Empilhar controles quando o espaço horizontal for insuficiente. Datas e horários devem permanecer legíveis, com rótulo visível e ordem lógica. |
| Botões e toque | Ação principal sempre inteira e alcançável; alvos de toque confortáveis; ações próximas não podem provocar toque acidental. |
| Teclado virtual | Ao abrir o teclado, o campo ativo e os botões de continuar ou salvar devem permanecer acessíveis por rolagem. |
| Modais e painéis | Usar tela cheia ou painel adaptado em celulares; impedir conteúdo fora da viewport e garantir cabeçalho/rodapé acessíveis. |
| Tabelas e relatórios | Converter para cards, resumo progressivo ou rolagem controlada; não reduzir colunas até o texto ficar ilegível. |
| Navegação | Não depender de hover; manter retorno claro, título da tela e acesso às ações principais. |
| Áreas seguras | Respeitar recortes de câmera, barra superior, indicador inferior e barras do sistema em Android e iOS. |
| Orientação e zoom | Verificar modo retrato em todas as rotas e paisagem nas telas que exigem visão ampla, como Calendário e relatórios. |
| Acessibilidade | Preservar contraste, foco, leitura por tecnologia assistiva e preferência de movimento reduzido. |
| Desempenho percebido | Evitar animações que atrasem o toque; exibir carregamento e impedir mudanças bruscas de layout. |

### Matriz mínima de validação por tipo de tela

| Tipo de tela | Cenários que precisam ser aprovados |
|---|---|
| Dashboard | Componentes em ordens diferentes, blocos ocultos, textos longos, alertas ativos e ausência de alertas. |
| Calendário | Dia vazio, um evento, vários eventos no mesmo horário, nomes longos, painel de detalhes e troca de período. |
| Formulários | Primeiro e último campo, seletor de data/hora, mensagens de erro, teclado aberto, salvar e cancelar. |
| Listas | Estado vazio, muitos registros, filtros abertos, ações por item, confirmação de exclusão e carregamento. |
| Financeiro e relatórios | Valores grandes, períodos longos, gráficos, detalhes laterais, filtros e ausência de dados. |
| Portal público | Todas as etapas, erros de preenchimento, teclado, seleção de horário, confirmação e instalação PWA sem sobreposição. |

> **Regra de conclusão:** nenhuma melhoria de interface será considerada pronta apenas por funcionar no computador. Para ser marcada como concluída, deverá passar pelos cenários mobile aplicáveis e não apresentar campos sobrepostos, botões cortados, conteúdo inacessível ou ações encobertas.

## Próxima decisão recomendada

A primeira implementação deve combinar três melhorias de alto retorno: **remover a obstrução do convite PWA**, **adicionar mecanismos de ordenar e ocultar componentes do Dashboard** e **tornar os estados financeiros autoexplicativos**. O componente “Hoje precisa de atenção” deve ser apresentado como opção configurável, não como substituição do Dashboard atual. Em paralelo, essa primeira entrega deverá validar os critérios mobile aplicáveis antes de ser aprovada.

## Limitações da avaliação

As telas administrativas foram observadas em uma sessão real de produção, em viewport desktop. O portal público foi também conferido em 375×812 e não apresentou corte horizontal. As telas internas têm padrões responsivos implementados, mas ainda precisam de inspeção visual autenticada em dispositivos móveis para que a avaliação mobile seja considerada concluída. Essa validação deixou de ser apenas uma recomendação futura e passou a integrar o aceite obrigatório de cada melhoria. Trata-se de uma limitação de cobertura atual, não de uma conclusão de que já exista falha no celular.
