DROP INDEX `idx_words_user_normalized_term`;--> statement-breakpoint
CREATE UNIQUE INDEX `words_user_id_normalized_term_unique` ON `words` (`user_id`,`normalized_term`);