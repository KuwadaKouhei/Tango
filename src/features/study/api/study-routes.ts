import { Hono } from 'hono'
import { AppError } from '../../../platform/app-error'
import type { RandomSource } from '../../../platform/random'
import { createAppServices } from '../../../server/composition-root'
import type { AuthBindings } from '../../../server/api/bindings'
import type { AuthVariables } from '../../../server/api/middleware/auth'
import type { RequestIdVariables } from '../../../server/api/middleware/request-id'
import { answerQuestion } from '../application/answer-question'
import { getOwnedHint } from '../application/get-hint'
import { selectNextQuestion } from '../application/select-question'
import type { SemanticJudge } from '../domain/semantic-judge'
import {
  studyAnswerRequestSchema,
  studyQuestionRequestSchema,
} from './study-schemas'

type StudyRouteEnv = {
  Bindings: AuthBindings
  Variables: AuthVariables & RequestIdVariables
}

const readBody = async <T>(
  c: {
    req: { json: () => Promise<unknown> }
  },
  parse: (
    body: unknown,
  ) =>
    | { success: true; data: T }
    | { success: false; error: { issues: { path: PropertyKey[] }[] } },
): Promise<T> => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch (cause) {
    throw AppError.invalidJson(cause)
  }

  const parsed = parse(body)
  if (!parsed.success) {
    throw AppError.validation('入力が正しくありません。', {
      fields: parsed.error.issues.map((issue) => issue.path.join('.')),
    })
  }

  return parsed.data
}

export const createStudyRoutes = (
  deps: {
    random?: RandomSource
    semanticJudge?: SemanticJudge
  } = {},
) => {
  const routes = new Hono<StudyRouteEnv>()

  routes.post('/study/questions', async (c) => {
    const body = await readBody(c, (value) =>
      studyQuestionRequestSchema.safeParse(value),
    )
    const services = createAppServices(c.env)
    const result = await selectNextQuestion({
      actorUserId: c.get('actorUserId'),
      mode: body.mode,
      excludeWordIds: body.excludeWordIds,
      wordRepository: services.wordRepository,
      random: deps.random ?? services.random,
    })

    return c.json(result, 200)
  })

  routes.get('/study/questions/:wordId/hint', async (c) => {
    const services = createAppServices(c.env)
    const result = await getOwnedHint({
      actorUserId: c.get('actorUserId'),
      wordId: c.req.param('wordId'),
      wordRepository: services.wordRepository,
    })

    return c.json(result, 200)
  })

  routes.post('/study/answers', async (c) => {
    const body = await readBody(c, (value) =>
      studyAnswerRequestSchema.safeParse(value),
    )
    const services = createAppServices(c.env)
    const result = await answerQuestion({
      actorUserId: c.get('actorUserId'),
      wordId: body.wordId,
      answer: body.answer,
      hintUsed: body.hintUsed,
      wordRepository: services.wordRepository,
      testResultRepository: services.testResultRepository,
      clock: services.clock,
      semanticJudge: deps.semanticJudge ?? null,
    })

    return c.json(
      {
        result: {
          id: result.id,
          wordId: result.wordId,
          answer: result.answer,
          isCorrect: result.isCorrect,
          judgeType: result.judgeType,
          hintUsed: result.hintUsed,
          meanings: result.meanings,
          judgedByAi: result.judgedByAi,
          answeredAt: new Date(result.answeredAtEpochMs).toISOString(),
        },
      },
      201,
    )
  })

  return routes
}
