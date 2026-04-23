CREATE TABLE `creditos_cliente` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`clienteId` int NOT NULL,
	`valor` decimal(10,2) NOT NULL,
	`tipo` enum('credito','uso','devolucao') NOT NULL,
	`origem` varchar(500),
	`agendamentoId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `creditos_cliente_id` PRIMARY KEY(`id`)
);
