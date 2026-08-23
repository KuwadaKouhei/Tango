import { describe, expect, it } from 'vitest'
import { judgeAnswerLocally } from './answer-judge'

describe('judgeAnswerLocally', () => {
  it('原文の完全一致はexactで正解にする', () => {
    expect(judgeAnswerLocally('問題', ['問題', '論点'])).toEqual({
      isCorrect: true,
      judgeType: 'exact',
    })
  })

  it('複数意味のどれかと一致すれば正解にする', () => {
    expect(judgeAnswerLocally('論点', ['問題', '論点'])).toEqual({
      isCorrect: true,
      judgeType: 'exact',
    })
  })

  it('かなカナと句読点のゆれはnormalizedで正解にする', () => {
    expect(judgeAnswerLocally('もんだい。', ['問題'])).toEqual({
      isCorrect: true,
      judgeType: 'normalized',
    })
    expect(judgeAnswerLocally('カタカナ', ['かたかな'])).toEqual({
      isCorrect: true,
      judgeType: 'normalized',
    })
  })

  it('長音の有無だけでは一致させない', () => {
    expect(judgeAnswerLocally('コンピューター', ['コンピュータ'])).toEqual({
      isCorrect: false,
    })
  })

  it('漢字かな交じりの表記ゆれ辞書は持たない', () => {
    expect(judgeAnswerLocally('子ども', ['子供'])).toEqual({
      isCorrect: false,
    })
  })

  it('正規化後が空ならnormalized一致にしない', () => {
    expect(judgeAnswerLocally('！', ['問題'])).toEqual({
      isCorrect: false,
    })
    expect(judgeAnswerLocally('…', ['…'])).toEqual({
      isCorrect: false,
    })
  })

  it('保存用normalized列ではなく原文を判定する', () => {
    expect(judgeAnswerLocally('問題', ['問題！'])).toEqual({
      isCorrect: true,
      judgeType: 'normalized',
    })
  })
})
