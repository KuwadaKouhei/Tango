import { z } from 'zod'
import { AppError, isAppError } from '../../platform/app-error'
import { AI_JUDGE_LIMITS } from '../../features/study/domain/ai-judge-limits'
import { buildAiJudgeMessages } from '../../features/study/domain/ai-judge-prompt'
import type { SemanticJudge } from '../../features/study/domain/semantic-judge'

const aiJudgeOutputSchema = z
  .object({
    isCorrect: z.boolean(),
  })
  .strict()

export const AI_JUDGE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    isCorrect: { type: 'boolean' },
  },
  required: ['isCorrect'],
  additionalProperties: false,
} as const

/**
 * domainへWorkers AI型を漏らさないための狭い実行口。
 * 本番は env.AI.run、contract test は fake を渡す。
 */
export type WorkersAiRun = (
  model: string,
  inputs: {
    messages: ReadonlyArray<{ role: 'system' | 'user'; content: string }>
    response_format: {
      type: 'json_schema'
      json_schema: typeof AI_JUDGE_JSON_SCHEMA
    }
  },
  options?: { signal?: AbortSignal },
) => Promise<unknown>

const rejectWhenAborted = (signal: AbortSignal): Promise<never> =>
  new Promise((_resolve, reject) => {
    const fail = (): void => {
      reject(AppError.aiJudgeUnavailable())
    }
    if (signal.aborted) {
      fail()
      return
    }
    signal.addEventListener('abort', fail, { once: true })
  })

const mapRunFailure = (error: unknown): AppError => {
  if (isAppError(error)) {
    return error
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return AppError.aiJudgeUnavailable(error)
  }
  return AppError.aiJudgeUnavailable(error)
}

const extractPayload = (raw: unknown): unknown => {
  if (raw !== null && typeof raw === 'object' && 'response' in raw) {
    const response = raw.response
    if (typeof response === 'string') {
      try {
        return JSON.parse(response)
      } catch (cause) {
        throw AppError.aiJudgeUnavailable(cause)
      }
    }
    return response
  }

  return raw
}

export const createWorkersAiSemanticJudge = (input: {
  run: WorkersAiRun
}): SemanticJudge => {
  return {
    judge: async (payload, signal) => {
      if (signal.aborted) {
        throw AppError.aiJudgeUnavailable()
      }

      const messages = buildAiJudgeMessages(payload)
      let raw: unknown
      try {
        raw = await Promise.race([
          input.run(
            AI_JUDGE_LIMITS.model,
            {
              messages,
              response_format: {
                type: 'json_schema',
                json_schema: AI_JUDGE_JSON_SCHEMA,
              },
            },
            { signal },
          ),
          rejectWhenAborted(signal),
        ])
      } catch (error) {
        throw mapRunFailure(error)
      }

      const parsed = aiJudgeOutputSchema.safeParse(extractPayload(raw))
      if (!parsed.success) {
        throw AppError.aiJudgeUnavailable()
      }

      return {
        isCorrect: parsed.data.isCorrect,
        provider: AI_JUDGE_LIMITS.provider,
        model: AI_JUDGE_LIMITS.model,
        promptVersion: AI_JUDGE_LIMITS.promptVersion,
      }
    },
  }
}
