CREATE TABLE `pacotes_clientes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`clienteId` int NOT NULL,
	`modeloId` int,
	`nome` varchar(150) NOT NULL,
	`valorPago` decimal(10,2) NOT NULL DEFAULT '0.00',
	`formaPagamento` varchar(60),
	`status` enum('ativo','concluido','vencido','cancelado') NOT NULL DEFAULT 'ativo',
	`dataAbertura` timestamp NOT NULL DEFAULT (now()),
	`dataVencimento` timestamp,
	`observacoes` text,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pacotes_clientes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pacotes_clientes_itens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pacoteClienteId` int NOT NULL,
	`servicoId` int NOT NULL,
	`quantidadeTotal` int NOT NULL DEFAULT 1,
	`quantidadeUsada` int NOT NULL DEFAULT 0,
	CONSTRAINT `pacotes_clientes_itens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pacotes_modelos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`nome` varchar(150) NOT NULL,
	`descricao` text,
	`preco` decimal(10,2) NOT NULL DEFAULT '0.00',
	`validadeDias` int,
	`ativo` boolean NOT NULL DEFAULT true,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pacotes_modelos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pacotes_modelos_itens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`modeloId` int NOT NULL,
	`servicoId` int NOT NULL,
	`quantidade` int NOT NULL DEFAULT 1,
	CONSTRAINT `pacotes_modelos_itens_id` PRIMARY KEY(`id`)
);
