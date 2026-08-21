import { apiErrorSchema, wordResponseSchema } from '../api/word-schemas'
import type { WordResponse } from '../api/word-schemas'

export class WordRequestError extends Error {
  readonly notFound: boolean

  constructor(message: string, notFound = false) {
    super(message)
    this.name = 'WordRequestError'
    this.notFound = notFound
  }
}

const parseWordResponse = async (
  response: Response,
  fallbackMessage: string,
): Promise<WordResponse['word']> => {
  const body: unknown = await response.json()
  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(body)
    throw new WordRequestError(
      parsed.success ? parsed.data.error.message : fallbackMessage,
      response.status === 404,
    )
  }

  const parsed = wordResponseSchema.safeParse(body)
  if (!parsed.success) {
    throw new WordRequestError('単語データの形式が正しくありません。')
  }

  return parsed.data.word
}

export const loadWordRequest = async (
  wordId: string,
): Promise<WordResponse['word']> => {
  const response = await fetch(`/api/v1/words/${wordId}`, {
    method: 'GET',
    credentials: 'same-origin',
  })
  return parseWordResponse(response, '単語の取得に失敗しました。')
}

export const updateWordRequest = async (input: {
  wordId: string
  term: string
  meanings: string[]
  hint: string | null
}): Promise<WordResponse['word']> => {
  const response = await fetch(`/api/v1/words/${input.wordId}`, {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      term: input.term,
      meanings: input.meanings,
      hint: input.hint,
    }),
  })
  return parseWordResponse(response, '保存に失敗しました。')
}
