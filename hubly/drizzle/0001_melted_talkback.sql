CREATE TABLE `agendamentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`clienteId` int NOT NULL,
	`profissionalId` int NOT NULL,
	`servicoId` int NOT NULL,
	`data` date NOT NULL,
	`horaInicio` time NOT NULL,
	`horaFim` time NOT NULL,
	`status` enum('pre_agendado','aguardando_reserva','agendado','confirmado','em_andamento','concluido','cancelado','faltou') NOT NULL DEFAULT 'agendado',
	`valorTotal` decimal(10,2) NOT NULL,
	`valorReserva` decimal(10,2),
	`reservaPaga` boolean DEFAULT false,
	`reservaPagaEm` timestamp,
	`reservaExpiracaoEm` timestamp,
	`tipoPagamento` enum('dinheiro','pix','cartao_debito','cartao_credito','outro'),
	`observacoes` text,
	`observacoesInternas` text,
	`confirmadoEm` timestamp,
	`concluidoEm` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agendamentos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `automacoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`tipoGatilho` enum('evento','data_fixa','aniversario_mes','dias_antes_agendamento','horas_apos_agendamento') NOT NULL,
	`evento` varchar(100),
	`delayMinutos` int,
	`dataFixaDia` int,
	`dataFixaMes` int,
	`dataFixaHora` time,
	`diasAntesDepois` int,
	`horaDisparo` time,
	`canalEnvio` enum('whatsapp','email','sms') NOT NULL DEFAULT 'whatsapp',
	`tituloMensagem` varchar(255),
	`corpoMensagem` text NOT NULL,
	`segmentacaoTipo` enum('todas','por_profissional','por_tag') DEFAULT 'todas',
	`segmentacaoValor` varchar(255),
	`ativo` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `automacoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bloqueios_agenda` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`profissionalId` int NOT NULL,
	`dataInicio` date NOT NULL,
	`horaInicio` time NOT NULL,
	`dataFim` date NOT NULL,
	`horaFim` time NOT NULL,
	`motivo` varchar(500),
	`status` enum('pendente','aprovado','recusado') NOT NULL DEFAULT 'pendente',
	`motivoRecusa` varchar(500),
	`aprovadoPorId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bloqueios_agenda_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clientes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`email` varchar(320),
	`telefone` varchar(20),
	`whatsapp` varchar(20),
	`cpf` varchar(14),
	`dataNascimento` date,
	`endereco` text,
	`observacoes` text,
	`tags` json DEFAULT ('[]'),
	`saldoSessoes` int DEFAULT 0,
	`totalGasto` decimal(10,2) DEFAULT '0.00',
	`totalAtendimentos` int DEFAULT 0,
	`ultimoAtendimento` timestamp,
	`ativo` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clientes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `comissoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`profissionalId` int NOT NULL,
	`agendamentoId` int NOT NULL,
	`valorServico` decimal(10,2) NOT NULL,
	`percentualComissao` decimal(5,2) NOT NULL,
	`tipoPagamento` enum('dinheiro','pix','cartao_debito','cartao_credito','outro'),
	`taxaMaquininha` decimal(10,2) DEFAULT '0.00',
	`custoReposicao` decimal(10,2) DEFAULT '0.00',
	`valorLiquido` decimal(10,2) NOT NULL,
	`valorComissao` decimal(10,2) NOT NULL,
	`receitaDona` decimal(10,2) DEFAULT '0.00',
	`paga` boolean DEFAULT false,
	`pagaEm` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `comissoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cores_status` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`corAgendado` varchar(7) DEFAULT '#3b82f6',
	`corConfirmado` varchar(7) DEFAULT '#10b981',
	`corConcluido` varchar(7) DEFAULT '#6b7280',
	`corCancelado` varchar(7) DEFAULT '#ef4444',
	`corFaltou` varchar(7) DEFAULT '#f59e0b',
	`corPreAgendado` varchar(7) DEFAULT '#8b5cf6',
	`corAguardandoReserva` varchar(7) DEFAULT '#f97316',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cores_status_id` PRIMARY KEY(`id`),
	CONSTRAINT `cores_status_empresaId_unique` UNIQUE(`empresaId`)
);
--> statement-breakpoint
CREATE TABLE `empresas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`tipo` enum('salao','clinica','barbearia','consultorio','outro') NOT NULL DEFAULT 'salao',
	`telefone` varchar(20),
	`email` varchar(320),
	`endereco` text,
	`logoUrl` text,
	`corPrimaria` varchar(7) DEFAULT '#1a1a2e',
	`corSecundaria` varchar(7) DEFAULT '#e8d5c4',
	`whatsappNumero` varchar(20),
	`whatsappApiKey` text,
	`taxaMaquininha` decimal(5,2) DEFAULT '2.99',
	`percentualDona` decimal(5,2) DEFAULT '0.00',
	`reservaPercentual` decimal(5,2) DEFAULT '30.00',
	`reservaHorasExpiracao` int DEFAULT 24,
	`ownerId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `empresas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notificacoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`destinatarioId` int NOT NULL,
	`tipo` enum('agendamento_criado','agendamento_confirmado','agendamento_cancelado','agendamento_remarcado','bloqueio_aprovado','bloqueio_recusado','bloqueio_solicitado','reserva_expirada','lembrete','sistema') NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`mensagem` text NOT NULL,
	`dadosContexto` json,
	`lida` boolean DEFAULT false,
	`lidaEm` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notificacoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `permissoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`profissionalId` int NOT NULL,
	`podeAgendar` boolean DEFAULT true,
	`podeCancelar` boolean DEFAULT false,
	`podeRemarcar` boolean DEFAULT false,
	`podeEditarCliente` boolean DEFAULT false,
	`podeSolicitarBloqueio` boolean DEFAULT true,
	`podeVerComissoes` boolean DEFAULT false,
	`podeVerFinanceiro` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `permissoes_id` PRIMARY KEY(`id`),
	CONSTRAINT `permissoes_profissionalId_unique` UNIQUE(`profissionalId`)
);
--> statement-breakpoint
CREATE TABLE `profissionais` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`userId` int,
	`nome` varchar(255) NOT NULL,
	`email` varchar(320),
	`telefone` varchar(20),
	`especialidade` varchar(255),
	`corCalendario` varchar(7) DEFAULT '#7c3aed',
	`avatarUrl` text,
	`ativo` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `profissionais_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prontuarios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`clienteId` int NOT NULL,
	`agendamentoId` int,
	`profissionalId` int,
	`titulo` varchar(255) NOT NULL,
	`conteudo` text,
	`tipo` enum('anamnese','evolucao','foto','documento','contrato','outro') DEFAULT 'evolucao',
	`arquivoUrl` text,
	`arquivoKey` text,
	`arquivoNome` varchar(255),
	`arquivoTipo` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prontuarios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `servicos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`valor` decimal(10,2) NOT NULL,
	`duracaoMinutos` int DEFAULT 60,
	`categoria` varchar(100),
	`cor` varchar(7) DEFAULT '#7c3aed',
	`ativo` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `servicos_id` PRIMARY KEY(`id`)
);
