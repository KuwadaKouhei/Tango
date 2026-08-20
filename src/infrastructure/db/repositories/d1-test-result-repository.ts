import { eq } from 'drizzle-orm'
import type { TestResultRepository } from '../../../features/history/domain/test-result-repository'
import type {
  JudgeType,
  TestResult,
} from '../../../features/history/domain/test-result'
import type { AppDb } from '../drizzle'
import { testResults } from '../schema/test-results'

const isJudgeType = (value: string): value is JudgeType =>
  value === 'exact' || value === 'normalized' || value === 'ai'

const toResult = (row: typeof testResults.$inferSelect): TestResult => {
  if (!isJudgeType(row.judgeType)) {
    throw new Error('stored judge_type is invalid')
  }

  return {
    id: row.id,
    userId: row.userId,
    wordId: row.wordId,
    answer: row.answer,
    isCorrect: row.isCorrect === 1,
    judgeType: row.judgeType,
    hintUsed: row.hintUsed === 1,
    judgeProvider: row.judgeProvider,
    judgeModel: row.judgeModel,
    promptVersion: row.promptVersion,
    createdAt: row.createdAt,
  }
}

export const createD1TestResultRepository = (
  db: AppDb,
): TestResultRepository => ({
  append: async (result) => {
    await db.insert(testResults).values({
      id: result.id,
      userId: result.userId,
      wordId: result.wordId,
      answer: result.answer,
      isCorrect: result.isCorrect ? 1 : 0,
      judgeType: result.judgeType,
      hintUsed: result.hintUsed ? 1 : 0,
      judgeProvider: result.judgeProvider,
      judgeModel: result.judgeModel,
      promptVersion: result.promptVersion,
      createdAt: result.createdAt,
    })

    return result
  },

  listByOwner: async (ownerUserId) => {
    const rows = await db
      .select()
      .from(testResults)
      .where(eq(testResults.userId, ownerUserId))

    return rows.map(toResult)
  },
})
