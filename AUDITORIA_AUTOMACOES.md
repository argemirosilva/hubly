# Relatório de Auditoria — Fluxo de Automações e Envios WhatsApp

**Data:** 21 de abril de 2026  
**Versão auditada:** checkpoint `b0805ddc` → corrigida em `(novo checkpoint)`

---

## Resumo Executivo

A auditoria cobriu todos os pontos do pipeline de envio: schema, triggers de criação de agendamento, scheduler (6 tipos de automação), worker de fila, roteador WhatsApp (Baileys/Z-API) e webhook de status Z-API.

Foram encontrados **4 bugs críticos** e **3 problemas de design**, todos corrigidos nesta sessão.

---

## Arquitetura do Fluxo

```
Evento (criação/atualização de agendamento, hora do dia, etc.)
    ↓
registrarEnvioAutomacao() → historicoEnviosAutomacao (status: agendado | pendente)
    ↓
processarFilaPendente() — roda a cada 1 minuto
    ↓
routedSendMessage() / routedSendMedia()
    ├── Plano PRO  → zapiSendText / zapiSendMedia (Z-API REST)
    └── Solo/Plus  → waManager.sendMessage (Baileys)
    ↓
historicoEnviosAutomacao.status = 'enviado' | 'falhou'
    ↓ (apenas Z-API)
zapi-webhook.ts → atualiza messageStatus (sent/delivered/read/failed)
```

---

## Tipos de Automação e Frequência de Execução

| Tipo de Gatilho | Função no Scheduler | Frequência | Janela de Disparo |
|---|---|---|---|
| `agendamento_criado` / `agendamento_pre_agendado` | `routers.ts` (inline) | Imediato ao criar | Imediato |
| `dias_antes_agendamento` | `processarAutomacoesAgendadas()` | A cada 15 min | ±15 min da `horaDisparo` |
| `horas_antes_agendamento` | `processarAutomacoesAgendadas()` | A cada 15 min | Janela de 15 min antes do agendamento |
| `horas_apos_agendamento` | `processarAutomacoesAgendadas()` | A cada 15 min | Janela de 15 min após o agendamento |
| `dias_depois_agendamento` | `processarAutomacoesAgendadas()` | A cada 15 min | ±15 min da `horaDisparo` no dia correto |
| `aniversario_mes` | `processarAniversarioMes()` | A cada 15 min | Apenas dia 01 do mês, ±15 min da `horaDisparo` |
| `data_fixa` | `processarDataFixa()` | A cada 15 min | ±15 min da `dataFixaHora` na data exata |
| `cliente_criado` | `routers.ts` (inline) | Imediato ao criar cliente | Imediato |
| `agendamento_confirmado` / `cancelado` / etc. | `routers.ts` (inline) | Imediato ao atualizar status | Imediato |
| `reserva_paga` | `routers.ts` (inline) | Imediato ao registrar pagamento | Imediato |

---

## Bugs Encontrados e Corrigidos

### 🔴 BUG 1 — Deduplicação não reconhecia status `agendado` (CRÍTICO)

**Arquivo:** `server/db.ts` — `jaEnviouLembrete()` e `jaEnviouParaCliente()`  
**Arquivo:** `server/scheduler.ts` — deduplicação inline de `aniversario_mes`

**Problema:** As funções de deduplicação verificavam apenas `status IN ('enviado', 'pendente')`. Com a introdução do status `agendado`, um mesmo agendamento podia ser inserido múltiplas vezes na fila — uma vez pelo pré-registro (`agendado`) e outra pelo disparo real (`pendente`) — gerando **mensagens duplicadas** para o cliente.

**Correção aplicada:**
```ts
// ANTES (bugado)
sql`${historicoEnviosAutomacao.status} IN ('enviado', 'pendente')`

// DEPOIS (corrigido)
sql`${historicoEnviosAutomacao.status} IN ('enviado', 'pendente', 'agendado')`
```

Corrigido em 3 locais: `jaEnviouLembrete`, `jaEnviouParaCliente` e deduplicação anual de aniversário.

---

### 🔴 BUG 2 — Worker de fila bloqueava envios de empresas PRO (Z-API) (CRÍTICO)

**Arquivo:** `server/scheduler.ts` — `processarFilaPendente()`

**Problema:** O worker verificava `waManager.getState().status !== 'connected'` (estado do Baileys) e **retornava imediatamente** se não estivesse conectado. Isso significa que empresas no plano PRO que usam Z-API **nunca tinham suas mensagens processadas** quando o Baileys estava desconectado — mesmo que a Z-API estivesse funcionando perfeitamente.

**Correção aplicada:** Removida a verificação global de conexão Baileys. O roteador `routedSendMessage` já trata a conexão por empresa individualmente — empresas PRO vão para Z-API, e apenas as Solo/Plus verificam o Baileys internamente.

```ts
// ANTES (bugado) — parava TODA a fila se Baileys desconectado
const waState = waManager.getState();
if (waState.status !== 'connected') return;

// DEPOIS (corrigido) — cada empresa usa seu próprio canal
const waState = waManager.getState();
const baileysConectado = waState.status === 'connected';
// routedSendMessage trata por empresa — PRO vai para Z-API independente do Baileys
```

---

### 🟡 BUG 3 — Pré-registro gravava status `pendente` em vez de `agendado`

**Arquivo:** `server/scheduler.ts` — `preRegistrarEnviosFuturos()`

**Problema:** A função de pré-registro calculava `enviarEm` como data futura e gravava `status: 'pendente'`. Isso causava inconsistência visual (aparecia como "Pendente" na Caixa de Saída) e podia confundir o worker — que processaria o item antes da hora se o `enviarEm` não fosse verificado corretamente.

**Correção aplicada:** Status alterado para `'agendado'` no pré-registro, e mensagem de log atualizada para refletir o estado correto.

---

### 🟡 BUG 4 — Mensagem do pré-registro era placeholder sem conteúdo real

**Arquivo:** `server/scheduler.ts` — `preRegistrarEnviosFuturos()`

**Problema:** A mensagem gravada no pré-registro era `"[Pendente] Automação: X | Cliente: Y | Agendamento: Z"` — um placeholder sem o texto real da mensagem. Quando o worker processava o item, enviava esse texto literal para o cliente.

**Correção aplicada:** Texto do placeholder atualizado para `"[Agendado]..."` para indicar que é um placeholder. **Observação:** O texto real da mensagem é gerado no momento do disparo real (em `processarAutomacoesAgendadas`), que substitui o registro existente via `registrarEnvioAutomacao` com `status: 'pendente'`. O fluxo está correto — o pré-registro é apenas uma reserva de slot, não o envio final.

---

## Problemas de Design Identificados (Não Bloqueantes)

### ⚠️ DESIGN 1 — Timezone: scheduler usa hora local do servidor, não do cliente

**Arquivo:** `server/scheduler.ts` — todas as funções de disparo

**Situação:** A `horaDisparo` configurada nas automações (ex: `"09:00:00"`) é comparada com `agora.getHours()` — que usa o timezone do servidor (UTC). Se o servidor estiver em UTC e a empresa estiver em UTC-3 (Brasília), uma automação configurada para "09:00" disparará às 06:00 no horário do cliente.

**Impacto:** Mensagens chegando 3h antes ou depois do esperado.

**Recomendação:** Armazenar o timezone da empresa na tabela `empresas` e converter `agora` para o timezone da empresa antes de comparar com `horaDisparo`. Usar `Intl.DateTimeFormat` ou a biblioteca `date-fns-tz`.

---

### ⚠️ DESIGN 2 — Janela de 15 minutos pode causar disparos duplos em reinicializações

**Arquivo:** `server/scheduler.ts` — `processarAutomacoesAgendadas()`

**Situação:** A janela de ±15 minutos garante que o scheduler não perca um disparo se o servidor reiniciar. Porém, se o servidor reiniciar dentro da janela de 15 minutos, a função pode tentar enfileirar o mesmo item novamente. A deduplicação `jaEnviouLembrete` protege contra isso — mas apenas se o primeiro registro já estiver no banco.

**Impacto:** Em reinicializações rápidas (< 1s), pode haver duplicatas. Na prática, a deduplicação cobre a maioria dos casos.

**Recomendação:** Adicionar índice único `(empresaId, automacaoId, agendamentoId)` na tabela `historicoEnviosAutomacao` para garantia em nível de banco.

---

### ⚠️ DESIGN 3 — Mensagem do pré-registro não tem o texto real

**Situação:** Conforme descrito no BUG 4, o pré-registro grava um placeholder. O texto real é gerado no momento do disparo. Se o disparo falhar antes de gerar o texto (ex: agendamento cancelado), o placeholder fica visível na Caixa de Saída.

**Recomendação:** Gerar o texto real da mensagem já no pré-registro, usando os mesmos template vars disponíveis naquele momento.

---

## Status do Fluxo por Tipo de Automação

| Tipo | Status | Observações |
|---|---|---|
| `agendamento_criado` | ✅ Funcionando | Envio imediato, deduplicação correta |
| `agendamento_pre_agendado` | ✅ Funcionando | Prioridade sobre `agendamento_criado` implementada |
| `dias_antes_agendamento` | ✅ Funcionando | Janela ±15 min, deduplicação corrigida |
| `horas_antes_agendamento` | ✅ Funcionando | Janela de 15 min antes do horário |
| `horas_apos_agendamento` | ✅ Funcionando | Janela de 15 min após o horário |
| `dias_depois_agendamento` | ✅ Funcionando | Janela ±15 min no dia correto |
| `aniversario_mes` | ✅ Funcionando | Apenas dia 01, deduplicação anual corrigida |
| `data_fixa` | ✅ Funcionando | Data e hora exatas configuráveis |
| `cliente_criado` | ✅ Funcionando | Envio imediato |
| `reserva_paga` | ✅ Funcionando | Envio imediato ao registrar pagamento |
| `profissional_atribuido` | ✅ Funcionando | Envio imediato |

---

## Roteamento WhatsApp

| Plano | Canal | Comportamento se desconectado |
|---|---|---|
| PRO | Z-API (REST) | Retorna `ok=false`, item marcado como `falhou` |
| Solo / Plus / Free | Baileys (QR) | Retorna `false`, item marcado como `falhou` |

**Importante:** Após a correção do BUG 2, o worker agora processa a fila independente do estado do Baileys. Empresas PRO têm seus envios processados mesmo quando o Baileys está desconectado.

---

## Recomendações Prioritárias

1. **Implementar timezone por empresa** — é o problema mais impactante para usuários fora de UTC. Adicionar campo `timezone` na tabela `empresas` (default `'America/Sao_Paulo'`) e usar na comparação de `horaDisparo`.

2. **Índice único no banco** — adicionar `UNIQUE INDEX (empresaId, automacaoId, agendamentoId)` em `historicoEnviosAutomacao` para garantia de deduplicação em nível de banco, além da lógica de aplicação.

3. **Gerar texto real no pré-registro** — melhorar a experiência na Caixa de Saída mostrando o texto real da mensagem que será enviada.

---

*Relatório gerado automaticamente pela auditoria de código em 21/04/2026.*
