export type UserId = string
export type WordId = string

export type JudgeType = 'exact' | 'normalized' | 'ai'

export type TestResult = {
  id: string
  userId: UserId
  wordId: WordId
  answer: string
  isCorrect: boolean
  judgeType: JudgeType
  hintUsed: boolean
  judgeProvider: string | null
  judgeModel: string | null
  promptVersion: string | null
  createdAt: number
}

export type NewTestResult = TestResult
