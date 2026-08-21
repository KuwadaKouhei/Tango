import { apiErrorSchema, wordListResponseSchema } from '../api/word-schemas'
import type { WordListResponse } from '../api/word-schemas'

export type ListWordsClientResult =
  { ok: true; page: WordListResponse } | { ok: false; message: string }

export const listWordsRequest = async (input: {
  cursor: string | null
}): Promise<ListWordsClientResult> => {
  const params = new URLSearchParams()
  if (input.cursor) {
    params.set('cursor', input.cursor)
  }

  const query = params.toString()
  const response = await fetch(
    query.length > 0 ? `/api/v1/words?${query}` : '/api/v1/words',
    {
      method: 'GET',
      credentials: 'same-origin',
    },
  )

  const body: unknown = await response.json()
  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(body)
    return {
      ok: false,
      message: parsed.success
        ? parsed.data.error.message
        : '一覧の取得に失敗しました。',
    }
  }

  const parsed = wordListResponseSchema.safeParse(body)
  if (!parsed.success) {
    return { ok: false, message: '一覧の形式が正しくありません。' }
  }

  return { ok: true, page: parsed.data }
}
