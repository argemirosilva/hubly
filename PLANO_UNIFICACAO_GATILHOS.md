# Plano de Implantacao — Unificacao de Gatilhos e Agendamentos Duplos

**Data:** 24 de abril de 2026
**Autor:** Manus AI
**Prioridade:** Critica

---

## 1. Diagnostico

Apos auditoria completa do codigo, foram identificados **3 problemas** que precisam ser resolvidos para que o fluxo de mensagens seja linear e sem duplicidade.

### Problema A: Duplicidade de Mensagens no Fluxo com Reserva

Quando um agendamento e criado como pre-agendamento com reserva, o sistema dispara **duas mensagens** ao longo do ciclo de vida:

| Momento | Evento Disparado | Fallback |
|---------|-----------------|----------|
| Criacao do pre-agendamento | `agendamento_pre_agendado` | `agendamento_criado` |
| Pagamento da reserva | `reserva_paga` | `agendamento_criado` |

Se o usuario so tem a automacao `agendamento_criado` configurada, o cliente recebe a **mesma mensagem duas vezes**: uma na criacao e outra na confirmacao do pagamento. Isso e o que esta acontecendo hoje.

### Problema B: Servicos Compostos Ignorados no confirmarReserva

O trecho de `confirmarReserva` (que dispara ao pagar a reserva) busca apenas o servico principal (`ag.servicoId`). Ele **nao consulta** a tabela `agendamentoItens` para obter servicos compostos. Resultado: se o agendamento tem "Maquiagem Social + Penteado Semi/Preso", a variavel `{servico}` na mensagem mostra apenas "Maquiagem Social", ignorando o segundo servico.

Em contraste, a criacao de agendamento (linha 1089-1092) e a mudanca de status (linha 1492-1509) ja buscam todos os itens corretamente.

### Problema C: Impossibilidade de Multi-Trigger

A tabela `automacoes` armazena **um unico evento** por automacao (campo `evento: varchar(100)`). Isso obriga o usuario a criar automacoes duplicadas se quiser que `reserva_paga` e `agendamento_criado` disparem a mesma mensagem. O usuario pediu explicitamente para nao ter que fazer isso.

---

## 2. Solucao Proposta

A solucao se divide em **3 etapas** independentes, cada uma resolvendo um problema especifico.

### Etapa 1: Guarda Anti-Duplicidade no confirmarReserva

**Objetivo:** Evitar que o cliente receba duas mensagens quando o fluxo passa por pre-agendamento + pagamento de reserva.

**Logica:** Antes de disparar a automacao no `confirmarReserva`, o sistema verificara se **ja foi enviada uma mensagem para este agendamento** na criacao (evento `agendamento_criado` ou `agendamento_pre_agendado`). Se ja foi enviada, o `confirmarReserva` **nao dispara novamente** — a menos que exista uma automacao especifica para `reserva_paga` (que o usuario criou intencionalmente para ter uma mensagem diferente na confirmacao de pagamento).

| Cenario | Automacao reserva_paga existe? | Ja enviou na criacao? | Acao |
|---------|-------------------------------|----------------------|------|
| Pre-agendamento + pagamento | Sim | Sim ou Nao | Dispara `reserva_paga` (intencional) |
| Pre-agendamento + pagamento | Nao | Sim | **NAO dispara** (evita duplicidade) |
| Pre-agendamento + pagamento | Nao | Nao | Dispara fallback `agendamento_criado` |
| Agendamento direto + confirmar manual | Sim | Sim | Dispara `reserva_paga` (intencional) |
| Agendamento direto + confirmar manual | Nao | Sim | **NAO dispara** (evita duplicidade) |

**Implementacao:** Consultar a tabela `envios_automacoes` para verificar se ja existe um envio com `agendamentoId = X` e evento `agendamento_criado` ou `agendamento_pre_agendado`. Se existir e nao houver automacao especifica de `reserva_paga`, pular o envio.

**Arquivos afetados:** `server/routers.ts` (trecho confirmarReserva, ~linha 1634), `server/db.ts` (nova funcao `jaEnviouParaAgendamento`).

---

### Etapa 2: Buscar Servicos Compostos no confirmarReserva

**Objetivo:** Garantir que a variavel `{servico}` na mensagem de reserva paga inclua **todos os servicos** do agendamento, nao apenas o principal.

**Implementacao:** Replicar a logica que ja existe na mudanca de status (linhas 1492-1509) para o trecho de `confirmarReserva`. Buscar na tabela `agendamentoItens` todos os servicos vinculados ao agendamento e concatenar os nomes.

**Antes:**
```
servico: servico?.nome ?? ''
// Resultado: "Maquiagem Social"
```

**Depois:**
```
servico: todosServicosReserva.join(', ')
// Resultado: "Maquiagem Social, Penteado Semi/Preso"
```

**Arquivos afetados:** `server/routers.ts` (trecho confirmarReserva, ~linha 1627-1642).

---

### Etapa 3: Suporte a Multi-Trigger na Automacao (Frontend)

**Objetivo:** Permitir que o usuario vincule **multiplos gatilhos** a uma unica automacao, eliminando a necessidade de criar automacoes duplicadas.

**Implementacao:** Adicionar um campo `eventosAdicionais` (JSON array) na tabela `automacoes`. No frontend, ao editar uma automacao, o usuario podera selecionar gatilhos adicionais alem do principal. No backend, a busca por automacao (`getAutomacaoByEvento`) verificara tanto o campo `evento` quanto o array `eventosAdicionais`.

| Campo | Tipo | Exemplo |
|-------|------|---------|
| `evento` (existente) | varchar(100) | `agendamento_criado` |
| `eventosAdicionais` (novo) | JSON | `["reserva_paga", "agendamento_confirmado"]` |

**Busca unificada:** `getAutomacaoByEvento('reserva_paga')` retornara a automacao se `evento = 'reserva_paga'` **OU** se `eventosAdicionais` contem `'reserva_paga'`.

**Frontend:** Na tela de edicao da automacao, apos selecionar o gatilho principal, aparecera uma secao "Gatilhos adicionais" com checkboxes dos outros eventos compativeis. Isso permite que o usuario configure "Agendamento criado" como gatilho principal e marque "Reserva paga" como gatilho adicional — uma unica automacao, uma unica mensagem.

**Arquivos afetados:**
- `drizzle/schema.ts` (novo campo `eventosAdicionais`)
- `server/db.ts` (alterar `getAutomacaoByEvento` e `getAutomacoesByEvento`)
- `server/routers.ts` (salvar/atualizar o novo campo)
- `client/src/pages/Automacoes.tsx` (UI de multi-trigger)

---

## 3. Ordem de Execucao e Estimativa

| Etapa | Descricao | Tempo Est. | Risco |
|-------|-----------|-----------|-------|
| 1 | Guarda anti-duplicidade | ~20 min | Baixo |
| 2 | Servicos compostos no confirmarReserva | ~15 min | Baixo |
| 3 | Multi-trigger (schema + backend + frontend) | ~40 min | Medio |
| — | Testes de validacao | ~15 min | — |
| **Total** | | **~1h30** | |

---

## 4. Resultado Esperado

Apos a implementacao, o sistema se comportara assim:

**Fluxo 1 — Agendamento direto (sem sinal):**
O cliente recebe **1 mensagem** da automacao `agendamento_criado`.

**Fluxo 2 — Pre-agendamento com reserva:**
O cliente recebe **1 mensagem** na criacao (automacao `agendamento_pre_agendado` ou fallback `agendamento_criado`). Quando a reserva e paga, **nao recebe outra mensagem** — a menos que o usuario tenha criado uma automacao especifica para `reserva_paga`.

**Fluxo 3 — Multi-trigger configurado:**
O usuario configura UMA automacao com gatilho principal `agendamento_criado` e gatilho adicional `reserva_paga`. Independente do fluxo de entrada, o cliente recebe **a mesma mensagem personalizada**, sem duplicidade.

**Agendamentos duplos (multiplos servicos):**
A variavel `{servico}` sempre mostrara todos os servicos do agendamento, concatenados com virgula (ex: "Maquiagem Social, Penteado Semi/Preso").
