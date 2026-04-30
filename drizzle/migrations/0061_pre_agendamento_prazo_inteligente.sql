-- Migration: Pré-agendamento com prazo inteligente
-- Adiciona controle de lembrete enviado e vínculo de notificação com agendamento

ALTER TABLE `agendamentos` 
  ADD COLUMN `reservaLembreteEnviado` boolean DEFAULT false;

ALTER TABLE `notificacoes` 
  ADD COLUMN `agendamentoId` int;
