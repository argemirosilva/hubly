CREATE TABLE `usage_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`alertType` varchar(64) NOT NULL,
	`mesAno` varchar(7) NOT NULL,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `usage_alerts_id` PRIMARY KEY(`id`)
);
