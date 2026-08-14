ALTER TABLE `historico_envios_automacao` MODIFY COLUMN `status` enum('enviado','falhou','pendente','agendado','processando','cancelado') NOT NULL DEFAULT 'enviado';--> statement-breakpoint
ALTER TABLE `historico_envios_automacao` MODIFY COLUMN `status` enum('enviado','falhou','pendente','agendado','processando','cancelado') NOT NULL DEFAULT 'enviado';--> statement-breakpoint
ALTER TABLE `historico_envios_automacao` MODIFY COLUMN `messageStatus` enum('queued','sent','delivered','read','failed','cancelled') DEFAULT 'queued';--> statement-breakpoint
ALTER TABLE `historico_envios_automacao` ADD `enviadoEm` timestamp;--> statement-breakpoint
ALTER TABLE `historico_envios_automacao` ADD `canceladoEm` timestamp;--> statement-breakpoint
UPDATE `historico_envios_automacao`
SET `messageStatus` = CASE
  WHEN `status` = 'enviado' THEN 'sent'
  WHEN `status` = 'falhou' THEN 'failed'
  WHEN `status` = 'cancelado' THEN 'cancelled'
  ELSE 'queued'
END
WHERE `messageStatus` = 'sent' AND `status` <> 'enviado';
