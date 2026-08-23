import { describe, expect, it } from 'vitest'
import { removeMeaningDraft } from './remove-meaning-draft'

describe('removeMeaningDraft', () => {
  it('意味が1件だけのときは行を残して中身だけ空にする', () => {
    const only = { key: 'a', value: '問題' }
    expect(removeMeaningDraft([only], 'a')).toEqual([{ key: 'a', value: '' }])
  })

  it('意味が2件以上なら指定した行だけ消す', () => {
    const first = { key: 'a', value: '問題' }
    const second = { key: 'b', value: '論点' }
    expect(removeMeaningDraft([first, second], 'a')).toEqual([second])
  })
})
