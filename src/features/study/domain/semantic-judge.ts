/**
 * T12でWorkers AI adapterを結線するport。T10では注入しない。
 * 呼び出し側は英単語・登録意味・回答だけを渡す。
 */
export type SemanticJudgeInput = {
  term: string
  answer: string
  meanings: readonly string[]
}

export type SemanticJudgeResult = {
  isCorrect: boolean
  provider: string
  model: string
  promptVersion: string
}

export type SemanticJudge = {
  judge: (input: SemanticJudgeInput) => Promise<SemanticJudgeResult>
}
