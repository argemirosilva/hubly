ALTER TABLE `agendamento_itens` ADD `pacoteClienteItemId` int;--> statement-breakpoint
ALTER TABLE `pacotes_clientes` ADD `numeroParcelas` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `pacotes_clientes` ADD `valorParcela` decimal(10,2);