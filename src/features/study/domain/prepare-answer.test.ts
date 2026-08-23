import { describe, expect, it } from 'vitest'
import { AppError } from '../../../platform/app-error'
import { STUDY_LIMITS } from './study-limits'
import { requirePreparedAnswer } from './prepare-answer'

describe('requirePreparedAnswer', () => {
  it('前後空白を除いた回答を返す', () => {
    expect(requirePreparedAnswer('  問題  ')).toBe('問題')
  })

  it('空白だけは422にする', () => {
    expect(() => requirePreparedAnswer('   ')).toThrow(AppError)
    expect(() => requirePreparedAnswer('   ')).toThrow(
      '日本語の意味を入力してください。',
    )
  })

  it('上限を超えたら422にする', () => {
    expect(() =>
      requirePreparedAnswer('あ'.repeat(STUDY_LIMITS.answerMaxChars + 1)),
    ).toThrow(`回答は${String(STUDY_LIMITS.answerMaxChars)}文字までです。`)
  })
})
