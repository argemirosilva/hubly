CREATE TABLE `profissionalServicos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profissionalId` int NOT NULL,
	`servicoId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `profissionalServicos_id` PRIMARY KEY(`id`)
);
