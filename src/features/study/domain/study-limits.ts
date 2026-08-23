/**
 * OQ-005 / OQ-018。出題数と excludeWordIds、回答欄の上限。
 */
export const STUDY_LIMITS = {
  excludeWordIdsMax: 500,
  answerMaxChars: 500,
  countChoices: [5, 10, 20] as const,
  defaultCount: 10,
} as const

export type StudyMode = 'random' | 'weak'

export type StudyCountChoice = (typeof STUDY_LIMITS.countChoices)[number] | 'all'
