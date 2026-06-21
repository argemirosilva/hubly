-- Adiciona campos do Calendário Editorial na tabela marketing_posts
ALTER TABLE `marketing_posts`
  ADD COLUMN `plataforma` ENUM('instagram','tiktok','ambos') DEFAULT 'instagram' COMMENT 'Plataforma de destino do conteúdo',
  ADD COLUMN `formato` ENUM('feed','reels','stories','tiktok','outro') DEFAULT 'feed' COMMENT 'Formato do conteúdo',
  ADD COLUMN `statusProducao` ENUM('planejado','gravado','editado','postado') DEFAULT 'planejado' COMMENT 'Status de produção do conteúdo',
  ADD COLUMN `dataPublicacao` varchar(10) DEFAULT NULL COMMENT 'Data planejada para publicação (YYYY-MM-DD)',
  ADD COLUMN `horarioPublicacao` varchar(5) DEFAULT NULL COMMENT 'Horário sugerido para publicação (HH:MM)',
  ADD COLUMN `responsavelId` int DEFAULT NULL COMMENT 'ID do profissional responsável pela produção',
  ADD COLUMN `responsavelNome` varchar(120) DEFAULT NULL COMMENT 'Nome do responsável pela produção';
--> statement-breakpoint
