import { describe, expect, it } from 'vitest'
import { wordQueryKeys } from './word-query-keys'

describe('wordQueryKeys', () => {
  it('一覧と詳細を同じwords配下にしてinvalidateできる', () => {
    expect(wordQueryKeys.lists()[0]).toBe(wordQueryKeys.all[0])
    expect(wordQueryKeys.detail('w_1')[0]).toBe(wordQueryKeys.all[0])
  })
})
