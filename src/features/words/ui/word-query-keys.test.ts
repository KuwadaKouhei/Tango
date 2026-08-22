import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { wordQueryKeys } from './word-query-keys'

describe('wordQueryKeys', () => {
  it('all配下のinvalidateが一覧と詳細の両方をstaleにする', async () => {
    const client = new QueryClient()
    client.setQueryData(wordQueryKeys.lists(), { items: [], nextCursor: null })
    client.setQueryData(wordQueryKeys.detail('w_1'), { id: 'w_1' })

    // 保存後の登録・編集画面と同じ呼び方。遷移先で取り直すのでrefetchはしない。
    await client.invalidateQueries({
      queryKey: wordQueryKeys.all,
      refetchType: 'none',
    })

    expect(client.getQueryState(wordQueryKeys.lists())?.isInvalidated).toBe(
      true,
    )
    expect(
      client.getQueryState(wordQueryKeys.detail('w_1'))?.isInvalidated,
    ).toBe(true)
  })

  it('別の単語の詳細は巻き込まない', async () => {
    const client = new QueryClient()
    client.setQueryData(wordQueryKeys.detail('w_1'), { id: 'w_1' })
    client.setQueryData(wordQueryKeys.detail('w_2'), { id: 'w_2' })

    await client.invalidateQueries({
      queryKey: wordQueryKeys.detail('w_1'),
      refetchType: 'none',
    })

    expect(
      client.getQueryState(wordQueryKeys.detail('w_2'))?.isInvalidated,
    ).toBe(false)
  })
})
