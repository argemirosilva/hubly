ALTER TABLE `empresas` ADD `portalAtivo` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `empresas` ADD `autoConfirmarPortal` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `empresas` ADD `portalHeaderUrl` text;--> statement-breakpoint
ALTER TABLE `empresas` ADD `portalMensagemBemVindo` text;--> statement-breakpoint
ALTER TABLE `empresas` ADD `horaAbertura` varchar(5) DEFAULT '08:00';--> statement-breakpoint
ALTER TABLE `empresas` ADD `horaFechamento` varchar(5) DEFAULT '18:00';--> statement-breakpoint
ALTER TABLE `empresas` ADD `diasFuncionamento` json DEFAULT ('[1,2,3,4,5]');--> statement-breakpoint
ALTER TABLE `empresas` ADD `intervaloMinutos` int DEFAULT 30;