import { apiErrorSchema, wordResponseSchema } from '../api/word-schemas'
import { fetchJson } from './fetch-json'
import type { JsonFetchOutcome } from './fetch-json'
import type { WordResponse } from '../api/word-schemas'

export class WordRequestError extends Error {
  readonly notFound: boolean

  constructor(message: string, notFound = false) {
    super(message)
    this.name = 'WordRequestError'
    this.notFound = notFound
  }
}

const wordPath = (wordId: string): string =>
  `/api/v1/words/${encodeURIComponent(wordId)}`

const parseWordResponse = (
  outcome: JsonFetchOutcome,
  fallbackMessage: string,
): WordResponse['word'] => {
  if (!outcome.received) {
    throw new WordRequestError(outcome.message)
  }

  if (!outcome.ok) {
    const parsed = apiErrorSchema.safeParse(outcome.body)
    throw new WordRequestError(
      parsed.success ? parsed.data.error.message : fallbackMessage,
      outcome.status === 404,
    )
  }

  const parsed = wordResponseSchema.safeParse(outcome.body)
  if (!parsed.success) {
    throw new WordRequestError('単語データの形式が正しくありません。')
  }

  return parsed.data.word
}

export const deleteWordRequest = async (wordId: string): Promise<void> => {
  const outcome = await fetchJson(wordPath(wordId), {
    method: 'DELETE',
    credentials: 'same-origin',
  })

  if (!outcome.received) {
    throw new WordRequestError(outcome.message)
  }

  if (outcome.status === 204) {
    return
  }

  const parsed = apiErrorSchema.safeParse(outcome.body)
  throw new WordRequestError(
    parsed.success ? parsed.data.error.message : '削除に失敗しました。',
    outcome.status === 404,
  )
}

export const loadWordRequest = async (
  wordId: string,
): Promise<WordResponse['word']> => {
  const outcome = await fetchJson(wordPath(wordId), {
    method: 'GET',
    credentials: 'same-origin',
  })
  return parseWordResponse(outcome, '単語の取得に失敗しました。')
}

export const updateWordRequest = async (input: {
  wordId: string
  term: string
  meanings: string[]
  hint: string | null
}): Promise<WordResponse['word']> => {
  const outcome = await fetchJson(wordPath(input.wordId), {
    method: 'PUT',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      term: input.term,
      meanings: input.meanings,
      hint: input.hint,
    }),
  })
  return parseWordResponse(outcome, '保存に失敗しました。')
}
