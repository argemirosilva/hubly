# Auditoria de Gatilhos — Diagnóstico Completo

## Fluxo Atual (Após Remoção de Hardcodes)

### Cenário 1: Agendamento Direto (sem sinal)
1. Usuário cria agendamento com `status = 'agendado'`
2. Sistema busca automação `agendamento_criado`
3. Se encontrar → dispara mensagem personalizada
4. Se não encontrar → silêncio (correto)

### Cenário 2: Pré-agendamento (com reserva)
1. Usuário cria agendamento com `status = 'pre_agendado'` e `comReserva = true`
2. Sistema busca automação `agendamento_pre_agendado`
3. Se encontrar → dispara `agendamento_pre_agendado`
4. Se NÃO encontrar → fallback para `agendamento_criado`
5. **Depois**, quando o cliente paga a reserva, `confirmarReserva` é chamado
6. `confirmarReserva` busca automação `reserva_paga`
7. Se NÃO encontrar → fallback para `agendamento_criado`
8. **PROBLEMA**: O cliente pode receber DUAS mensagens — uma na criação (passo 4) e outra na confirmação (passo 7)

### Problema Identificado: Duplicidade de Mensagens
Quando o fluxo é: criar pré-agendamento → pagar reserva:
- Na criação: dispara `agendamento_pre_agendado` (ou fallback `agendamento_criado`)
- Na confirmação: dispara `reserva_paga` (ou fallback `agendamento_criado`)
- Se o usuário só tem `agendamento_criado` configurado, o cliente recebe a MESMA mensagem DUAS vezes

### Problema Identificado: Serviços Compostos no confirmarReserva
O `confirmarReserva` (linha 1627) busca apenas `ag.servicoId` (serviço principal).
Não busca os itens compostos (agendamentoItens) como faz a criação (linha 1089-1092) e a mudança de status (linha 1492-1509).
Resultado: se o agendamento tem múltiplos serviços (ex: Maquiagem + Penteado), a variável `{servico}` mostra apenas o primeiro.

### Estrutura da Tabela automacoes
- Campo `evento`: varchar(100) — armazena UM evento por automação
- Não suporta nativamente múltiplos gatilhos na mesma automação
- Para unificar, as opções são:
  A) Manter fallback em cascata (reserva_paga → agendamento_criado) — JÁ IMPLEMENTADO
  B) Adicionar campo `eventosAdicionais` (JSON array) para multi-trigger
  C) Resolver via lógica de negócio: se já enviou na criação, não enviar na reserva
