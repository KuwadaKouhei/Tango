import { AppError } from '../../../platform/app-error'
import { STUDY_LIMITS } from './study-limits'

export const requirePreparedAnswer = (answer: string): string => {
  const trimmed = answer.trim()
  if (trimmed.length === 0) {
    throw AppError.validation('日本語の意味を入力してください。', {
      fields: ['answer'],
    })
  }

  if (trimmed.length > STUDY_LIMITS.answerMaxChars) {
    throw AppError.validation(
      `回答は${String(STUDY_LIMITS.answerMaxChars)}文字までです。`,
      { fields: ['answer'] },
    )
  }

  return trimmed
}
