CREATE TABLE `categorias_despesa` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`nome` varchar(100) NOT NULL,
	`cor` varchar(7) DEFAULT '#6b7280',
	`icone` varchar(50) DEFAULT 'receipt',
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categorias_despesa_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contas_pagar` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`descricao` varchar(200) NOT NULL,
	`valor` decimal(10,2) NOT NULL,
	`dataVencimento` varchar(10) NOT NULL,
	`dataPagamento` varchar(10),
	`categoriaId` int,
	`status_conta` enum('pendente','pago','vencido','cancelado') NOT NULL DEFAULT 'pendente',
	`recorrente` boolean NOT NULL DEFAULT false,
	`recorrencia_tipo` enum('semanal','mensal','anual'),
	`observacoes` text,
	`fornecedor` varchar(150),
	`comprovante` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contas_pagar_id` PRIMARY KEY(`id`)
);
