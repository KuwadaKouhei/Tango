import { describe, expect, it } from 'vitest'
import { parseStudySessionSearch } from './study-session-search'

describe('parseStudySessionSearch', () => {
  it('不正値は random と 10 に戻す', () => {
    expect(parseStudySessionSearch({})).toEqual({ mode: 'random', count: 10 })
    expect(parseStudySessionSearch({ mode: 'nope', count: '99' })).toEqual({
      mode: 'random',
      count: 10,
    })
  })

  it('許可された検索条件を返す', () => {
    expect(parseStudySessionSearch({ mode: 'weak', count: 'all' })).toEqual({
      mode: 'weak',
      count: 'all',
    })
    expect(parseStudySessionSearch({ mode: 'random', count: '5' })).toEqual({
      mode: 'random',
      count: 5,
    })
  })
})
