CREATE TABLE `alertas_financeiros` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`tipo` enum('caixa_negativo','contas_vencendo','inadimplencia','gastos_altos','score_caiu','receita_baixa','concentracao_receita','fluxo_negativo','geral') NOT NULL,
	`prioridade` enum('alta','media','baixa') NOT NULL DEFAULT 'media',
	`titulo` varchar(200) NOT NULL,
	`mensagem` text NOT NULL,
	`acao` varchar(300),
	`lido` boolean NOT NULL DEFAULT false,
	`criadoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `alertas_financeiros_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `score_financeiro` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`score` int NOT NULL,
	`status` enum('saudavel','atencao','risco') NOT NULL,
	`explicacao` text NOT NULL,
	`motivos` json NOT NULL,
	`dicas` json NOT NULL,
	`detalhes` json,
	`calculadoEm` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `score_financeiro_id` PRIMARY KEY(`id`)
);
