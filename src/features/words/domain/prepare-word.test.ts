import { describe, expect, it } from 'vitest'
import { AppError } from '../../../platform/app-error'
import { INPUT_LIMITS } from './input-limits'
import {
  emptyToNullHint,
  requirePreparedHint,
  requirePreparedMeanings,
  requirePreparedTerm,
} from './prepare-word'
import { upsertWordBodySchema } from '../api/word-schemas'

describe('prepare-word', () => {
  it('空白だけのtermを拒否する', () => {
    expect(() => requirePreparedTerm('   ')).toThrow(AppError)
  })

  it('意味0件と空白だけの意味を拒否する', () => {
    expect(() => requirePreparedMeanings([])).toThrow(AppError)
    expect(() => requirePreparedMeanings(['  '])).toThrow(AppError)
  })

  it('空ヒントをNULLにする', () => {
    expect(emptyToNullHint('')).toBeNull()
    expect(emptyToNullHint('  ')).toBeNull()
    expect(requirePreparedHint('  ')).toBeNull()
    expect(emptyToNullHint('覚え方')).toBe('覚え方')
  })

  it('意味をtrimして並び順を付け直す', () => {
    const prepared = requirePreparedMeanings([' 問題 ', '', '論点'])
    expect(prepared.map((item) => item.meaning)).toEqual(['問題', '論点'])
    expect(prepared.map((item) => item.sortOrder)).toEqual([0, 1])
  })

  it('OQ-018候補の上限を超える入力を拒否する', () => {
    expect(() =>
      requirePreparedTerm('a'.repeat(INPUT_LIMITS.termMaxChars + 1)),
    ).toThrow(AppError)
    expect(() =>
      requirePreparedMeanings(['あ'.repeat(INPUT_LIMITS.meaningMaxChars + 1)]),
    ).toThrow(AppError)
    expect(() =>
      requirePreparedMeanings(
        Array.from({ length: INPUT_LIMITS.meaningMaxCount + 1 }, () => '意味'),
      ),
    ).toThrow(AppError)
    expect(() =>
      requirePreparedHint('h'.repeat(INPUT_LIMITS.hintMaxChars + 1)),
    ).toThrow(AppError)
  })
})

describe('upsertWordBodySchema', () => {
  it('bodyのuserIdを拒否する', () => {
    const parsed = upsertWordBodySchema.safeParse({
      term: 'issue',
      meanings: ['問題'],
      userId: 'attacker',
    })
    expect(parsed.success).toBe(false)
  })
})
