CREATE TABLE `tokens_confirmacao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`agendamentoId` int NOT NULL,
	`empresaId` int NOT NULL,
	`token` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usadoEm` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tokens_confirmacao_id` PRIMARY KEY(`id`),
	CONSTRAINT `tokens_confirmacao_token_unique` UNIQUE(`token`)
);
