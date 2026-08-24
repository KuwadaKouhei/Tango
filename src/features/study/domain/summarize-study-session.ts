export type StudySessionItem = {
  wordId: string
  term: string
  isCorrect: boolean
}

export type StudySessionSummary = {
  askedCount: number
  correctCount: number
  accuracy: number | null
  items: readonly StudySessionItem[]
}

/**
 * 今回テストの終了結果。test_sessions は持たず、クライアントが保持した判定から算出する（OQ-005/010）。
 * 0問は正解率 null。切り上げはしない。
 */
export const summarizeStudySession = (
  items: readonly StudySessionItem[],
): StudySessionSummary => {
  const askedCount = items.length
  const correctCount = items.filter((item) => item.isCorrect).length

  return {
    askedCount,
    correctCount,
    accuracy: askedCount === 0 ? null : correctCount / askedCount,
    items,
  }
}
