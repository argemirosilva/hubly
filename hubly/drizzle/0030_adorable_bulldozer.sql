CREATE TABLE `agendamento_itens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agendamentoId` int NOT NULL,
	`servicoId` int NOT NULL,
	`valorUnitario` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agendamento_itens_id` PRIMARY KEY(`id`)
);
