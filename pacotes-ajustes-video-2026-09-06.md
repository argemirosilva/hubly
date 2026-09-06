# Ajustes de Pacotes identificados em vídeo

## Ordem de status

A tela apresentava os filtros na sequência **Ativos, Concluídos, Vencidos, Cancelados, Todos**. A ordem deve começar por **Todos**, pois a usuária consulta o histórico completo com frequência e o filtro Ativos induzia erro de leitura.

## Correção de recebimento

O campo visível como **Valor pago** no modal de edição representa, tecnicamente, o **valor contratado/total do pacote**. O valor realmente recebido é a soma dos lançamentos individuais em `pacotes_clientes_pagamentos`.

O bloqueio para reduzir o valor contratado abaixo do recebido é financeiramente correto, mas a tela não oferecia um caminho para corrigir um lançamento recebido lançado por engano. A correção deve:

- renomear o campo de edição para **Valor total do pacote**;
- manter a trava contra saldo negativo;
- permitir corrigir um lançamento individual de recebimento no painel **Financeiro do pacote**;
- recalcular `valorRecebido`, `saldo` e `statusPagamento` a partir dos lançamentos, sem apagar histórico.

## Validação de distribuição

Após o checkpoint `435ac1a4`, a primeira abertura autenticada ainda mostrou o bundle anterior: filtros com **Ativos** primeiro e o texto **Registrar pagamento**. A validação visual seguirá em URL inédita após a propagação da publicação; nenhum dado de pacote foi alterado durante essa etapa.

Após a propagação, a sessão autenticada confirmou a nova ordem **Todos, Ativos, Concluídos, Vencidos, Cancelados**. O pacote de curso quitado passou a exibir **Gerenciar pagamentos**, e o painel financeiro exibiu o lançamento de R$ 2.500,00 com o botão acessível **Corrigir recebimento**. Nenhuma edição ou lançamento foi salvo durante a validação.
