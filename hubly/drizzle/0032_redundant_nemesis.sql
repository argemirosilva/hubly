CREATE TABLE `wa_connection_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event` enum('connected','disconnected','qr_ready','logged_out','reconnecting') NOT NULL,
	`detail` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `wa_connection_log_id` PRIMARY KEY(`id`)
);
