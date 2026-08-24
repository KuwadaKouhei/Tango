import { describe, expect, it } from 'vitest'
import {
  AI_JUDGE_SYSTEM_PROMPT,
  buildAiJudgeMessages,
  buildAiJudgeUserPrompt,
} from './ai-judge-prompt'

describe('buildAiJudgeMessages', () => {
  it('英単語・登録意味・回答だけを含め、hintや利用者情報を入れない', () => {
    const promptInput = {
      term: 'issue',
      answer: '課題',
      meanings: ['問題', '論点'],
    }
    const messages = buildAiJudgeMessages(promptInput)
    const joined = messages.map((message) => message.content).join('\n')

    expect(messages).toHaveLength(2)
    expect(messages[0]?.role).toBe('system')
    expect(messages[0]?.content).toBe(AI_JUDGE_SYSTEM_PROMPT)
    expect(buildAiJudgeUserPrompt(promptInput)).toContain('English term: issue')
    expect(joined).toContain('問題')
    expect(joined).toContain('論点')
    expect(joined).toContain('課題')
    expect(joined).not.toMatch(/hint|userId|session|OAuth|profile|履歴/u)
  })
})
