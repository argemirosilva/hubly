-- Hubly — tabela de taxas adicionais configuráveis
-- Compatível com MySQL 8 e TiDB compatível com MySQL.
-- Pode ser executado no banco do módulo remoto antes da primeira sincronização.

CREATE TABLE IF NOT EXISTS `taxas_config` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `empresaId` INT NOT NULL,
  `nome` VARCHAR(100) NOT NULL,
  `valor` DECIMAL(10,2) NOT NULL,
  `tipo` ENUM('fixo', 'percentual') NOT NULL DEFAULT 'fixo',
  `ativo` TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_taxas_config_empresa` (`empresaId`),
  KEY `idx_taxas_config_empresa_ativo` (`empresaId`, `ativo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
