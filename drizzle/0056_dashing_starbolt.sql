CREATE TABLE `agendamento_pessoas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agendamentoId` int NOT NULL,
	`clienteId` int NOT NULL,
	`isPrincipal` boolean NOT NULL DEFAULT false,
	`role` enum('principal','acompanhante','dependente','outro') NOT NULL DEFAULT 'acompanhante',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agendamento_pessoas_id` PRIMARY KEY(`id`)
);
