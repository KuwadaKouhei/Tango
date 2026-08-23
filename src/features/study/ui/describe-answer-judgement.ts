import type { StudyAnswerResult } from '../api/study-schemas'

export const describeAnswerJudgement = (
  result: Pick<StudyAnswerResult, 'isCorrect' | 'judgeType' | 'judgedByAi'>,
): string => {
  if (result.isCorrect && result.judgeType === 'exact') {
    return '完全一致'
  }

  if (result.isCorrect && result.judgeType === 'normalized') {
    return '表記のゆれを吸収して一致'
  }

  if (result.judgedByAi) {
    return result.isCorrect ? 'AI判定で正解' : 'AI判定で不正解'
  }

  return '一致しませんでした'
}
