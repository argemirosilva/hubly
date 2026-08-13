ALTER TABLE `agendamentos` ADD `pacoteClienteId` int;
--> statement-breakpoint
ALTER TABLE `pacotes_clientes_itens` ADD `quantidadeReservada` int NOT NULL DEFAULT 0;
