import { apiErrorSchema, wordListResponseSchema } from '../api/word-schemas'
import { fetchJson } from './fetch-json'
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
  const outcome = await fetchJson(
    query.length > 0 ? `/api/v1/words?${query}` : '/api/v1/words',
    {
      method: 'GET',
      credentials: 'same-origin',
    },
  )

  if (!outcome.received) {
    return { ok: false, message: outcome.message }
  }

  if (!outcome.ok) {
    const parsed = apiErrorSchema.safeParse(outcome.body)
    return {
      ok: false,
      message: parsed.success
        ? parsed.data.error.message
        : '一覧の取得に失敗しました。',
    }
  }

  const parsed = wordListResponseSchema.safeParse(outcome.body)
  if (!parsed.success) {
    return { ok: false, message: '一覧の形式が正しくありません。' }
  }

  return { ok: true, page: parsed.data }
}
