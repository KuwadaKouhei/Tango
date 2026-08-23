import { describe, expect, it } from 'vitest'
import { normalizeMeaning } from '../../words/public'
import { normalizeForJudgement } from './normalize-for-judgement'

describe('normalizeForJudgement', () => {
  it('必須正規化のあとかなカナと句読点・記号を整え、冪等である', () => {
    const once = normalizeForJudgement('  コンピューター！  ')
    expect(once).toBe('こんぴゅーたー')
    expect(normalizeForJudgement(once)).toBe(once)
  })

  it('保存用 normalizeMeaning と同じ必須正規化から始める', () => {
    const source = '  Ａｐｐｌｅ　Ｐｉｅ  '
    expect(normalizeForJudgement(source)).toBe(normalizeMeaning(source))
  })

  it('カタカナをひらがなへ写し、ヴはゔになる', () => {
    expect(normalizeForJudgement('カタカナ')).toBe('かたかな')
    expect(normalizeForJudgement('ヴ')).toBe('ゔ')
  })

  it('句読点と記号を除き、長音ーは残す', () => {
    expect(normalizeForJudgement('問題。')).toBe('問題')
    expect(normalizeForJudgement('問題！')).toBe('問題')
    expect(normalizeForJudgement('（問題）')).toBe('問題')
    expect(normalizeForJudgement('コンピューター')).toBe('こんぴゅーたー')
    expect(normalizeForJudgement('コンピュータ')).toBe('こんぴゅーた')
  })

  it('記号だけなら空文字になる', () => {
    expect(normalizeForJudgement('…')).toBe('')
    expect(normalizeForJudgement('！？')).toBe('')
  })
})
