import { describe, expect, it } from 'vitest'
import { isApiPath } from './is-api-path'

describe('isApiPath', () => {
  it('APIの根と配下をHono向けと判定する', () => {
    expect(isApiPath('/api')).toBe(true)
    expect(isApiPath('/api/')).toBe(true)
    expect(isApiPath('/api/v1/health')).toBe(true)
    expect(isApiPath('/api/auth/callback')).toBe(true)
  })

  it('Startが扱う画面パスをAPIと誤判定しない', () => {
    expect(isApiPath('/')).toBe(false)
    expect(isApiPath('/login')).toBe(false)
    expect(isApiPath('/apple')).toBe(false)
    expect(isApiPath('/apiary')).toBe(false)
  })
})
