import { describe, expect, it } from 'vitest'
import { describeAnswerResultAnnouncement } from './describe-answer-result-announcement'

describe('describeAnswerResultAnnouncement', () => {
  it('正誤・単語・回答・判定段階を読み上げ用に並べる', () => {
    expect(
      describeAnswerResultAnnouncement('issue', {
        isCorrect: true,
        judgeType: 'exact',
        judgedByAi: false,
        answer: '問題',
      }),
    ).toBe('正解。issue。あなたの回答は問題。判定は完全一致。')
    expect(
      describeAnswerResultAnnouncement('issue', {
        isCorrect: false,
        judgeType: 'ai',
        judgedByAi: true,
        answer: '全然違う',
      }),
    ).toBe('不正解。issue。あなたの回答は全然違う。判定はAI判定で不正解。')
  })
})
