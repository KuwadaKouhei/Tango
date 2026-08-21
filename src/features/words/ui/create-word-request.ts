import { apiErrorSchema, wordResponseSchema } from '../api/word-schemas'
import type { WordResponse } from '../api/word-schemas'

export type CreateWordClientResult =
  { ok: true; word: WordResponse['word'] } | { ok: false; message: string }

export const createWordRequest = async (input: {
  term: string
  meanings: string[]
  hint: string | null
}): Promise<CreateWordClientResult> => {
  const response = await fetch('/api/v1/words', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })

  const body: unknown = await response.json()
  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(body)
    return {
      ok: false,
      message: parsed.success
        ? parsed.data.error.message
        : '登録に失敗しました。',
    }
  }

  const parsed = wordResponseSchema.safeParse(body)
  if (!parsed.success) {
    return { ok: false, message: '登録結果の形式が正しくありません。' }
  }

  return { ok: true, word: parsed.data.word }
}
