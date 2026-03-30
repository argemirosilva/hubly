CREATE TABLE `system_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`nome` varchar(120) NOT NULL,
	`email` varchar(320) NOT NULL,
	`passwordHash` varchar(255) NOT NULL,
	`grupoId` int,
	`ativo` boolean NOT NULL DEFAULT true,
	`ultimoAcesso` timestamp,
	`criadoPorId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_users_id` PRIMARY KEY(`id`)
);
