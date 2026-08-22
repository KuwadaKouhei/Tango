import { apiErrorSchema, wordResponseSchema } from '../api/word-schemas'
import { fetchJson } from '../../../platform/fetch-json'
import type { WordResponse } from '../api/word-schemas'

export type CreateWordClientResult =
  { ok: true; word: WordResponse['word'] } | { ok: false; message: string }

export const createWordRequest = async (input: {
  term: string
  meanings: string[]
  hint: string | null
}): Promise<CreateWordClientResult> => {
  const outcome = await fetchJson('/api/v1/words', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!outcome.received) {
    return { ok: false, message: outcome.message }
  }

  if (!outcome.ok) {
    const parsed = apiErrorSchema.safeParse(outcome.body)
    return {
      ok: false,
      message: parsed.success
        ? parsed.data.error.message
        : '登録に失敗しました。',
    }
  }

  const parsed = wordResponseSchema.safeParse(outcome.body)
  if (!parsed.success) {
    return { ok: false, message: '登録結果の形式が正しくありません。' }
  }

  return { ok: true, word: parsed.data.word }
}
