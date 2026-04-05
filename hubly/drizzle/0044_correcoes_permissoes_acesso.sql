ALTER TABLE `permissoes_grupo` ADD COLUMN `isAdmin` boolean DEFAULT false;
ALTER TABLE `permissoes_grupo` ADD COLUMN `notificacoesEscopo` varchar(10) DEFAULT 'proprio';
ALTER TABLE `permissoes_grupo` ADD COLUMN `agendaEscopo` varchar(10) DEFAULT 'proprio';
ALTER TABLE `permissoes_grupo` ADD COLUMN `calendarioEscopo` varchar(10) DEFAULT 'proprio';
ALTER TABLE `permissoes_grupo` ADD COLUMN `pacotesVer` boolean DEFAULT false;
ALTER TABLE `permissoes_grupo` ADD COLUMN `pacotesEditar` boolean DEFAULT false;
ALTER TABLE `permissoes_grupo` ADD COLUMN `pacotesExcluir` boolean DEFAULT false;
