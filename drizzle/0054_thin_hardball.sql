CREATE TABLE `pipeline_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`pipelineId` int NOT NULL,
	`nomePipeline` varchar(120) NOT NULL,
	`snapshot` longtext NOT NULL,
	`geradoEm` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pipeline_snapshots_id` PRIMARY KEY(`id`)
);
