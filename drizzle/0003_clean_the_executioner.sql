PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_test_results` (
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
	FOREIGN KEY (`word_id`) REFERENCES `words`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`word_id`,`user_id`) REFERENCES `words`(`id`,`user_id`) ON UPDATE no action ON DELETE cascade,
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
INSERT INTO `__new_test_results`("id", "user_id", "word_id", "answer", "is_correct", "judge_type", "hint_used", "judge_provider", "judge_model", "prompt_version", "created_at") SELECT "id", "user_id", "word_id", "answer", "is_correct", "judge_type", "hint_used", "judge_provider", "judge_model", "prompt_version", "created_at" FROM `test_results`;--> statement-breakpoint
DROP TABLE `test_results`;--> statement-breakpoint
ALTER TABLE `__new_test_results` RENAME TO `test_results`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_test_results_user_created` ON `test_results` (`user_id`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `idx_test_results_user_word_created` ON `test_results` (`user_id`,`word_id`,`created_at`);