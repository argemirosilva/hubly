# Plano de Implantação: Remoção de Mensagens Hardcoded e Unificação de Gatilhos

**Projeto:** Hubly — Sistema de Agendamento Inteligente  
**Data:** 24 de abril de 2026  
**Prioridade:** Crítica  
**Autor:** Manus AI

---

## 1. Diagnóstico — Situação Atual

A auditoria completa do código-fonte identificou **três pontos** onde o sistema envia mensagens WhatsApp com texto hardcoded (escrito diretamente no código), sem depender de uma automação configurada pelo usuário. Além disso, foram encontradas **quatro funções helper legadas** no arquivo `whatsapp.ts` que contêm mensagens fixas e não são mais chamadas por nenhuma parte do sistema, mas ainda existem no código e representam risco de uso futuro acidental.

### 1.1 Mensagens Hardcoded Ativas (em produção)

| # | Arquivo | Linha | Gatilho | Comportamento Atual | Risco |
|---|---------|-------|---------|---------------------|-------|
| **H1** | `server/routers.ts` | ~1617-1633 | `confirmarReserva` (reserva paga via Stripe/PIX) | Se **não** existir automação com evento `reserva_paga`, o sistema monta uma mensagem fixa "✅ Reserva Confirmada!" e envia ao cliente. Se existir automação, usa o template personalizado. | **Este é o problema reportado** — o envio #540029 veio daqui. |
| **H2** | `server/routers.ts` | ~5110-5130 | `creditos.registrar` (crédito manual ou por pagamento a maior) | Monta mensagem fixa "💰 Crédito Disponível!" e envia diretamente via `routedSendMessage`, **sem passar pela fila de automações** e sem verificar se existe automação configurada. | Envio direto, sem controle do usuário. |

### 1.2 Funções Helper Legadas (não chamadas, mas existentes)

| # | Arquivo | Função | Mensagem Fixa |
|---|---------|--------|---------------|
| **L1** | `server/whatsapp.ts` | `sendAgendamentoConfirmacao()` | "✅ Agendamento Confirmado!" — texto fixo com dados do agendamento |
| **L2** | `server/whatsapp.ts` | `sendAgendamentoCancelado()` | "❌ Agendamento Cancelado" — texto fixo com dados do agendamento |
| **L3** | `server/whatsapp.ts` | `sendPacoteVencendo()` | "⚠️ Aviso de Pacote" — texto fixo com dados do pacote |
| **L4** | `server/whatsapp.ts` | `sendCreditoGerado()` | "💰 Crédito Disponível!" — texto fixo com dados do crédito |

Nenhuma dessas funções é importada ou chamada em nenhum lugar do projeto atualmente. Elas são código morto, mas sua presença cria risco de que alguém as reutilize no futuro.

### 1.3 Pontos que JÁ Estão Corretos

O restante do sistema de automações **já funciona corretamente** com a regra "sem automação = sem envio":

- **Criação de agendamento** (`agendamento_criado` / `agendamento_pre_agendado`): Se não há automação ativa, o sistema loga "Nenhuma automação ativa para ag. X — envio ignorado" e **não envia nada**. Correto.
- **Mudança de status** (`agendamento_confirmado`, `agendamento_cancelado`, `agendamento_concluido`): Se não há automações ativas para o evento, loga "Nenhuma automação ativa — envio ignorado". Correto.
- **Scheduler** (dias_antes, horas_antes, horas_apos, dias_depois, aniversario_mes, data_fixa, sessoes_acabando): Todos buscam automações ativas no banco e só enviam se encontrarem. Correto.
- **Fila de processamento** (`processarFilaPendente`): Processa apenas itens que foram explicitamente enfileirados por automações. Correto.

---

## 2. Plano de Ação — 4 Etapas

### Etapa 1: Eliminar o Fallback Hardcoded de "Reserva Confirmada" (H1)

**Arquivo:** `server/routers.ts`, procedure `confirmarReserva`

**O que mudar:** Atualmente o código faz:

```
const automacaoReserva = await getAutomacaoByEvento(empresa.id, 'reserva_paga');
// ... se não encontra automação, usa mensagemPadraoReserva (hardcoded)
const mensagemReserva = automacaoReserva?.corpoMensagem
  ? processarVariaveisTemplate(automacaoReserva.corpoMensagem, templateVarsReserva)
  : mensagemPadraoReserva;  // ← ESTE É O PROBLEMA
```

**Nova lógica (duas opções, conforme sua solicitação de unificação):**

Em vez de buscar apenas `reserva_paga`, o sistema buscará **primeiro** `reserva_paga` e, se não encontrar, buscará `agendamento_criado`. Se **nenhuma** das duas existir, **não envia nada**.

```
// 1. Buscar automação específica de reserva_paga
let automacaoReserva = await getAutomacaoByEvento(empresa.id, 'reserva_paga');
// 2. Fallback: usar automação de agendamento_criado
if (!automacaoReserva) {
  automacaoReserva = await getAutomacaoByEvento(empresa.id, 'agendamento_criado');
}
// 3. Se nenhuma automação existe → NÃO ENVIAR NADA
if (!automacaoReserva || !automacaoReserva.corpoMensagem) {
  console.log('[confirmarReserva] Nenhuma automação ativa — envio ignorado');
  // não enfileira, não envia
} else {
  const mensagem = processarVariaveisTemplate(automacaoReserva.corpoMensagem, templateVarsReserva);
  await registrarEnvioAutomacao({ ... mensagem ... });
}
```

**Resultado:** A mensagem de "Reserva Confirmada" será **sempre** a que você configurou na automação "Agendamento Criado" (ou na automação "Reserva Paga", se você criar uma específica). Se nenhuma automação estiver ativa, silêncio total.

### Etapa 2: Eliminar o Envio Direto de "Notificação de Crédito" (H2)

**Arquivo:** `server/routers.ts`, procedure `creditos.registrar`

**O que mudar:** Atualmente o código monta uma mensagem fixa e chama `routedSendMessage` diretamente, sem passar pela fila de automações. Esse envio acontece **sempre** que um crédito é registrado com `notificarWhatsApp !== false`.

**Nova lógica:** Substituir o envio direto por uma busca de automação com evento `credito_gerado`. Se não existir automação configurada, não envia nada.

```
// Buscar automação configurada para crédito
const automacaoCredito = await getAutomacaoByEvento(empresa.id, 'credito_gerado');
if (automacaoCredito && automacaoCredito.corpoMensagem) {
  const mensagem = processarVariaveisTemplate(automacaoCredito.corpoMensagem, templateVars);
  await registrarEnvioAutomacao({ ... mensagem ... status: 'pendente' ... });
} else {
  console.log('[Credito] Nenhuma automação de crédito configurada — envio ignorado');
}
```

**Nota:** Isso significa que, se você quiser que o cliente receba notificação de crédito, precisará criar uma automação com evento `credito_gerado` na tela de Automações. Se não criar, o crédito será registrado normalmente mas sem envio de WhatsApp.

### Etapa 3: Remover Funções Helper Legadas (L1-L4)

**Arquivo:** `server/whatsapp.ts`

**O que mudar:** Deletar completamente as quatro funções que não são mais chamadas:

- `sendAgendamentoConfirmacao()` (linhas 575-596)
- `sendAgendamentoCancelado()` (linhas 598-617)
- `sendPacoteVencendo()` (linhas 619-638)
- `sendCreditoGerado()` (linhas 640-660)

Essas funções usam `waManager.sendMessage()` diretamente (bypass da fila e do roteamento PRO/Baileys), o que é um antipadrão. Removê-las elimina qualquer risco de uso futuro acidental.

### Etapa 4: Testes de Validação

Criar ou atualizar testes unitários para garantir que:

1. Quando `confirmarReserva` é chamado **sem** automação `reserva_paga` nem `agendamento_criado`, nenhum envio é registrado na fila.
2. Quando `confirmarReserva` é chamado **com** automação `agendamento_criado` ativa, a mensagem personalizada é usada.
3. Quando `creditos.registrar` é chamado **sem** automação `credito_gerado`, nenhum envio é feito.
4. As funções helper legadas não existem mais no código.

---

## 3. Resumo da Unificação de Gatilhos

Conforme solicitado, a mensagem de "Agendamento Criado" será vinculada a dois gatilhos:

| Cenário | Gatilho Buscado | Fallback | Resultado |
|---------|----------------|----------|-----------|
| Agendamento criado com status `agendado` | `agendamento_criado` | — | Sua mensagem personalizada |
| Agendamento criado com status `pre_agendado` | `agendamento_pre_agendado` | `agendamento_criado` | Sua mensagem personalizada |
| Reserva paga (sinal confirmado) | `reserva_paga` | `agendamento_criado` | **Sua mesma mensagem personalizada** |
| Crédito gerado | `credito_gerado` | — | Só envia se automação existir |

O fluxo fica assim: **independente de como o agendamento entre** (direto ou via sinal), o cliente recebe **exclusivamente** a mensagem que você desenhou na automação "Agendamento Criado", a menos que você crie uma automação específica para `reserva_paga` com texto diferente.

---

## 4. Impacto e Riscos

**Impacto positivo:** Controle total sobre todas as mensagens enviadas. Nenhum texto sai do sistema sem sua aprovação explícita via tela de Automações.

**Risco controlado:** Se a automação "Agendamento Criado" estiver **desativada** e não houver automação `reserva_paga`, o cliente que pagar o sinal **não receberá** mensagem automática. Isso é intencional — se você desativou, é porque não quer enviar.

**Sem impacto em:** Lembretes (dias_antes, horas_antes), feedback (horas_apos, dias_depois), aniversário, data fixa, sessões acabando — todos já funcionam corretamente sem fallback hardcoded.

---

## 5. Cronograma Estimado

| Etapa | Tempo | Dependência |
|-------|-------|-------------|
| Etapa 1: Eliminar fallback de Reserva Confirmada | ~15 min | Nenhuma |
| Etapa 2: Eliminar envio direto de Crédito | ~10 min | Nenhuma |
| Etapa 3: Remover helpers legados | ~5 min | Nenhuma |
| Etapa 4: Testes | ~15 min | Etapas 1-3 |
| Checkpoint + Deploy | ~5 min | Etapa 4 |
| **Total** | **~50 min** | — |

---

## 6. Aprovação

Aguardando sua confirmação para iniciar a implementação. Posso executar todas as 4 etapas de uma vez e entregar o checkpoint final, ou posso ir etapa por etapa se preferir validar cada mudança individualmente.
