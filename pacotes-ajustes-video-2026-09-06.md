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
