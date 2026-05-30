CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`planType` enum('FREE','SOLO','PLUS','PRO') NOT NULL DEFAULT 'FREE',
	`billingCycle` enum('monthly','annual') NOT NULL DEFAULT 'monthly',
	`status` enum('active','trial','past_due','canceled','paused') NOT NULL DEFAULT 'trial',
	`trialEnd` timestamp,
	`currentPeriodStart` timestamp,
	`currentPeriodEnd` timestamp,
	`stripeCustomerId` varchar(128),
	`stripeSubscriptionId` varchar(128),
	`cancelAtPeriodEnd` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscriptions_empresaId_unique` UNIQUE(`empresaId`)
);
--> statement-breakpoint
CREATE TABLE `usage_tracker` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`mesAno` varchar(7) NOT NULL,
	`agendamentosCount` int NOT NULL DEFAULT 0,
	`notificacoesWhatsappCount` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `usage_tracker_id` PRIMARY KEY(`id`)
);
