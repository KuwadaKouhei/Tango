import { fetchJson } from '../../../platform/fetch-json'
import { apiErrorSchema, studyHintResponseSchema } from '../api/study-schemas'

export type HintClientResult =
  { ok: true; hint: string } | { ok: false; message: string }

export const requestHint = async (
  wordId: string,
): Promise<HintClientResult> => {
  const outcome = await fetchJson(
    `/api/v1/study/questions/${encodeURIComponent(wordId)}/hint`,
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
        : 'ヒントの取得に失敗しました。',
    }
  }

  const parsed = studyHintResponseSchema.safeParse(outcome.body)
  if (!parsed.success) {
    return { ok: false, message: 'ヒントの形式が正しくありません。' }
  }

  return { ok: true, hint: parsed.data.hint }
}
