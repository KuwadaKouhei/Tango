import { describe, expect, it } from 'vitest'
import { INPUT_LIMITS } from '../domain/input-limits'
import { applyTranslationCandidate } from './apply-translation-candidate'

describe('applyTranslationCandidate', () => {
  it('空の意味欄へ候補を入れる', () => {
    const result = applyTranslationCandidate(
      [{ key: 'a', value: '' }],
      ' 問題 ',
    )
    expect(result).toEqual({
      ok: true,
      meanings: [{ key: 'a', value: '問題' }],
    })
  })

  it('埋まっている意味は上書きせず追加する', () => {
    const result = applyTranslationCandidate(
      [{ key: 'a', value: '問題' }],
      '論点',
    )
    expect(result.ok).toBe(true)
    if (!result.ok) {
      return
    }
    expect(result.meanings).toHaveLength(2)
    expect(result.meanings[0]).toEqual({ key: 'a', value: '問題' })
    expect(result.meanings[1]?.value).toBe('論点')
  })

  it('上限まで埋まっていると追加しない', () => {
    const meanings = Array.from(
      { length: INPUT_LIMITS.meaningMaxCount },
      (_, index) => ({ key: String(index), value: `意味${String(index)}` }),
    )
    const result = applyTranslationCandidate(meanings, '追加')
    expect(result.ok).toBe(false)
    if (result.ok) {
      return
    }
    expect(result.message).toContain('上限')
  })
})
