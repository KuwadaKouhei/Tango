/**
 * Workers AI adapter を結線する port。
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
  judge: (
    input: SemanticJudgeInput,
    signal: AbortSignal,
  ) => Promise<SemanticJudgeResult>
}
