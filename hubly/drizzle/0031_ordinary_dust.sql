CREATE TABLE `agendamento_pagamentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agendamentoId` int NOT NULL,
	`valor` decimal(10,2) NOT NULL,
	`meioPagamento` varchar(100),
	`observacao` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agendamento_pagamentos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `agendamentos` ADD `desconto` decimal(10,2) DEFAULT '0';