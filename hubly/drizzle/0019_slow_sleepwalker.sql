CREATE TABLE `profissional_tipos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profissionalId` int NOT NULL,
	`tipoProfissionalId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `profissional_tipos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tipos_profissional` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`nome` varchar(100) NOT NULL,
	`cor` varchar(7) DEFAULT '#7c3aed',
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tipos_profissional_id` PRIMARY KEY(`id`)
);
