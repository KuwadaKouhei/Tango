import { systemClock } from '../platform/clock'
import { systemRandom } from '../platform/random'
import { createDb } from '../infrastructure/db/drizzle'
import { createD1TestResultRepository } from '../infrastructure/db/repositories/d1-test-result-repository'
import { createD1WordRepository } from '../infrastructure/db/repositories/d1-word-repository'
import { createWorkersAiSemanticJudge } from '../infrastructure/semantic-judge/workers-ai-semantic-judge'
import { createDeeplTranslationService } from '../infrastructure/translation/deepl-translation-service'
import type { AuthBindings } from './api/bindings'

export const createAppServices = (bindings: AuthBindings) => {
  const db = createDb(bindings)

  return {
    clock: systemClock,
    random: systemRandom,
    wordRepository: createD1WordRepository(db),
    testResultRepository: createD1TestResultRepository(db),
    translationService: createDeeplTranslationService({
      authKey: bindings.DEEPL_AUTH_KEY,
    }),
    semanticJudge: createWorkersAiSemanticJudge({
      run: (model, inputs, options) => {
        // wrangler 生成の AiModels は JSON Mode 対応の
        // @cf/meta/llama-3.1-8b-instruct-fast をまだ含まない。
        const ai = bindings.AI as unknown as {
          run: (
            name: string,
            values: unknown,
            runOptions?: { signal?: AbortSignal },
          ) => Promise<unknown>
        }
        return ai.run(model, inputs, options)
      },
    }),
  }
}
