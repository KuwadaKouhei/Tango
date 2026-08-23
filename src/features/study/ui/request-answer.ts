import { fetchJson } from '../../../platform/fetch-json'
import {
  apiErrorSchema,
  studyAnswerResponseSchema,
  type StudyAnswerResult,
} from '../api/study-schemas'

export type AnswerClientResult =
  | { ok: true; result: StudyAnswerResult }
  | { ok: false; message: string }

export const requestAnswer = async (input: {
  wordId: string
  answer: string
  hintUsed: boolean
}): Promise<AnswerClientResult> => {
  const outcome = await fetchJson('/api/v1/study/answers', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      wordId: input.wordId,
      answer: input.answer,
      hintUsed: input.hintUsed,
    }),
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
        : '回答の送信に失敗しました。',
    }
  }

  const parsed = studyAnswerResponseSchema.safeParse(outcome.body)
  if (!parsed.success) {
    return { ok: false, message: '判定結果の形式が正しくありません。' }
  }

  return { ok: true, result: parsed.data.result }
}
