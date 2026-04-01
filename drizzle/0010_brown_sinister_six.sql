CREATE TABLE `notificacoes_pacotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`pacoteClienteId` int NOT NULL,
	`clienteId` int NOT NULL,
	`tipo` enum('vencimento_proximo','sessoes_restantes','pacote_vencido') NOT NULL,
	`mensagem` text NOT NULL,
	`diasParaVencer` int,
	`sessoesRestantes` int,
	`canal` enum('sistema','whatsapp','email') NOT NULL DEFAULT 'sistema',
	`lida` boolean NOT NULL DEFAULT false,
	`enviadoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notificacoes_pacotes_id` PRIMARY KEY(`id`)
);
