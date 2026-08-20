import { sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  unique,
} from 'drizzle-orm/sqlite-core'
import { user } from './auth.generated'

export const words = sqliteTable(
  'words',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    term: text('term').notNull(),
    normalizedTerm: text('normalized_term').notNull(),
    hint: text('hint'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    unique('words_id_user_id_unique').on(table.id, table.userId),
    index('idx_words_user_created').on(table.userId, table.createdAt, table.id),
    index('idx_words_user_normalized_term').on(
      table.userId,
      table.normalizedTerm,
    ),
    check('words_term_not_blank', sql`length(trim("term")) > 0`),
    check(
      'words_normalized_term_not_blank',
      sql`length("normalized_term") > 0`,
    ),
  ],
)
