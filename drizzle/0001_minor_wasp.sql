CREATE TABLE `words` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`term` text NOT NULL,
	`normalized_term` text NOT NULL,
	`hint` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "words_term_not_blank" CHECK(length(trim("term")) > 0),
	CONSTRAINT "words_normalized_term_not_blank" CHECK(length("normalized_term") > 0)
);
--> statement-breakpoint
CREATE INDEX `idx_words_user_created` ON `words` (`user_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `idx_words_user_normalized_term` ON `words` (`user_id`,`normalized_term`);--> statement-breakpoint
CREATE UNIQUE INDEX `words_id_user_id_unique` ON `words` (`id`,`user_id`);--> statement-breakpoint
CREATE TABLE `word_meanings` (
	`id` text PRIMARY KEY NOT NULL,
	`word_id` text NOT NULL,
	`meaning` text NOT NULL,
	`normalized_meaning` text NOT NULL,
	`sort_order` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`word_id`) REFERENCES `words`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "word_meanings_meaning_not_blank" CHECK(length(trim("meaning")) > 0),
	CONSTRAINT "word_meanings_normalized_not_blank" CHECK(length("normalized_meaning") > 0),
	CONSTRAINT "word_meanings_sort_order_non_negative" CHECK("sort_order" >= 0)
);
--> statement-breakpoint
CREATE INDEX `idx_word_meanings_word_order` ON `word_meanings` (`word_id`,`sort_order`);--> statement-breakpoint
CREATE UNIQUE INDEX `word_meanings_word_id_sort_order_unique` ON `word_meanings` (`word_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `test_results` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`word_id` text NOT NULL,
	`answer` text NOT NULL,
	`is_correct` integer NOT NULL,
	`judge_type` text NOT NULL,
	`hint_used` integer DEFAULT 0 NOT NULL,
	`judge_provider` text,
	`judge_model` text,
	`prompt_version` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`word_id`) REFERENCES `words`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`word_id`,`user_id`) REFERENCES `words`(`id`,`user_id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "test_results_answer_not_blank" CHECK(length(trim("answer")) > 0),
	CONSTRAINT "test_results_is_correct_bool" CHECK("is_correct" IN (0, 1)),
	CONSTRAINT "test_results_judge_type" CHECK("judge_type" IN ('exact', 'normalized', 'ai')),
	CONSTRAINT "test_results_hint_used_bool" CHECK("hint_used" IN (0, 1)),
	CONSTRAINT "test_results_ai_metadata" CHECK((
        ("judge_type" = 'ai' AND "judge_provider" IS NOT NULL AND "judge_model" IS NOT NULL AND "prompt_version" IS NOT NULL)
        OR
        ("judge_type" != 'ai' AND "judge_provider" IS NULL AND "judge_model" IS NULL AND "prompt_version" IS NULL)
      ))
);
--> statement-breakpoint
CREATE INDEX `idx_test_results_user_created` ON `test_results` (`user_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `idx_test_results_user_word_created` ON `test_results` (`user_id`,`word_id`,`created_at`);