import { normalizeForJudgement } from './normalize-for-judgement'

export type LocalAnswerJudgement =
  { isCorrect: true; judgeType: 'exact' | 'normalized' } | { isCorrect: false }

/**
 * exact → normalized の順。先に決着したら後段へ進まない。
 * 意味は原文で比較し、保存済み normalized_meaning は見ない。
 */
export const judgeAnswerLocally = (
  answer: string,
  meaningOriginals: readonly string[],
): LocalAnswerJudgement => {
  if (meaningOriginals.some((meaning) => meaning === answer)) {
    return { isCorrect: true, judgeType: 'exact' }
  }

  const normalizedAnswer = normalizeForJudgement(answer)
  if (normalizedAnswer.length === 0) {
    return { isCorrect: false }
  }

  const hasNormalizedHit = meaningOriginals.some((meaning) => {
    const normalizedMeaning = normalizeForJudgement(meaning)
    return (
      normalizedMeaning.length > 0 && normalizedMeaning === normalizedAnswer
    )
  })

  if (hasNormalizedHit) {
    return { isCorrect: true, judgeType: 'normalized' }
  }

  return { isCorrect: false }
}
