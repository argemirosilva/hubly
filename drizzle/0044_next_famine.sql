ALTER TABLE `notificacoes` MODIFY COLUMN `destinatarioId` int;--> statement-breakpoint
ALTER TABLE `notificacoes` MODIFY COLUMN `tipo` enum('agendamento_criado','agendamento_confirmado','agendamento_cancelado','agendamento_remarcado','bloqueio_aprovado','bloqueio_recusado','bloqueio_solicitado','bloqueio_cancelado','reserva_expirada','lembrete','sistema') NOT NULL;--> statement-breakpoint
ALTER TABLE `wa_connection_log` MODIFY COLUMN `event` enum('connected','disconnected','qr_ready','logged_out','reconnecting','reconnect_attempt','error') NOT NULL;--> statement-breakpoint
ALTER TABLE `wa_connection_log` MODIFY COLUMN `detail` varchar(500);--> statement-breakpoint
ALTER TABLE `agendamento_itens` ADD `profissionalId` int;--> statement-breakpoint
ALTER TABLE `agendamento_itens` ADD `horaInicio` varchar(5);--> statement-breakpoint
ALTER TABLE `agendamento_itens` ADD `horaFim` varchar(5);--> statement-breakpoint
ALTER TABLE `agendamentos` ADD `notificacaoEnviada` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `agendamentos` ADD `notificacaoEnviadaEm` timestamp;--> statement-breakpoint
ALTER TABLE `bloqueios_agenda` ADD `recorrencia` enum('nenhuma','semanal','mensal') DEFAULT 'nenhuma' NOT NULL;--> statement-breakpoint
ALTER TABLE `bloqueios_agenda` ADD `dataFimRecorrencia` varchar(10);--> statement-breakpoint
ALTER TABLE `grupos_permissoes` ADD `isAdmin` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `historico_envios_automacao` ADD `midiaUrl` text;--> statement-breakpoint
ALTER TABLE `historico_envios_automacao` ADD `isTeste` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `historico_envios_automacao` ADD `servicoNome` varchar(255);--> statement-breakpoint
ALTER TABLE `notificacoes` ADD `ocultada` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `notificacoes` ADD `ocultadaEm` timestamp;--> statement-breakpoint
ALTER TABLE `pacotes_clientes` ADD `automacaoRenovacao` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `pacotes_clientes` ADD `dataValidade` date;--> statement-breakpoint
ALTER TABLE `permissoes_grupo` ADD `agendaEscopo` enum('proprio','todos') DEFAULT 'proprio';--> statement-breakpoint
ALTER TABLE `permissoes_grupo` ADD `calendarioEscopo` enum('proprio','todos') DEFAULT 'proprio';--> statement-breakpoint
ALTER TABLE `permissoes_grupo` ADD `notificacoesEscopo` enum('proprio','todos') DEFAULT 'proprio';--> statement-breakpoint
ALTER TABLE `permissoes_grupo` ADD `pacotesVer` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `permissoes_grupo` ADD `pacotesEditar` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `permissoes_grupo` ADD `pacotesExcluir` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `users` ADD `pushToken` text;--> statement-breakpoint
ALTER TABLE `users` ADD `pushTokenPlatform` enum('ios','android','web');--> statement-breakpoint
ALTER TABLE `users` ADD `pushTokenUpdatedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `notifNovoAgendamento` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `users` ADD `notifConfirmacao` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `users` ADD `notifCancelamento` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `users` ADD `notifLembrete` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `users` ADD `notifPagamento` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `users` ADD `notifComissao` boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE `wa_connection_log` ADD `statusCode` int;--> statement-breakpoint
ALTER TABLE `wa_connection_log` ADD `motivo` varchar(100);--> statement-breakpoint
ALTER TABLE `wa_connection_log` ADD `duracaoSessaoMs` bigint;--> statement-breakpoint
ALTER TABLE `wa_connection_log` ADD `tentativa` int;--> statement-breakpoint
ALTER TABLE `wa_connection_log` ADD `detalheTecnico` text;--> statement-breakpoint
ALTER TABLE `wa_connection_log` ADD `telefone` varchar(30);--> statement-breakpoint
ALTER TABLE `historico_envios_automacao` DROP COLUMN `is_teste`;