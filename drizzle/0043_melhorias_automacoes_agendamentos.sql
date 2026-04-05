-- Req 4 & 5: Novos campos em historico_envios_automacao
ALTER TABLE `historico_envios_automacao` ADD COLUMN `midiaUrl` text;
ALTER TABLE `historico_envios_automacao` ADD COLUMN `isTeste` boolean DEFAULT false;

-- Req 8: Tornar destinatarioId nullable em notificacoes
ALTER TABLE `notificacoes` MODIFY COLUMN `destinatarioId` int;

-- Req 9: Novos campos em pacotes_clientes
ALTER TABLE `pacotes_clientes` ADD COLUMN `automacaoRenovacao` boolean DEFAULT false;
ALTER TABLE `pacotes_clientes` ADD COLUMN `dataValidade` date;
