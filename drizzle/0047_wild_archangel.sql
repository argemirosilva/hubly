CREATE TABLE `assinaturas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`planoId` int NOT NULL,
	`stripeCustomerId` varchar(128),
	`stripeSubscriptionId` varchar(128),
	`status` enum('trial','ativa','inadimplente','cancelada','suspensa') NOT NULL DEFAULT 'trial',
	`ciclo` enum('mensal','anual') NOT NULL DEFAULT 'mensal',
	`trialFim` timestamp,
	`periodoInicio` timestamp,
	`periodoFim` timestamp,
	`canceladaEm` timestamp,
	`zapiInstanceId` varchar(255),
	`zapiToken` varchar(255),
	`zapiAtivo` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assinaturas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `base_conhecimento` (
	`id` int AUTO_INCREMENT NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`conteudo` text NOT NULL,
	`categoria` varchar(100) DEFAULT 'geral',
	`ativo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `base_conhecimento_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chamado_mensagens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chamadoId` int NOT NULL,
	`autorTipo` enum('cliente','agente','ia') NOT NULL,
	`autorId` int,
	`autorNome` varchar(255),
	`conteudo` text NOT NULL,
	`lido` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chamado_mensagens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chamados` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`status` enum('aberto','em_atendimento','aguardando_cliente','resolvido','fechado') NOT NULL DEFAULT 'aberto',
	`prioridade` enum('baixa','media','alta','critica') NOT NULL DEFAULT 'media',
	`agenteId` int,
	`slaHoras` int NOT NULL DEFAULT 48,
	`slaVencidoEm` timestamp,
	`primeiraRespostaEm` timestamp,
	`resolvidoEm` timestamp,
	`fechadoEm` timestamp,
	`avaliacaoNota` int,
	`avaliacaoComentario` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `chamados_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `planos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(100) NOT NULL,
	`descricao` text,
	`precoMensal` decimal(10,2) NOT NULL,
	`precoAnual` decimal(10,2) NOT NULL,
	`stripeProductId` varchar(128),
	`stripePriceIdMensal` varchar(128),
	`stripePriceIdAnual` varchar(128),
	`apiWhatsapp` enum('baileys','zapi') NOT NULL DEFAULT 'baileys',
	`limiteUsuarios` int NOT NULL DEFAULT 3,
	`limiteAgendamentosMes` int NOT NULL DEFAULT 200,
	`temIaFinanceira` boolean NOT NULL DEFAULT false,
	`temIaClientes` boolean NOT NULL DEFAULT false,
	`temPortalPublico` boolean NOT NULL DEFAULT true,
	`temAutomacoes` boolean NOT NULL DEFAULT true,
	`temPipeline` boolean NOT NULL DEFAULT false,
	`slaSuporteHoras` int NOT NULL DEFAULT 48,
	`ordem` int NOT NULL DEFAULT 0,
	`ativo` boolean NOT NULL DEFAULT true,
	`recursos` json DEFAULT ('[]'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `planos_id` PRIMARY KEY(`id`)
);
