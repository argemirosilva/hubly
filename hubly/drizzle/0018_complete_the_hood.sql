ALTER TABLE `profissionais` ADD `isProfissional` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `profissionais` ADD `temAcesso` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `profissionais` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `profissionais` ADD `grupoId` int;--> statement-breakpoint
ALTER TABLE `profissionais` ADD `ultimoAcesso` timestamp;--> statement-breakpoint
ALTER TABLE `profissionais` ADD `criadoPorId` int;