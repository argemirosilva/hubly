ALTER TABLE `historico_envios_automacao` ADD `zapiMessageId` varchar(255);--> statement-breakpoint
ALTER TABLE `historico_envios_automacao` ADD `messageStatus` enum('sent','delivered','read','failed') DEFAULT 'sent';--> statement-breakpoint
ALTER TABLE `historico_envios_automacao` ADD `messageStatusAt` timestamp;