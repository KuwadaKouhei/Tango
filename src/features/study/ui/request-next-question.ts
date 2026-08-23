import { fetchJson } from '../../../platform/fetch-json'
import {
  apiErrorSchema,
  studyQuestionResponseSchema,
} from '../api/study-schemas'
import type { StudyMode } from '../domain/study-limits'
import type { StudyQuestionResponse } from '../api/study-schemas'

export type NextQuestionClientResult =
  | { ok: true; page: StudyQuestionResponse }
  | { ok: false; code: string | null; message: string }

export const requestNextQuestion = async (input: {
  mode: StudyMode
  excludeWordIds: readonly string[]
}): Promise<NextQuestionClientResult> => {
  const outcome = await fetchJson('/api/v1/study/questions', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      mode: input.mode,
      excludeWordIds: [...input.excludeWordIds],
    }),
  })

  if (!outcome.received) {
    return { ok: false, code: null, message: outcome.message }
  }

  if (!outcome.ok) {
    const parsed = apiErrorSchema.safeParse(outcome.body)
    return {
      ok: false,
      code: parsed.success ? parsed.data.error.code : null,
      message: parsed.success
        ? parsed.data.error.message
        : '問題の取得に失敗しました。',
    }
  }

  const parsed = studyQuestionResponseSchema.safeParse(outcome.body)
  if (!parsed.success) {
    return {
      ok: false,
      code: null,
      message: '問題の形式が正しくありません。',
    }
  }

  return { ok: true, page: parsed.data }
}
