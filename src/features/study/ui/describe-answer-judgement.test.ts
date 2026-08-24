import { describe, expect, it } from 'vitest'
import { describeAnswerJudgement } from './describe-answer-judgement'

describe('describeAnswerJudgement', () => {
  it('正誤と判定段階を日本語で区別する', () => {
    expect(
      describeAnswerJudgement({
        isCorrect: true,
        judgeType: 'exact',
        judgedByAi: false,
      }),
    ).toBe('完全一致')
    expect(
      describeAnswerJudgement({
        isCorrect: true,
        judgeType: 'normalized',
        judgedByAi: false,
      }),
    ).toBe('表記のゆれを吸収して一致')
    expect(
      describeAnswerJudgement({
        isCorrect: false,
        judgeType: 'normalized',
        judgedByAi: false,
      }),
    ).toBe('一致しませんでした')
    expect(
      describeAnswerJudgement({
        isCorrect: true,
        judgeType: 'ai',
        judgedByAi: true,
      }),
    ).toBe('AI判定で正解')
  })
})
