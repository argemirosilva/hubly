CREATE TABLE `sync_audit_log` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`clientId` varchar(80) NOT NULL,
	`rota` varchar(255) NOT NULL,
	`statusCode` int NOT NULL,
	`recordsEntregues` int NOT NULL DEFAULT 0,
	`cursorSolicitado` varchar(100),
	`ipHash` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sync_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sync_change_log` (
	`cursor` bigint AUTO_INCREMENT NOT NULL,
	`empresaId` int,
	`entity` varchar(100) NOT NULL,
	`recordId` varchar(100) NOT NULL,
	`operation` enum('upsert','delete') NOT NULL,
	`payloadJson` longtext,
	`schemaVersion` varchar(20) NOT NULL DEFAULT 'v1',
	`occurredAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sync_change_log_cursor` PRIMARY KEY(`cursor`)
);
--> statement-breakpoint
CREATE TABLE `sync_integration_clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` varchar(80) NOT NULL,
	`nome` varchar(255) NOT NULL,
	`secretHash` varchar(128) NOT NULL,
	`escopo` varchar(100) NOT NULL DEFAULT 'sync.read.all',
	`ativo` boolean NOT NULL DEFAULT true,
	`criadoPorUserId` int,
	`ultimoUsoEm` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sync_integration_clients_id` PRIMARY KEY(`id`),
	CONSTRAINT `sync_integration_clients_clientId_unique` UNIQUE(`clientId`)
);
--> statement-breakpoint
CREATE TABLE `sync_snapshots` (
	`id` varchar(64) NOT NULL,
	`clientId` varchar(80) NOT NULL,
	`manifestJson` longtext,
	`snapshotCursor` bigint NOT NULL DEFAULT 0,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sync_snapshots_id` PRIMARY KEY(`id`)
);
