# Politica de Envio de Mensagens WhatsApp

**Ultima atualizacao:** 24 de abril de 2026 (v3 — Multi-trigger + Anti-duplicidade)

---

## Regra Fundamental

> **Nenhuma mensagem WhatsApp pode ser enviada com texto fixo (hardcoded) no codigo.**
> Todas as mensagens devem ser controladas exclusivamente pelo sistema de automacoes,
> configurado pelo usuario na tela de Automacoes.

---

## Fluxo Obrigatorio para Novos Envios

Quando uma nova funcionalidade precisar enviar mensagem WhatsApp ao cliente, siga estes passos na ordem:

| Passo | Acao | Arquivo |
|-------|------|---------|
| 1 | Criar novo tipo de evento (template) | `server/automation-templates.ts` |
| 2 | Adicionar trigger no frontend | `client/src/pages/Automacoes.tsx` (TRIGGER_OPTIONS + evtLabels) |
| 3 | Buscar automacao no backend | `getAutomacaoByEvento(empresaId, 'nome_evento')` |
| 4 | Se nao houver automacao ativa | **NAO ENVIAR** — logar "envio ignorado" |
| 5 | Se houver automacao | `processarVariaveisTemplate()` + `registrarEnvioAutomacao()` |

---

## O Que E Proibido

As seguintes praticas sao **terminantemente proibidas**:

1. **Montar mensagem com template literals no codigo:**
   ```ts
   // PROIBIDO
   const msg = `Ola, *${nome}*! Seu agendamento foi confirmado...`;
   await routedSendMessage(empresaId, tel, msg);
   ```

2. **Criar fallback com mensagem padrao:**
   ```ts
   // PROIBIDO
   const mensagem = automacao?.corpoMensagem
     ? processarVariaveisTemplate(automacao.corpoMensagem, vars)
     : "Mensagem padrao aqui";  // <-- NUNCA FACA ISSO
   ```

3. **Chamar envio direto sem verificar automacao:**
   ```ts
   // PROIBIDO
   await waManager.sendMessage(telefone, "texto fixo");
   await routedSendMessage(empresaId, telefone, "texto fixo");
   ```

---

## O Que E Obrigatorio

```ts
// CORRETO: Buscar automacao, silenciar se nao existir
const automacao = await getAutomacaoByEvento(empresa.id, 'nome_do_evento');
if (!automacao || !automacao.corpoMensagem) {
  console.log(`[Feature] Nenhuma automacao ativa para nome_do_evento — envio ignorado`);
  return; // NAO ENVIA NADA
}
const mensagem = processarVariaveisTemplate(automacao.corpoMensagem, templateVars);
const midiaUrl = extrairMidiaUrl(automacao.flowJson);
await registrarEnvioAutomacao({
  empresaId: empresa.id,
  automacaoId: automacao.id,
  automacaoNome: automacao.nome,
  clienteId,
  clienteNome,
  telefone,
  canal: 'whatsapp',
  mensagem,
  status: 'pendente',
  enviarEm: new Date(),
  midiaUrl: midiaUrl ?? undefined,
});
```

---

## Multi-trigger (Gatilhos Adicionais)

A partir da v3, cada automacao pode responder a **multiplos eventos** sem precisar duplicar a configuracao.

### Como funciona

- O campo `evento` continua sendo o gatilho principal.
- O campo `eventosAdicionais` (JSON array) armazena gatilhos extras.
- As funcoes `getAutomacaoByEvento()` e `getAutomacoesByEvento()` buscam automaticamente em ambos os campos usando `OR + JSON_CONTAINS`.

### Exemplo pratico

Uma automacao com:
- `evento: "agendamento_criado"`
- `eventosAdicionais: ["reserva_paga"]`

Sera disparada tanto quando um agendamento e criado diretamente quanto quando uma reserva e paga.

### Na interface

O usuario configura os gatilhos adicionais na secao "Gatilhos adicionais" do editor de automacoes, marcando checkboxes dos eventos compativeis.

---

## Guarda Anti-duplicidade

Para evitar que o cliente receba **duas mensagens** no fluxo pre-agendamento + pagamento:

1. Quando o agendamento e criado (com ou sem reserva), o sistema verifica se ha automacao para `agendamento_criado` e envia.
2. Quando a reserva e paga (`confirmarReserva`), o sistema verifica:
   - Se ja enviou para este agendamento na criacao (`jaEnviouNaCriacaoDoAgendamento()`)
   - Se sim, **pula o envio** (log: "ja enviou na criacao — skip")
   - Se nao, busca automacao para `reserva_paga`, com fallback para `agendamento_criado`

### Resultado

Independente do fluxo (direto ou com reserva), o cliente recebe **exatamente 1 mensagem**.

---

## Servicos Compostos

O `confirmarReserva` agora busca os **itens compostos** do agendamento (via `agendamentoItens`) para incluir todos os servicos na mensagem de confirmacao, nao apenas o servico principal.

Exemplo: Agendamento com "Maquiagem + Penteado" agora mostra ambos os servicos na variavel `{servico}`.

---

## Eventos Disponiveis

| Evento | Descricao | Gatilho |
|--------|-----------|---------|
| `agendamento_criado` | Agendamento criado com status "agendado" | Criacao de agendamento |
| `agendamento_pre_agendado` | Pre-agendamento criado | Criacao com status "pre_agendado" |
| `agendamento_confirmado` | Status mudou para confirmado | Mudanca de status |
| `agendamento_cancelado` | Agendamento cancelado | Mudanca de status |
| `agendamento_concluido` | Atendimento finalizado | Mudanca de status |
| `reserva_paga` | Sinal/reserva confirmado | Pagamento Stripe/PIX |
| `credito_gerado` | Credito adicionado a conta do cliente | Registro de credito |
| `cliente_criado` | Novo cliente cadastrado | Cadastro de cliente |
| `pre_agendamento_cancelado` | Pre-agendamento expirado | Expiracao automatica |
| `profissional_atribuido` | Profissional atribuido ao agendamento | Atualizacao de agendamento |
| `pacote_renovado` | Pacote de servicos renovado | Renovacao de pacote |
| `pacote_vencendo` | Pacote proximo do vencimento | Scheduler automatico |
| `sessoes_acabando` | Poucas sessoes restantes no pacote | Scheduler automatico |

Para adicionar um novo evento, siga o fluxo da secao "Fluxo Obrigatorio" acima.

---

## Historico

- **24/04/2026 v3:** Multi-trigger (eventosAdicionais), guarda anti-duplicidade no confirmarReserva, servicos compostos, testes automatizados (36/36 passed).
- **24/04/2026 v2:** Diretrizes anti-hardcode adicionadas no topo de routers.ts, whatsapp.ts e scheduler.ts.
- **24/04/2026 v1:** Politica criada apos remocao de mensagens hardcoded de "Reserva Confirmada" e "Notificacao de Credito". Quatro funcoes helper legadas removidas do whatsapp.ts.
