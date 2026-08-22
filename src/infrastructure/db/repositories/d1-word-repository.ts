import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { encodeWordListCursor } from '../../../features/words/domain/word-list-cursor'
import type {
  ListWordsQuery,
  WordRepository,
} from '../../../features/words/domain/word-repository'
import { toWordStats } from '../../../features/words/domain/word-stats'
import type {
  NewWord,
  Word,
  WordId,
  WordWithStats,
} from '../../../features/words/domain/word'
import type { AppDb } from '../drizzle'
import { testResults } from '../schema/test-results'
import { wordMeanings } from '../schema/word-meanings'
import { words } from '../schema/words'

const toWord = (
  row: typeof words.$inferSelect,
  meaningRows: (typeof wordMeanings.$inferSelect)[],
): Word => ({
  id: row.id,
  userId: row.userId,
  term: row.term,
  normalizedTerm: row.normalizedTerm,
  hint: row.hint,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  meanings: meaningRows
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((meaning) => ({
      id: meaning.id,
      meaning: meaning.meaning,
      normalizedMeaning: meaning.normalizedMeaning,
      sortOrder: meaning.sortOrder,
      createdAt: meaning.createdAt,
      updatedAt: meaning.updatedAt,
    })),
})

/**
 * D1は1 queryあたりのbind変数が100個まで。
 * ページ最大100件のIDをそのままINへ入れると上限ぴったりで余裕がないため分割する。
 */
const PAGE_LOOKUP_CHUNK_SIZE = 50

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

/**
 * ページ確定と統計集計を別queryにする。
 * GROUP BYとORDER BYを同じqueryへ混ぜるとSQLiteが一時B-treeで並べ直し、
 * idx_words_user_created の走査順をそのまま使えなくなるため。
 */
export const buildOwnedWordsPageQuery = (db: AppDb, input: ListWordsQuery) => {
  const cursorFilter = input.cursor
    ? sql`(${words.createdAt}, ${words.id}) < (${input.cursor.createdAt}, ${input.cursor.id})`
    : undefined

  return db
    .select({
      id: words.id,
      userId: words.userId,
      term: words.term,
      normalizedTerm: words.normalizedTerm,
      hint: words.hint,
      createdAt: words.createdAt,
      updatedAt: words.updatedAt,
    })
    .from(words)
    .where(and(eq(words.userId, input.ownerUserId), cursorFilter))
    .orderBy(desc(words.createdAt), desc(words.id))
    .limit(input.limit + 1)
}

export const buildOwnedWordsStatsQuery = (
  db: AppDb,
  ownerUserId: string,
  wordIds: string[],
) =>
  db
    .select({
      wordId: testResults.wordId,
      total: sql<number>`count(${testResults.id})`,
      correct: sql<number>`coalesce(sum(${testResults.isCorrect}), 0)`,
    })
    .from(testResults)
    .where(
      and(
        eq(testResults.userId, ownerUserId),
        inArray(testResults.wordId, wordIds),
      ),
    )
    .groupBy(testResults.wordId)

const meaningInserts = (db: AppDb, input: NewWord) =>
  input.meanings.map((meaning) =>
    db.insert(wordMeanings).values({
      id: meaning.id,
      wordId: input.id,
      meaning: meaning.meaning,
      normalizedMeaning: meaning.normalizedMeaning,
      sortOrder: meaning.sortOrder,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    }),
  )

export const createD1WordRepository = (db: AppDb): WordRepository => {
  const loadMeanings = async (wordId: WordId) =>
    db.select().from(wordMeanings).where(eq(wordMeanings.wordId, wordId))

  const findOwnedById = async (ownerUserId: string, wordId: WordId) => {
    const [row] = await db
      .select()
      .from(words)
      .where(and(eq(words.id, wordId), eq(words.userId, ownerUserId)))
      .limit(1)

    if (!row) {
      return null
    }

    return toWord(row, await loadMeanings(wordId))
  }

  return {
    findOwnedById,

    listByOwner: async (input) => {
      const rows = await buildOwnedWordsPageQuery(db, input)
      const hasNext = rows.length > input.limit
      const pageRows = hasNext ? rows.slice(0, input.limit) : rows
      const wordIds = pageRows.map((row) => row.id)

      const meaningsByWordId = new Map<
        string,
        (typeof wordMeanings.$inferSelect)[]
      >()
      const statsByWordId = new Map<
        string,
        { correct: number; total: number }
      >()

      for (const idChunk of chunk(wordIds, PAGE_LOOKUP_CHUNK_SIZE)) {
        const meaningRows = await db
          .select()
          .from(wordMeanings)
          .where(inArray(wordMeanings.wordId, idChunk))
        for (const meaning of meaningRows) {
          const current = meaningsByWordId.get(meaning.wordId) ?? []
          current.push(meaning)
          meaningsByWordId.set(meaning.wordId, current)
        }

        const statsRows = await buildOwnedWordsStatsQuery(
          db,
          input.ownerUserId,
          idChunk,
        )
        for (const stats of statsRows) {
          statsByWordId.set(stats.wordId, {
            correct: Number(stats.correct),
            total: Number(stats.total),
          })
        }
      }

      const items: WordWithStats[] = pageRows.map((row) => {
        const stats = statsByWordId.get(row.id)
        return {
          ...toWord(row, meaningsByWordId.get(row.id) ?? []),
          stats: toWordStats(stats?.correct ?? 0, stats?.total ?? 0),
        }
      })

      const last = items[items.length - 1]
      return {
        items,
        nextCursor:
          hasNext && last
            ? encodeWordListCursor({ createdAt: last.createdAt, id: last.id })
            : null,
      }
    },

    create: async (input) => {
      const firstMeaning = meaningInserts(db, input)[0]
      if (!firstMeaning) {
        throw new Error('create requires at least one meaning')
      }

      await db.batch([
        db.insert(words).values({
          id: input.id,
          userId: input.userId,
          term: input.term,
          normalizedTerm: input.normalizedTerm,
          hint: input.hint,
          createdAt: input.createdAt,
          updatedAt: input.updatedAt,
        }),
        firstMeaning,
        ...meaningInserts(db, input).slice(1),
      ])

      const created = await findOwnedById(input.userId, input.id)
      if (!created) {
        throw new Error('created word was not readable')
      }

      return created
    },

    update: async (input) => {
      const existing = await findOwnedById(input.userId, input.id)
      if (!existing) {
        throw new Error('update requires an owned word')
      }

      const firstMeaning = meaningInserts(db, input)[0]
      if (!firstMeaning) {
        throw new Error('update requires at least one meaning')
      }

      await db.batch([
        db.delete(wordMeanings).where(eq(wordMeanings.wordId, input.id)),
        db
          .update(words)
          .set({
            term: input.term,
            normalizedTerm: input.normalizedTerm,
            hint: input.hint,
            updatedAt: input.updatedAt,
          })
          .where(and(eq(words.id, input.id), eq(words.userId, input.userId))),
        firstMeaning,
        ...meaningInserts(db, input).slice(1),
      ])

      const updated = await findOwnedById(input.userId, input.id)
      if (!updated) {
        throw new Error('updated word was not readable')
      }

      return updated
    },

    deleteOwned: async (ownerUserId, wordId) => {
      const deleted = await db
        .delete(words)
        .where(and(eq(words.id, wordId), eq(words.userId, ownerUserId)))
        .returning({ id: words.id })

      return deleted.length > 0
    },
  }
}
