import type { StudyAnswerResult } from '../api/study-schemas'
import { describeAnswerJudgement } from './describe-answer-judgement'

export const describeAnswerResultAnnouncement = (
  term: string,
  result: Pick<
    StudyAnswerResult,
    'isCorrect' | 'judgeType' | 'judgedByAi' | 'answer'
  >,
): string => {
  const outcome = result.isCorrect ? '正解' : '不正解'
  return `${outcome}。${term}。あなたの回答は${result.answer}。判定は${describeAnswerJudgement(result)}。`
}
