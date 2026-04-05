# Correções Pacotes e Comprovante IA — Design de Bugfix

## Visão Geral

Este documento formaliza a correção de três bugs inter-relacionados no sistema Hubly/Agendei:

- **Bug A**: Leitura de comprovante por IA falha porque o endpoint `/api/upload` não existe e o fallback base64 data URL é rejeitado pela validação Zod `z.string().url()`.
- **Bug B**: Pacotes contabilizam sessões em duplicidade — sessão decrementada na criação do agendamento E novamente na conclusão.
- **Bug C**: Componente `PacoteCard` na página Pacotes não possui botão de edição; funcionalidade existe apenas em `ClienteDetalhe.tsx`.

## Glossário

- **Bug_Condition (C)**: Conjunto de condições de entrada que disparam cada bug
- **Property (P)**: Comportamento correto esperado após a correção
- **Preservation**: Comportamentos existentes que não devem ser alterados pela correção
- **`lerComprovante`**: Mutation tRPC em `server/routers.ts` que recebe `imageUrl` e envia para a IA extrair dados do comprovante
- **`handleComprovanteUpload`**: Função no frontend (`AgendamentoDetalheModal.tsx`) que tenta upload via `/api/upload` e faz fallback para data URL
- **`pacoteClienteItemId`**: Campo em `agendamento_itens` que vincula um item de agendamento a um item de pacote do cliente
- **`quantidadeUsada`**: Contador de sessões consumidas em `pacotes_clientes_itens`
- **`PacoteCard`**: Componente em `Pacotes.tsx` que renderiza cada pacote na listagem geral

## Detalhes dos Bugs

### Bug A — Condição do Bug: Leitura de Comprovante

O bug manifesta quando o usuário faz upload de uma imagem de comprovante no modal de detalhes do agendamento. O frontend tenta `fetch('/api/upload')` que não existe, recebe erro, e no fallback converte para data URL (`data:image/...;base64,...`) que é rejeitada pela validação `z.string().url()` do Zod no input do `lerComprovante`.

**Especificação Formal:**
```
FUNCTION isBugCondition_A(input)
  INPUT: input de tipo { file: File, agendamentoId: number }
  OUTPUT: boolean

  RETURN file.type STARTS_WITH 'image/'
         AND endpoint '/api/upload' NÃO EXISTE no servidor
         AND fallback gera dataUrl com prefixo 'data:'
         AND z.string().url() REJEITA dataUrl
END FUNCTION
```

### Bug B — Condição do Bug: Contagem Dupla de Sessões

O bug manifesta quando um agendamento é criado com `pacoteClienteItemId` (vinculado a pacote). Na criação (`agendamentos.create`), `quantidadeUsada` é incrementada. Ao concluir o agendamento (`agendamentos.update` com `status === "concluido"`), o handler de abatimento automático incrementa novamente sem verificar se já foi vinculado.

**Especificação Formal:**
```
FUNCTION isBugCondition_B(input)
  INPUT: input de tipo { agendamentoId: number, novoStatus: string }
  OUTPUT: boolean

  agendamento := getAgendamentoById(input.agendamentoId)
  itens := getItensByAgendamento(input.agendamentoId)

  RETURN input.novoStatus == "concluido"
         AND EXISTS item IN itens WHERE item.pacoteClienteItemId IS NOT NULL
         AND pacoteAtivo(agendamento.clienteId, agendamento.servicoId)
END FUNCTION
```

### Bug C — Condição do Bug: Ausência de Botão de Edição

O bug manifesta quando o administrador visualiza pacotes na página Pacotes (aba "Pacotes por Cliente"). O componente `PacoteCard` aceita apenas `onConsumir`, `onCancelar` e `onRenovar` como callbacks — não há `onEditar`.

**Especificação Formal:**
```
FUNCTION isBugCondition_C(input)
  INPUT: input de tipo { pagina: string, pacoteId: number }
  OUTPUT: boolean

  RETURN input.pagina == "Pacotes"
         AND componenteRenderizado == "PacoteCard"
         AND NOT existeBotaoEditar(pacoteId)
END FUNCTION
```

### Exemplos

- **Bug A**: Usuário seleciona foto de comprovante PIX → fetch `/api/upload` retorna 404 → fallback gera `data:image/jpeg;base64,/9j/4AAQ...` → Zod rejeita → toast "Erro ao ler comprovante"
- **Bug B**: Admin cria agendamento vinculado ao pacote (sessão 3/5 → 4/5) → Admin conclui agendamento → handler automático incrementa de novo (4/5 → 5/5) → pacote marcado como concluído prematuramente
- **Bug B (sem vínculo)**: Admin cria agendamento SEM pacote → conclui → handler automático abate sessão corretamente (1x) — este caso deve continuar funcionando
- **Bug C**: Admin abre página Pacotes → aba "Pacotes por Cliente" → vê pacote ativo → não há botão de edição, apenas "Usar sessão" e "Cancelar"

## Comportamento Esperado

### Requisitos de Preservação

**Comportamentos Inalterados:**
- Cliques de mouse em botões existentes (Usar sessão, Cancelar, Renovar) devem continuar funcionando
- Criação e edição de modelos de pacotes deve permanecer inalterada
- Abertura de novos pacotes para clientes deve continuar funcionando
- Edição de pacotes na página ClienteDetalhe deve continuar funcionando normalmente
- Consumo manual de sessão (botão "Usar sessão") deve continuar decrementando corretamente
- Quando a IA retorna que a imagem não é comprovante válido, a mensagem de erro deve continuar sendo exibida
- Agendamentos criados SEM vínculo com pacote e depois concluídos devem CONTINUAR abatendo automaticamente na conclusão

**Escopo:**
Todas as entradas que NÃO envolvem as condições de bug acima devem ser completamente não afetadas. Isso inclui:
- Agendamentos sem vínculo com pacotes (abatimento automático na conclusão permanece)
- Operações CRUD de modelos de pacotes
- Fluxo de pagamentos que não envolvem comprovante por IA

## Causa Raiz Hipotética

### Bug A — Comprovante IA

1. **Endpoint inexistente**: O frontend tenta `fetch('/api/upload')` mas nenhuma rota REST `/api/upload` foi implementada no servidor. O sistema usa tRPC, não REST.
2. **Validação Zod restritiva**: O input `imageUrl: z.string().url()` rejeita data URLs (`data:image/...;base64,...`) porque `z.string().url()` valida apenas URLs HTTP/HTTPS.
3. **Solução**: Enviar a imagem como base64 diretamente via tRPC (sem necessidade de endpoint REST de upload) e relaxar a validação para aceitar data URLs ou mudar o input para aceitar base64 string.

### Bug B — Contagem Dupla

1. **Decremento na criação**: Em `agendamentos.create` (routers.ts ~linha 779), quando `pacoteClienteItemId` está presente, `quantidadeUsada` é incrementada.
2. **Decremento na conclusão**: Em `agendamentos.update` (routers.ts ~linha 976), quando `status === "concluido"`, o handler busca pacote ativo do cliente com o mesmo serviço e incrementa `quantidadeUsada` novamente — sem verificar se o agendamento já tem vínculo com pacote via `agendamentoItens.pacoteClienteItemId`.
3. **Solução**: No handler de conclusão, verificar se o agendamento já possui itens com `pacoteClienteItemId` preenchido. Se sim, pular o abatimento automático.

### Bug C — Botão de Edição

1. **Props incompletas**: `PacoteCard` recebe `onConsumir`, `onCancelar` e `onRenovar`, mas não `onEditar`.
2. **Funcionalidade existente no backend**: O endpoint `pacotes.editarPacote` já existe no router.
3. **Funcionalidade existente em outra página**: `ClienteDetalhe.tsx` já implementa o modal de edição completo.
4. **Solução**: Adicionar prop `onEditar` ao `PacoteCard` e implementar o modal de edição na página Pacotes, reutilizando a lógica existente.

## Propriedades de Corretude

Property 1: Bug Condition A — Upload de Comprovante Aceita Imagem Base64

_Para qualquer_ entrada onde o usuário faz upload de uma imagem válida de comprovante, a função corrigida SHALL aceitar a imagem (via base64 data URL ou string base64), enviar para a IA e retornar os dados extraídos sem erro de validação Zod.

**Valida: Requisitos 2.1**

Property 2: Bug Condition B — Sessão Decrementada Apenas Uma Vez

_Para qualquer_ agendamento criado com `pacoteClienteItemId` (vinculado a pacote), ao ser concluído, a função corrigida SHALL NÃO decrementar a sessão novamente, mantendo a contagem correta (apenas 1 decremento total).

**Valida: Requisitos 2.2, 2.3**

Property 3: Preservation B — Abatimento Automático Sem Vínculo Prévio

_Para qualquer_ agendamento criado SEM `pacoteClienteItemId` e depois concluído, a função corrigida SHALL continuar abatendo automaticamente a sessão do pacote ativo do cliente (se existir), preservando o comportamento original.

**Valida: Requisitos 3.1**

Property 4: Bug Condition C — Botão de Edição Presente no PacoteCard

_Para qualquer_ pacote renderizado na página Pacotes (aba "Pacotes por Cliente"), o componente corrigido SHALL exibir um botão de edição que permite alterar nome, valor, forma de pagamento, parcelas, data de vencimento, observações e quantidades dos itens.

**Valida: Requisitos 2.4**

Property 5: Preservation — Funcionalidades Existentes Inalteradas

_Para qualquer_ entrada que NÃO envolva as condições de bug (upload de comprovante, conclusão de agendamento com pacote vinculado, edição de pacote na página Pacotes), a função corrigida SHALL produzir o mesmo resultado que a função original, preservando criação de modelos, abertura de pacotes, consumo manual de sessões e edição em ClienteDetalhe.

**Valida: Requisitos 3.2, 3.3, 3.4, 3.5, 3.6**

## Implementação da Correção

### Mudanças Necessárias

Assumindo que a análise de causa raiz está correta:

#### Bug A — Comprovante IA

**Arquivo**: `server/routers.ts`
**Função**: `lerComprovante`

**Mudanças Específicas:**
1. **Alterar validação do input**: Mudar `imageUrl: z.string().url()` para aceitar data URLs base64. Opções: usar `z.string().min(1)` ou criar validação customizada que aceite tanto URLs HTTP quanto data URLs.
2. **Alternativa (preferível)**: Adicionar campo `imageBase64: z.string().optional()` ao input e permitir envio direto de base64 sem necessidade de URL.

**Arquivo**: `client/src/components/AgendamentoDetalheModal.tsx`
**Função**: `handleComprovanteUpload`

**Mudanças Específicas:**
1. **Remover tentativa de fetch `/api/upload`**: Eliminar o bloco try/catch que tenta o endpoint inexistente.
2. **Enviar base64 diretamente**: Converter o arquivo para base64 via FileReader e enviar diretamente na mutation `lerComprovante`.

#### Bug B — Contagem Dupla

**Arquivo**: `server/routers.ts`
**Função**: Handler de `agendamentos.update` (bloco `if (data.status === "concluido")`)

**Mudanças Específicas:**
1. **Verificar vínculo existente**: Antes de abater automaticamente, buscar os itens do agendamento (`agendamentoItens`) e verificar se algum tem `pacoteClienteItemId` preenchido.
2. **Pular abatimento se já vinculado**: Se existir item com `pacoteClienteItemId`, não executar o abatimento automático (a sessão já foi decrementada na criação).
3. **Manter abatimento para agendamentos sem vínculo**: Se nenhum item tem `pacoteClienteItemId`, continuar com o abatimento automático existente.

#### Bug C — Botão de Edição

**Arquivo**: `client/src/pages/Pacotes.tsx`
**Componente**: `PacoteCard`

**Mudanças Específicas:**
1. **Adicionar prop `onEditar`**: Incluir callback `onEditar?: (pacote: any) => void` nas props do `PacoteCard`.
2. **Adicionar botão de edição**: Renderizar ícone de edição (Pencil) no card, visível para pacotes ativos.
3. **Implementar modal de edição**: Adicionar estado e modal de edição na página Pacotes, similar ao existente em `ClienteDetalhe.tsx`.
4. **Usar mutation existente**: Reutilizar `trpc.pacotes.editarPacote` que já existe no backend.

## Estratégia de Testes

### Abordagem de Validação

A estratégia segue duas fases: primeiro, evidenciar contraexemplos que demonstram os bugs no código não corrigido, depois verificar que a correção funciona e preserva comportamentos existentes.

### Verificação Exploratória da Condição de Bug

**Objetivo**: Evidenciar contraexemplos que demonstram os bugs ANTES de implementar a correção. Confirmar ou refutar a análise de causa raiz.

**Plano de Teste**: Escrever testes que simulem os cenários de cada bug e executar no código não corrigido para observar falhas.

**Casos de Teste**:
1. **Bug A — Data URL Rejeitada**: Chamar `lerComprovante` com `imageUrl: "data:image/jpeg;base64,..."` (falhará na validação Zod no código não corrigido)
2. **Bug B — Contagem Dupla**: Criar agendamento com `pacoteClienteItemId`, verificar `quantidadeUsada`, concluir agendamento, verificar `quantidadeUsada` novamente (será incrementada 2x no código não corrigido)
3. **Bug C — Sem Botão Editar**: Renderizar `PacoteCard` e verificar ausência de botão/callback de edição (confirmará ausência no código não corrigido)

**Contraexemplos Esperados**:
- Bug A: Zod lança `ZodError` para data URLs
- Bug B: `quantidadeUsada` incrementada de 0→1 na criação e de 1→2 na conclusão (deveria ser apenas 0→1)
- Bug C: Componente não renderiza nenhum elemento de edição

### Verificação da Correção (Fix Checking)

**Objetivo**: Verificar que para todas as entradas onde a condição de bug se aplica, a função corrigida produz o comportamento esperado.

**Pseudocódigo:**
```
PARA TODO input ONDE isBugCondition_A(input) FAÇA
  resultado := lerComprovante_corrigido(input)
  ASSERT resultado.sucesso == true OU resultado.mensagem contém "não reconhecida"
FIM PARA

PARA TODO input ONDE isBugCondition_B(input) FAÇA
  qtdAntes := getQuantidadeUsada(input.pacoteClienteItemId)
  concluirAgendamento(input.agendamentoId)
  qtdDepois := getQuantidadeUsada(input.pacoteClienteItemId)
  ASSERT qtdDepois == qtdAntes  // não deve incrementar novamente
FIM PARA

PARA TODO input ONDE isBugCondition_C(input) FAÇA
  componente := renderizar PacoteCard(input.pacote)
  ASSERT componente CONTÉM botão de edição
FIM PARA
```

### Verificação de Preservação (Preservation Checking)

**Objetivo**: Verificar que para todas as entradas onde a condição de bug NÃO se aplica, a função corrigida produz o mesmo resultado que a original.

**Pseudocódigo:**
```
PARA TODO input ONDE NOT isBugCondition_B(input) FAÇA
  // Agendamento sem pacoteClienteItemId, concluído
  ASSERT comportamento_original(input) == comportamento_corrigido(input)
FIM PARA
```

**Abordagem de Teste**: Testes baseados em propriedades são recomendados para verificação de preservação porque:
- Geram muitos casos de teste automaticamente no domínio de entrada
- Capturam edge cases que testes manuais podem perder
- Fornecem garantias fortes de que o comportamento é inalterado para entradas não-bugadas

**Plano de Teste**: Observar comportamento no código não corrigido para interações normais, depois escrever testes que capturem esse comportamento.

**Casos de Teste**:
1. **Preservação de Abatimento Automático**: Verificar que agendamentos SEM `pacoteClienteItemId` continuam abatendo sessão na conclusão
2. **Preservação de Consumo Manual**: Verificar que botão "Usar sessão" continua funcionando corretamente
3. **Preservação de CRUD de Modelos**: Verificar que criação/edição/desativação de modelos não é afetada
4. **Preservação de Edição em ClienteDetalhe**: Verificar que edição de pacotes em ClienteDetalhe continua funcionando

### Testes Unitários

- Testar validação Zod do input `lerComprovante` com data URLs e URLs HTTP
- Testar lógica de verificação de vínculo com pacote antes do abatimento automático
- Testar renderização do `PacoteCard` com e sem callback `onEditar`
- Testar edge cases: agendamento com múltiplos itens, alguns vinculados e outros não

### Testes Baseados em Propriedades

- Gerar estados aleatórios de pacotes e agendamentos, verificar que sessões são decrementadas exatamente 1 vez
- Gerar configurações aleatórias de pacotes e verificar preservação do consumo manual
- Testar que para qualquer combinação de status de agendamento (exceto "concluido"), nenhum abatimento ocorre

### Testes de Integração

- Fluxo completo: upload de comprovante → leitura IA → pré-preenchimento do formulário de pagamento
- Fluxo completo: criar agendamento com pacote → concluir → verificar contagem de sessões
- Fluxo completo: abrir página Pacotes → clicar editar → alterar dados → salvar → verificar atualização
