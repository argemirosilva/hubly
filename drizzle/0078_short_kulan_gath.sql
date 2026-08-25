CREATE TABLE `sync_inbound_requests` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`requestKey` varchar(64) NOT NULL,
	`clientId` varchar(80) NOT NULL,
	`requestId` varchar(64) NOT NULL,
	`bodyHash` varchar(64) NOT NULL,
	`status` enum('processing','processed') NOT NULL DEFAULT 'processing',
	`responseJson` longtext,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sync_inbound_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `sync_inbound_requests_requestKey_unique` UNIQUE(`requestKey`)
);
--> statement-breakpoint
CREATE TABLE `sync_marketing_idea_links` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`linkKey` varchar(64) NOT NULL,
	`clientId` varchar(80) NOT NULL,
	`externalId` varchar(255) NOT NULL,
	`marketingPostId` int NOT NULL,
	`updatedAtSource` varchar(35) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sync_marketing_idea_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `sync_marketing_idea_links_linkKey_unique` UNIQUE(`linkKey`)
);
--> statement-breakpoint
ALTER TABLE `sync_integration_clients` ADD `empresaId` int;--> statement-breakpoint
ALTER TABLE `sync_integration_clients` ADD `companyKeyHash` varchar(128);--> statement-breakpoint
ALTER TABLE `sync_integration_clients` ADD `sourceSystem` varchar(100);