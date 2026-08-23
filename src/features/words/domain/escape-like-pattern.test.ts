import { describe, expect, it } from 'vitest'
import { escapeLikePattern } from './escape-like-pattern'

describe('escapeLikePattern', () => {
  it('% と _ と ! をリテラル化する', () => {
    expect(escapeLikePattern('100%_off!')).toBe('100!%!_off!!')
  })

  it('メタ文字が無い値はそのまま', () => {
    expect(escapeLikePattern('issue')).toBe('issue')
  })
})
