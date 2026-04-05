CREATE TABLE `meios_pagamento` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`nome` varchar(100) NOT NULL,
	`tipo` varchar(30) NOT NULL,
	`parcelamentoMaximo` int NOT NULL DEFAULT 1,
	`taxaFixa` decimal(5,2) NOT NULL DEFAULT '0.00',
	`descontarDoVendedor` boolean NOT NULL DEFAULT false,
	`descontarDoAtendente` boolean NOT NULL DEFAULT false,
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `meios_pagamento_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `taxas_parcela` (
	`id` int AUTO_INCREMENT NOT NULL,
	`meioPagamentoId` int NOT NULL,
	`parcela` int NOT NULL,
	`taxa` decimal(5,2) NOT NULL,
	CONSTRAINT `taxas_parcela_id` PRIMARY KEY(`id`)
);
