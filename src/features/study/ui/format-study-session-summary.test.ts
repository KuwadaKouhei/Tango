import { describe, expect, it } from 'vitest'
import { formatStudySessionAccuracy } from './format-study-session-summary'

describe('formatStudySessionAccuracy', () => {
  it('0問は正解率なしと出す', () => {
    expect(formatStudySessionAccuracy({ askedCount: 0, accuracy: null })).toBe(
      '今回の正解率なし',
    )
  })

  it('切り上げせず小数を切り捨てる', () => {
    expect(formatStudySessionAccuracy({ askedCount: 3, accuracy: 2 / 3 })).toBe(
      '今回の正解率 66%',
    )
    expect(formatStudySessionAccuracy({ askedCount: 1, accuracy: 0.996 })).toBe(
      '今回の正解率 99%',
    )
  })
})
