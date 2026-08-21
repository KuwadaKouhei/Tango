import { describe, expect, it } from 'vitest'
import { AppError } from '../../../platform/app-error'
import { decodeWordListCursor, encodeWordListCursor } from './word-list-cursor'

describe('word-list-cursor', () => {
  it('同じcursorを往復できる', () => {
    const cursor = { createdAt: 1_700_000_000_000, id: 'w_abc' }
    expect(decodeWordListCursor(encodeWordListCursor(cursor))).toEqual(cursor)
  })

  it('壊れたcursorを拒否する', () => {
    expect(() => decodeWordListCursor('not-a-cursor')).toThrow(AppError)
    expect(() => decodeWordListCursor('')).toThrow(AppError)
  })
})
