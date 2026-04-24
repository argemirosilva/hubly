# Politica de Envio de Mensagens WhatsApp

**Ultima atualizacao:** 24 de abril de 2026

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

## Eventos Disponiveis

| Evento | Descricao | Gatilho |
|--------|-----------|---------|
| `agendamento_criado` | Agendamento criado com status "agendado" | Criacao de agendamento |
| `agendamento_pre_agendado` | Pre-agendamento criado | Criacao com status "pre_agendado" |
| `agendamento_confirmado` | Status mudou para confirmado | Mudanca de status |
| `agendamento_cancelado` | Agendamento cancelado | Mudanca de status |
| `agendamento_concluido` | Atendimento finalizado | Mudanca de status |
| `reserva_paga` | Sinal/reserva confirmado (fallback: agendamento_criado) | Pagamento Stripe/PIX |
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

- **24/04/2026:** Politica criada apos remocao de mensagens hardcoded de "Reserva Confirmada" e "Notificacao de Credito". Quatro funcoes helper legadas removidas do whatsapp.ts.
