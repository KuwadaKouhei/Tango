import { describe, expect, it } from 'vitest'
import { toSearchNeedles } from './word-list-search'

describe('toSearchNeedles', () => {
  it('英単語は term の必須正規化になる', () => {
    expect(toSearchNeedles('  Issue  ')).toEqual({
      termNeedle: 'issue',
      meaningNeedle: 'issue',
    })
  })

  it('日本語は meaning 側でも小文字化される', () => {
    expect(toSearchNeedles('論点')).toEqual({
      termNeedle: '論点',
      meaningNeedle: '論点',
    })
  })
})
