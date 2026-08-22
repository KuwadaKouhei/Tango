import { systemClock } from '../platform/clock'
import { createDb } from '../infrastructure/db/drizzle'
import { createD1TestResultRepository } from '../infrastructure/db/repositories/d1-test-result-repository'
import { createD1WordRepository } from '../infrastructure/db/repositories/d1-word-repository'
import { createWorkersAiTranslationService } from '../infrastructure/translation/workers-ai-translation-service'
import type { AuthBindings } from './api/bindings'

export const createAppServices = (bindings: AuthBindings) => {
  const db = createDb(bindings)

  return {
    clock: systemClock,
    wordRepository: createD1WordRepository(db),
    testResultRepository: createD1TestResultRepository(db),
    translationService: createWorkersAiTranslationService({
      run: (model, input) => bindings.AI.run(model, input),
    }),
  }
}
