CREATE TABLE `wa_session` (
	`id` varchar(200) NOT NULL,
	`data` longtext NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `wa_session_id` PRIMARY KEY(`id`)
);
