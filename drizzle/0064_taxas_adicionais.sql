ALTER TABLE `agendamentos` ADD `taxaAdicional` decimal(10,2) DEFAULT '0';--> statement-breakpoint
CREATE TABLE `taxas_config` (
  `id` int AUTO_INCREMENT NOT NULL,
  `empresaId` int NOT NULL,
  `nome` varchar(100) NOT NULL,
  `valor` decimal(10,2) NOT NULL,
  `tipo` enum('fixo','percentual') NOT NULL DEFAULT 'fixo',
  `ativo` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `taxas_config_id` PRIMARY KEY(`id`)
);
