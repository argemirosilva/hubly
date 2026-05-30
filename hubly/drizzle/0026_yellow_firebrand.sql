CREATE TABLE `historico_envios_automacao` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`automacaoId` int,
	`automacaoNome` varchar(255),
	`clienteId` int,
	`clienteNome` varchar(255),
	`telefone` varchar(30),
	`canal` enum('whatsapp','email','sms','lembrete') NOT NULL DEFAULT 'whatsapp',
	`mensagem` text,
	`status` enum('enviado','falhou','pendente') NOT NULL DEFAULT 'enviado',
	`erroDetalhe` text,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `historico_envios_automacao_id` PRIMARY KEY(`id`)
);
