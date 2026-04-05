CREATE TABLE `analise_clientes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`clienteId` int NOT NULL,
	`classificacao` enum('principal','bom_pagador','em_crescimento','em_queda','inativo','atraso_frequente','risco','novo') NOT NULL,
	`scoreCliente` int NOT NULL,
	`resumo` text NOT NULL,
	`detalhes` json,
	`calculadoEm` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analise_clientes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `insights_clientes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`tipo` enum('concentracao_receita','clientes_inativos','inadimplencia_frequente','cliente_em_queda','cliente_importante_atrasou','bons_clientes','geral') NOT NULL,
	`prioridade` enum('alta','media','baixa') NOT NULL DEFAULT 'media',
	`titulo` varchar(200) NOT NULL,
	`mensagem` text NOT NULL,
	`acao` varchar(300),
	`lido` boolean NOT NULL DEFAULT false,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `insights_clientes_id` PRIMARY KEY(`id`)
);
