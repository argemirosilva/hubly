-- Adicionar campos de preferências de notificações push na tabela users
ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `notifNovoAgendamento` boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS `notifConfirmacao` boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS `notifCancelamento` boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS `notifLembrete` boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS `notifPagamento` boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS `notifComissao` boolean DEFAULT true;
