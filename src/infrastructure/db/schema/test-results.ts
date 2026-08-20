import { sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  index,
  integer,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core'
import { user } from './auth.generated'
import { words } from './words'

export const testResults = sqliteTable(
  'test_results',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    wordId: text('word_id')
      .notNull()
      .references(() => words.id),
    answer: text('answer').notNull(),
    isCorrect: integer('is_correct').notNull(),
    judgeType: text('judge_type').notNull(),
    hintUsed: integer('hint_used').notNull().default(0),
    judgeProvider: text('judge_provider'),
    judgeModel: text('judge_model'),
    promptVersion: text('prompt_version'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    foreignKey({
      name: 'test_results_word_owner_fk',
      columns: [table.wordId, table.userId],
      foreignColumns: [words.id, words.userId],
    }).onDelete('restrict'),
    index('idx_test_results_user_created').on(
      table.userId,
      table.createdAt,
      table.id,
    ),
    index('idx_test_results_user_word_created').on(
      table.userId,
      table.wordId,
      table.createdAt,
    ),
    check('test_results_answer_not_blank', sql`length(trim("answer")) > 0`),
    check('test_results_is_correct_bool', sql`"is_correct" IN (0, 1)`),
    check(
      'test_results_judge_type',
      sql`"judge_type" IN ('exact', 'normalized', 'ai')`,
    ),
    check('test_results_hint_used_bool', sql`"hint_used" IN (0, 1)`),
    check(
      'test_results_ai_metadata',
      sql`(
        ("judge_type" = 'ai' AND "judge_provider" IS NOT NULL AND "judge_model" IS NOT NULL AND "prompt_version" IS NOT NULL)
        OR
        ("judge_type" != 'ai' AND "judge_provider" IS NULL AND "judge_model" IS NULL AND "prompt_version" IS NULL)
      )`,
    ),
  ],
)
