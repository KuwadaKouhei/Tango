import { describe, expect, it } from 'vitest'
import { AppError } from '../../../platform/app-error'
import {
  emptyToNullHint,
  requirePreparedMeanings,
  requirePreparedTerm,
} from './prepare-word'

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
    expect(emptyToNullHint('覚え方')).toBe('覚え方')
  })
})
