import { sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  unique,
} from 'drizzle-orm/sqlite-core'
import { words } from './words'

export const wordMeanings = sqliteTable(
  'word_meanings',
  {
    id: text('id').primaryKey(),
    wordId: text('word_id')
      .notNull()
      .references(() => words.id, { onDelete: 'cascade' }),
    meaning: text('meaning').notNull(),
    normalizedMeaning: text('normalized_meaning').notNull(),
    sortOrder: integer('sort_order').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    unique('word_meanings_word_id_sort_order_unique').on(
      table.wordId,
      table.sortOrder,
    ),
    index('idx_word_meanings_word_order').on(table.wordId, table.sortOrder),
    check('word_meanings_meaning_not_blank', sql`length(trim("meaning")) > 0`),
    check(
      'word_meanings_normalized_not_blank',
      sql`length("normalized_meaning") > 0`,
    ),
    check('word_meanings_sort_order_non_negative', sql`"sort_order" >= 0`),
  ],
)
