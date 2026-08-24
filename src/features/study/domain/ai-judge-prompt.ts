import type { SemanticJudgeInput } from './semantic-judge'

/**
 * tango-judge-v1。英単語・登録意味・回答以外を渡さない。
 * hint / user / session / OAuth / 履歴はここに出さない。
 */
export const AI_JUDGE_SYSTEM_PROMPT = `You are a vocabulary meaning judge for an English-to-Japanese word list.
Decide whether the learner's Japanese answer matches any registered Japanese meaning of the English term.
Treat synonyms and equivalent phrasing as a match.
Do not treat unrelated words as a match.
Respond with JSON only.`

export const buildAiJudgeUserPrompt = (input: SemanticJudgeInput): string => {
  const meaningLines = input.meanings
    .map((meaning) => `- ${meaning}`)
    .join('\n')

  return [
    `English term: ${input.term}`,
    'Registered Japanese meanings:',
    meaningLines,
    'Learner answer:',
    input.answer,
  ].join('\n')
}

export const buildAiJudgeMessages = (
  input: SemanticJudgeInput,
): ReadonlyArray<{ role: 'system' | 'user'; content: string }> => [
  { role: 'system', content: AI_JUDGE_SYSTEM_PROMPT },
  { role: 'user', content: buildAiJudgeUserPrompt(input) },
]
