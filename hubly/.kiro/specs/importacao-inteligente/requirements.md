# Documento de Requisitos — Importação Assistida Inteligente

## Introdução

Módulo de importação inteligente de dados que substitui a funcionalidade "Importar Zandu" como destino padrão de importação no sistema Hubly/Agendei. O módulo permite importar dados de arquivos Excel, CSV e PDF, detectando automaticamente o tipo de entidade e mapeando colunas para os campos do sistema. Toda a escrita no banco de dados é feita exclusivamente através dos serviços/procedures existentes (createCliente, createServico, createProfissional, createAgendamento), sem alteração de schema ou inserções diretas.

## Glossário

- **Sistema_Importacao**: Módulo de importação inteligente de dados via arquivo (backend + frontend)
- **Parser**: Componente responsável por extrair dados brutos de arquivos Excel, CSV ou PDF e convertê-los em formato estruturado JSON
- **Detector**: Componente que identifica automaticamente o tipo de entidade (clientes, serviços, profissionais, agendamentos) a partir dos nomes das colunas
- **Mapeador**: Componente que associa colunas do arquivo importado aos campos da entidade detectada usando similaridade de strings e dicionário de sinônimos
- **Transformador**: Componente que normaliza valores de dados (telefone, CPF, datas, moeda, status) para os formatos aceitos pelo sistema
- **Validador**: Componente que aplica regras de negócio existentes e classifica cada linha como ERROR, WARNING ou OK
- **Detector_Duplicatas**: Componente que verifica duplicatas comparando CPF/telefone (clientes), nome (serviços) ou email (profissionais) com registros existentes
- **Wizard**: Interface de 4 etapas (Upload → Configurar → Revisar → Importar) que guia o usuário pelo processo de importação
- **Linha_Importacao**: Uma linha individual de dados extraída do arquivo, representando um registro a ser importado
- **Mapa_Colunas**: Associação entre uma coluna do arquivo de origem e um campo da entidade de destino
- **Entidade_Destino**: Tipo de dado alvo da importação: clientes, servicos, profissionais ou agendamentos

## Requisitos

### Requisito 1: Upload de Arquivo

**User Story:** Como usuário do sistema, quero fazer upload de um arquivo contendo dados para importação, para que eu possa migrar informações de outras fontes para o Hubly.

#### Critérios de Aceitação

1. THE Sistema_Importacao SHALL aceitar arquivos nos formatos .xlsx, .xls, .csv e .pdf para upload
2. WHEN um arquivo com tamanho superior a 10MB for enviado, THE Sistema_Importacao SHALL rejeitar o upload e exibir mensagem informando o limite de 10MB
3. WHEN um arquivo com formato não suportado for enviado, THE Sistema_Importacao SHALL rejeitar o upload e exibir mensagem listando os formatos aceitos
4. THE Wizard SHALL fornecer uma área de drag-and-drop e um botão de seleção de arquivo para o upload
5. WHEN um arquivo válido for selecionado, THE Sistema_Importacao SHALL enviar o conteúdo codificado em base64 para o backend via tRPC procedure `importacao.parseFile`

### Requisito 2: Parsing de Arquivo

**User Story:** Como usuário, quero que o sistema extraia automaticamente os dados do meu arquivo, para que eu não precise copiar dados manualmente.

#### Critérios de Aceitação

1. WHEN um arquivo .xlsx ou .xls for recebido, THE Parser SHALL extrair colunas e linhas usando a biblioteca exceljs e retornar um objeto JSON com as propriedades `columns` (array de nomes de colunas) e `rows` (array de objetos chave-valor)
2. WHEN um arquivo .csv for recebido, THE Parser SHALL extrair colunas e linhas usando a biblioteca papaparse e retornar o mesmo formato JSON com `columns` e `rows`
3. WHEN um arquivo .pdf for recebido, THE Parser SHALL extrair texto usando pdf-parse, aplicar detecção heurística de tabelas e retornar o formato JSON com `columns` e `rows`
4. IF o Parser não conseguir extrair dados estruturados de um arquivo, THEN THE Sistema_Importacao SHALL retornar um erro descritivo informando que o arquivo não contém dados tabulares reconhecíveis
5. THE Parser SHALL processar todo o conteúdo em memória sem criar tabelas temporárias no banco de dados
6. WHEN o parsing for concluído com sucesso, THE Parser SHALL retornar o número total de linhas extraídas junto com os dados

### Requisito 3: Detecção Automática de Tipo de Entidade

**User Story:** Como usuário, quero que o sistema identifique automaticamente que tipo de dado estou importando, para que eu não precise configurar manualmente.

#### Critérios de Aceitação

1. WHEN colunas forem extraídas de um arquivo, THE Detector SHALL analisar os nomes das colunas usando heurísticas de palavras-chave e retornar o tipo de entidade sugerido (clientes, servicos, profissionais ou agendamentos)
2. THE Detector SHALL utilizar um dicionário de sinônimos em português para mapear variações comuns de nomes de colunas (ex: "fone", "cel", "celular", "phone" → telefone)
3. WHEN a detecção automática retornar um resultado, THE Wizard SHALL exibir o tipo detectado com opção de override manual pelo usuário
4. IF o Detector não conseguir determinar o tipo de entidade com confiança, THEN THE Sistema_Importacao SHALL solicitar que o usuário selecione manualmente o tipo de entidade

### Requisito 4: Mapeamento de Colunas

**User Story:** Como usuário, quero que as colunas do meu arquivo sejam automaticamente associadas aos campos corretos do sistema, para agilizar a configuração.

#### Critérios de Aceitação

1. WHEN o tipo de entidade for determinado, THE Mapeador SHALL gerar automaticamente um Mapa_Colunas usando similaridade de strings (distância de Levenshtein ou similar) e o dicionário de sinônimos
2. THE Wizard SHALL exibir o mapeamento sugerido com controles visuais (select/dropdown) para que o usuário possa ajustar cada associação coluna-campo
3. THE Mapeador SHALL permitir que o usuário marque colunas como "ignorar" para excluí-las da importação
4. THE Mapeador SHALL mapear colunas para os seguintes campos por tipo de entidade:
   - Clientes: nome, telefone, email, cpf, dataNascimento, endereco, observacoes
   - Serviços: nome, valor, duracaoMinutos, categoria
   - Profissionais: nome, email, telefone, especialidade
   - Agendamentos: clienteNome ou telefone, servicoNome, profissionalNome, data, horaInicio, status

### Requisito 5: Transformação e Normalização de Dados

**User Story:** Como usuário, quero que o sistema normalize automaticamente os dados do meu arquivo para os formatos aceitos pelo Hubly, para que eu não precise formatar manualmente.

#### Critérios de Aceitação

1. THE Transformador SHALL normalizar números de telefone para o formato aceito pelo sistema, removendo caracteres não numéricos e aplicando formatação brasileira
2. THE Transformador SHALL normalizar CPFs removendo pontuação e validando o formato de 11 dígitos
3. THE Transformador SHALL converter datas em formatos variados (dd/mm/yyyy, mm/dd/yyyy, yyyy-mm-dd, "1 jan 2024") para o formato ISO yyyy-mm-dd
4. THE Transformador SHALL converter valores monetários em formatos variados ("R$ 150,00", "150.00", "150") para formato decimal com ponto como separador
5. THE Transformador SHALL converter valores de status de agendamento para os enums aceitos pelo sistema: agendado, confirmado, concluido, cancelado, faltou
6. THE Transformador SHALL converter valores de duração em formatos variados ("1h", "1:00", "60min", "60") para inteiro representando minutos

### Requisito 6: Validação de Dados

**User Story:** Como usuário, quero que o sistema valide os dados antes da importação, para que eu possa corrigir problemas antes de executar.

#### Critérios de Aceitação

1. THE Validador SHALL classificar cada Linha_Importacao como ERROR (campo obrigatório ausente ou formato inválido), WARNING (dado suspeito mas importável) ou OK (válido para importação)
2. WHEN o tipo de entidade for "clientes", THE Validador SHALL exigir o campo "nome" como obrigatório e validar formato de email, CPF e telefone quando presentes
3. WHEN o tipo de entidade for "servicos", THE Validador SHALL exigir os campos "nome" e "valor" como obrigatórios e validar que "valor" é um número positivo e "duracaoMinutos" é um inteiro positivo
4. WHEN o tipo de entidade for "profissionais", THE Validador SHALL exigir o campo "nome" como obrigatório e validar formato de email e telefone quando presentes
5. WHEN o tipo de entidade for "agendamentos", THE Validador SHALL exigir os campos "clienteNome" ou "telefone", "servicoNome", "profissionalNome", "data" e "horaInicio" como obrigatórios
6. THE Validador SHALL retornar para cada linha com erro ou warning uma lista de mensagens descritivas indicando o campo e o problema encontrado

### Requisito 7: Detecção de Duplicatas

**User Story:** Como usuário, quero que o sistema identifique registros que já existem no Hubly, para que eu possa decidir como tratá-los.

#### Critérios de Aceitação

1. WHEN o tipo de entidade for "clientes", THE Detector_Duplicatas SHALL verificar duplicatas comparando CPF e telefone com os clientes existentes da empresa
2. WHEN o tipo de entidade for "servicos", THE Detector_Duplicatas SHALL verificar duplicatas comparando o nome (case-insensitive, trimmed) com os serviços existentes da empresa
3. WHEN o tipo de entidade for "profissionais", THE Detector_Duplicatas SHALL verificar duplicatas comparando email (case-insensitive) com os profissionais existentes da empresa
4. WHEN uma duplicata for detectada, THE Sistema_Importacao SHALL marcar a Linha_Importacao como WARNING com a mensagem indicando o registro existente encontrado
5. THE Wizard SHALL oferecer três opções de tratamento de duplicatas: "Pular" (ignorar duplicatas), "Atualizar" (mesclar com existente) e "Criar novo" (permitir duplicata)

### Requisito 8: Preview e Edição

**User Story:** Como usuário, quero visualizar e editar os dados antes de confirmar a importação, para que eu tenha controle total sobre o que será importado.

#### Critérios de Aceitação

1. THE Wizard SHALL exibir uma tabela de preview com todas as Linhas_Importacao mostrando os dados mapeados e transformados
2. THE Wizard SHALL colorir as linhas da tabela de preview de acordo com o status: verde para OK, amarelo para WARNING e vermelho para ERROR
3. THE Wizard SHALL permitir edição inline dos valores em cada célula da tabela de preview
4. THE Wizard SHALL permitir que o usuário delete linhas individuais da tabela de preview
5. THE Wizard SHALL fornecer filtros para exibir linhas por status (OK, WARNING, ERROR, duplicatas)
6. THE Wizard SHALL exibir um resumo com contadores de linhas OK, WARNING e ERROR acima da tabela

### Requisito 9: Execução da Importação

**User Story:** Como usuário, quero que a importação seja executada de forma segura e com feedback visual, para que eu acompanhe o progresso.

#### Critérios de Aceitação

1. WHEN o usuário confirmar a importação, THE Sistema_Importacao SHALL processar apenas as Linhas_Importacao com status OK ou WARNING (com opção de duplicata selecionada)
2. THE Sistema_Importacao SHALL executar a importação chamando exclusivamente os tRPC procedures existentes: clientes.create para clientes, servicos.create para serviços, profissionais.create para profissionais e agendamentos.create para agendamentos
3. THE Sistema_Importacao SHALL processar as linhas em lotes de 100 registros para evitar sobrecarga
4. WHILE a importação estiver em andamento, THE Wizard SHALL exibir uma barra de progresso indicando o percentual de linhas processadas
5. IF um erro ocorrer durante a importação de uma linha individual, THEN THE Sistema_Importacao SHALL registrar o erro e continuar processando as linhas restantes
6. WHEN a importação for concluída, THE Wizard SHALL exibir um resumo com: total processado, total com sucesso, total com erro e tempo decorrido

### Requisito 10: Relatório de Resultados

**User Story:** Como usuário, quero um relatório detalhado dos resultados da importação, para que eu saiba exatamente o que foi importado e o que falhou.

#### Critérios de Aceitação

1. WHEN a importação for concluída, THE Sistema_Importacao SHALL exibir um resumo visual com cards mostrando total processado, sucessos, erros e tempo decorrido
2. WHEN houver erros na importação, THE Sistema_Importacao SHALL oferecer opção de download de um arquivo CSV contendo o log de erros com: número da linha, dados da linha e mensagem de erro
3. THE Wizard SHALL permitir que o usuário inicie uma nova importação a partir da tela de resultados

### Requisito 11: Rotas e Navegação

**User Story:** Como usuário, quero acessar a nova importação facilmente pelo menu do sistema, para que eu encontre a funcionalidade sem dificuldade.

#### Critérios de Aceitação

1. THE Sistema_Importacao SHALL ser acessível pela rota `/admin/importacao-inteligente` no frontend
2. THE Sistema_Importacao SHALL ser o destino padrão de importação na navegação do sistema
3. THE Sistema_Importacao SHALL manter a página ImportacaoZandu existente acessível na rota `/admin/importacao` para compatibilidade retroativa

### Requisito 12: Backend — Router tRPC

**User Story:** Como desenvolvedor, quero endpoints tRPC bem definidos para o módulo de importação, para que o frontend possa se comunicar com o backend de forma tipada.

#### Critérios de Aceitação

1. THE Sistema_Importacao SHALL expor um router tRPC `importacao` com as procedures: `parseFile`, `detectType`, `validate` e `execute`
2. WHEN `importacao.parseFile` for chamado com um arquivo base64 e o tipo de arquivo, THE Sistema_Importacao SHALL retornar um objeto com `columns` (string[]) e `rows` (Record<string, string>[])
3. WHEN `importacao.detectType` for chamado com um array de nomes de colunas, THE Sistema_Importacao SHALL retornar o tipo de entidade sugerido e o score de confiança
4. WHEN `importacao.validate` for chamado com linhas mapeadas e tipo de entidade, THE Sistema_Importacao SHALL retornar as linhas com status (ERROR/WARNING/OK) e mensagens de validação
5. WHEN `importacao.execute` for chamado com linhas validadas e tipo de entidade, THE Sistema_Importacao SHALL executar a importação via serviços existentes e retornar o resultado com contadores de sucesso e erro
6. THE Sistema_Importacao SHALL processar todos os dados em memória sem criar tabelas temporárias no banco de dados

### Requisito 13: Integridade e Segurança

**User Story:** Como administrador do sistema, quero que a importação respeite todas as regras de negócio existentes, para que dados inválidos não entrem no sistema.

#### Critérios de Aceitação

1. THE Sistema_Importacao SHALL utilizar exclusivamente as funções de serviço existentes (createCliente, createServico, createProfissional, createAgendamento) para persistir dados, sem inserções diretas no banco
2. THE Sistema_Importacao SHALL associar todos os registros importados à empresa do usuário autenticado (empresaId do contexto)
3. THE Sistema_Importacao SHALL validar que o usuário possui autenticação ativa antes de permitir qualquer operação de importação (protectedProcedure)
4. THE Sistema_Importacao SHALL rejeitar qualquer tentativa de importação que não passe pela validação de campos obrigatórios da entidade de destino
