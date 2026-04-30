CREATE TABLE `automacoes_excluidas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`evento` varchar(100) NOT NULL,
	`automacaoNome` varchar(255),
	`excluidoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `automacoes_excluidas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `agendamentos` ADD `reservaLembreteEnviado` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `notificacoes` ADD `agendamentoId` int;