CREATE TABLE `convites_usuario` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`grupoId` int,
	`token` varchar(128) NOT NULL,
	`status` enum('pendente','aceito','expirado') NOT NULL DEFAULT 'pendente',
	`expiresAt` timestamp NOT NULL,
	`convidadoPorId` int NOT NULL,
	`aceitoEm` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `convites_usuario_id` PRIMARY KEY(`id`),
	CONSTRAINT `convites_usuario_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `grupos_permissoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`nome` varchar(100) NOT NULL,
	`descricao` text,
	`cor` varchar(7) DEFAULT '#6366f1',
	`isDefault` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `grupos_permissoes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `membros_grupo` (
	`id` int AUTO_INCREMENT NOT NULL,
	`grupoId` int NOT NULL,
	`userId` int NOT NULL,
	`empresaId` int NOT NULL,
	`adicionadoPorId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `membros_grupo_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `permissoes_grupo` (
	`id` int AUTO_INCREMENT NOT NULL,
	`grupoId` int NOT NULL,
	`agendamentosVer` boolean DEFAULT false,
	`agendamentosCriar` boolean DEFAULT false,
	`agendamentosEditar` boolean DEFAULT false,
	`agendamentosCancelar` boolean DEFAULT false,
	`agendamentosRemarcar` boolean DEFAULT false,
	`agendamentosConfirmar` boolean DEFAULT false,
	`agendamentosConcluir` boolean DEFAULT false,
	`agendamentosVerTodos` boolean DEFAULT false,
	`clientesVer` boolean DEFAULT false,
	`clientesCriar` boolean DEFAULT false,
	`clientesEditar` boolean DEFAULT false,
	`clientesExcluir` boolean DEFAULT false,
	`clientesVerHistorico` boolean DEFAULT false,
	`clientesVerProntuario` boolean DEFAULT false,
	`clientesEditarProntuario` boolean DEFAULT false,
	`clientesVerContato` boolean DEFAULT false,
	`profissionaisVer` boolean DEFAULT false,
	`profissionaisCriar` boolean DEFAULT false,
	`profissionaisEditar` boolean DEFAULT false,
	`profissionaisExcluir` boolean DEFAULT false,
	`profissionaisGerenciarPermissoes` boolean DEFAULT false,
	`servicosVer` boolean DEFAULT false,
	`servicosCriar` boolean DEFAULT false,
	`servicosEditar` boolean DEFAULT false,
	`servicosExcluir` boolean DEFAULT false,
	`financeiroVer` boolean DEFAULT false,
	`financeiroVerComissoes` boolean DEFAULT false,
	`financeiroEditarComissoes` boolean DEFAULT false,
	`financeiroVerReceita` boolean DEFAULT false,
	`financeiroVerCustos` boolean DEFAULT false,
	`financeiroMarcarPago` boolean DEFAULT false,
	`financeiroVerRelatorios` boolean DEFAULT false,
	`agendaSolicitarBloqueio` boolean DEFAULT false,
	`agendaAprovarBloqueio` boolean DEFAULT false,
	`agendaVerBloqueiosTodos` boolean DEFAULT false,
	`automacoesVer` boolean DEFAULT false,
	`automacoesCriar` boolean DEFAULT false,
	`automacoesEditar` boolean DEFAULT false,
	`automacoesExcluir` boolean DEFAULT false,
	`automacoesAtivar` boolean DEFAULT false,
	`notificacoesVer` boolean DEFAULT true,
	`relatoriosVer` boolean DEFAULT false,
	`relatoriosExportar` boolean DEFAULT false,
	`configuracoesVer` boolean DEFAULT false,
	`configuracoesEditar` boolean DEFAULT false,
	`usuariosVer` boolean DEFAULT false,
	`usuariosConvidar` boolean DEFAULT false,
	`usuariosEditar` boolean DEFAULT false,
	`usuariosRemover` boolean DEFAULT false,
	`gruposVer` boolean DEFAULT false,
	`gruposCriar` boolean DEFAULT false,
	`gruposEditar` boolean DEFAULT false,
	`gruposExcluir` boolean DEFAULT false,
	`dashboardVer` boolean DEFAULT false,
	`dashboardVerMetricas` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `permissoes_grupo_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `agendamentos` MODIFY COLUMN `data` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `bloqueios_agenda` MODIFY COLUMN `dataInicio` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `bloqueios_agenda` MODIFY COLUMN `dataFim` varchar(10) NOT NULL;--> statement-breakpoint
ALTER TABLE `clientes` MODIFY COLUMN `dataNascimento` varchar(10);