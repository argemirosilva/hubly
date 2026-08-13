CREATE TABLE `pacotes_clientes_pagamentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pacoteClienteId` int NOT NULL,
	`empresaId` int NOT NULL,
	`valor` decimal(10,2) NOT NULL,
	`formaPagamento` varchar(60),
	`tipo` enum('sinal','parcial','quitacao') NOT NULL DEFAULT 'parcial',
	`observacoes` text,
	`dataPagamento` timestamp NOT NULL DEFAULT (now()),
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pacotes_clientes_pagamentos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `pacotes_clientes` ADD `valorTotal` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `pacotes_clientes` ADD `valorRecebido` decimal(10,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `pacotes_clientes` ADD `statusPagamento` enum('pendente','parcial','pago') DEFAULT 'pendente' NOT NULL;