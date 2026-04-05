CREATE TABLE `pipeline_cartoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`colunaId` int NOT NULL,
	`pipelineId` int NOT NULL,
	`empresaId` int NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`descricao` text,
	`status` enum('em_andamento','congelado','cancelado','concluido') NOT NULL DEFAULT 'em_andamento',
	`clienteId` int,
	`clienteNome` varchar(120),
	`responsavelId` int,
	`responsavelNome` varchar(120),
	`lembrete` varchar(10),
	`valor` decimal(10,2),
	`ordem` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pipeline_cartoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pipeline_colunas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pipelineId` int NOT NULL,
	`empresaId` int NOT NULL,
	`nome` varchar(120) NOT NULL,
	`ordem` int NOT NULL DEFAULT 0,
	`cor` varchar(7) DEFAULT '#6366f1',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pipeline_colunas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pipelines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`nome` varchar(120) NOT NULL,
	`ordem` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pipelines_id` PRIMARY KEY(`id`)
);
