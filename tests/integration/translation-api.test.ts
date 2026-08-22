import { env, SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { createWord } from '../../src/features/words/application/manage-word'
import type { TranslationService } from '../../src/features/translation/domain/translation-service'
import { TRANSLATION_LIMITS } from '../../src/features/translation/domain/translation-limits'
import { createAppServices } from '../../src/server/composition-root'
import { createSlidingWindowRateLimiter } from '../../src/server/api/middleware/rate-limit'
import { createSignedInApi } from '../setup/signed-in-api'
import { insertTestUser } from '../setup/test-builders'

const API_BASE = 'https://tango.test'

const fakeService = (
  impl: TranslationService['translateToJapanese'],
): TranslationService => ({
  translateToJapanese: impl,
})

const callTranslate = async (input: {
  actorUserId: string
  body: unknown
  origin?: string
  translationService?: TranslationService
  rateLimiter?: ReturnType<typeof createSlidingWindowRateLimiter>
  timeoutMs?: number
}) => {
  const headers = new Headers({
    origin: input.origin ?? env.BETTER_AUTH_URL,
    'content-type': 'application/json',
  })

  return createSignedInApi(input.actorUserId, {
    translationService:
      input.translationService ?? fakeService(async () => [{ text: '問題' }]),
    ...(input.rateLimiter ? { rateLimiter: input.rateLimiter } : {}),
    ...(input.timeoutMs === undefined ? {} : { timeoutMs: input.timeoutMs }),
  }).fetch(
    new Request(`${API_BASE}/api/v1/translation-candidates`, {
      method: 'POST',
      headers,
      body: JSON.stringify(input.body),
    }),
    env,
  )
}

const countWords = async (): Promise<number> => {
  const row = await env.DB.prepare(`SELECT COUNT(*) AS n FROM words`).first<{
    n: number
  }>()
  return Number(row?.n ?? 0)
}

const countMeanings = async (): Promise<number> => {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM word_meanings`,
  ).first<{ n: number }>()
  return Number(row?.n ?? 0)
}

describe('POST /api/v1/translation-candidates', () => {
  it('未認証は401になる', async () => {
    const response = await SELF.fetch(
      new Request(`${API_BASE}/api/v1/translation-candidates`, {
        method: 'POST',
        headers: {
          origin: env.BETTER_AUTH_URL,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          term: 'issue',
          sourceLanguage: 'en',
          targetLanguage: 'ja',
        }),
      }),
    )
    const body: unknown = await response.json()
    expect(response.status).toBe(401)
    expect(body).toMatchObject({
      error: { code: 'UNAUTHENTICATED' },
    })
  })

  it('Origin不一致は403になる', async () => {
    const response = await callTranslate({
      actorUserId: 'tr-origin',
      origin: 'https://evil.test',
      body: {
        term: 'issue',
        sourceLanguage: 'en',
        targetLanguage: 'ja',
      },
    })
    const body: unknown = await response.json()
    expect(response.status).toBe(403)
    expect(body).toMatchObject({
      error: { code: 'ORIGIN_NOT_ALLOWED' },
    })
  })

  it('候補1件を返し、wordsとmeaningsを増やさない', async () => {
    await insertTestUser(env.DB, 'tr-save')
    const services = createAppServices(env)
    await createWord({
      command: {
        actorUserId: 'tr-save',
        term: 'existing',
        meanings: ['既存'],
        hint: null,
      },
      wordRepository: services.wordRepository,
      clock: { nowEpochMs: () => 1_700_000_000_000 },
    })
    const wordsBefore = await countWords()
    const meaningsBefore = await countMeanings()

    const response = await callTranslate({
      actorUserId: 'tr-save',
      body: {
        term: 'issue',
        sourceLanguage: 'en',
        targetLanguage: 'ja',
      },
    })
    const body: unknown = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      candidates: [{ text: '問題' }],
      provider: 'workers-ai',
      model: '@cf/meta/m2m100-1.2b',
    })
    expect(await countWords()).toBe(wordsBefore)
    expect(await countMeanings()).toBe(meaningsBefore)
  })

  it('空白termは422になる', async () => {
    const response = await callTranslate({
      actorUserId: 'tr-blank',
      body: {
        term: '   ',
        sourceLanguage: 'en',
        targetLanguage: 'ja',
      },
    })
    const body: unknown = await response.json()
    expect(response.status).toBe(422)
    expect(body).toMatchObject({
      error: { code: 'VALIDATION_FAILED' },
    })
  })

  it('101文字のtermは422になる', async () => {
    const response = await callTranslate({
      actorUserId: 'tr-long',
      body: {
        term: 'a'.repeat(TRANSLATION_LIMITS.termMaxChars + 1),
        sourceLanguage: 'en',
        targetLanguage: 'ja',
      },
    })
    expect(response.status).toBe(422)
  })

  it('en→ja以外は422になる', async () => {
    const response = await callTranslate({
      actorUserId: 'tr-lang',
      body: {
        term: 'issue',
        sourceLanguage: 'fr',
        targetLanguage: 'ja',
      },
    })
    expect(response.status).toBe(422)
  })

  it('provider応答不正は502になる', async () => {
    const response = await callTranslate({
      actorUserId: 'tr-502',
      translationService: fakeService(async () => []),
      body: {
        term: 'issue',
        sourceLanguage: 'en',
        targetLanguage: 'ja',
      },
    })
    const body: unknown = await response.json()
    expect(response.status).toBe(502)
    expect(body).toMatchObject({
      error: { code: 'PROVIDER_INVALID_RESPONSE' },
    })
    expect(JSON.stringify(body)).not.toMatch(/translated_text|prompt/iu)
  })

  it('timeoutは503になる', async () => {
    const response = await callTranslate({
      actorUserId: 'tr-503',
      timeoutMs: 20,
      translationService: fakeService(
        () =>
          new Promise(() => {
            // 応答しない。application側のAbortSignal.timeoutで503にする。
          }),
      ),
      body: {
        term: 'issue',
        sourceLanguage: 'en',
        targetLanguage: 'ja',
      },
    })
    const body: unknown = await response.json()
    expect(response.status).toBe(503)
    expect(body).toMatchObject({
      error: { code: 'AI_JUDGE_UNAVAILABLE' },
    })
  })

  it('同一ユーザーの11回目は429になる', async () => {
    const limiter = createSlidingWindowRateLimiter({
      limit: TRANSLATION_LIMITS.rateLimitMax,
      windowMs: TRANSLATION_LIMITS.rateLimitWindowMs,
      clock: { nowEpochMs: () => 1_700_000_000_000 },
    })
    const body = {
      term: 'issue',
      sourceLanguage: 'en',
      targetLanguage: 'ja',
    }

    for (let index = 0; index < TRANSLATION_LIMITS.rateLimitMax; index += 1) {
      const response = await callTranslate({
        actorUserId: 'tr-429',
        rateLimiter: limiter,
        body,
      })
      expect(response.status).toBe(200)
    }

    const limited = await callTranslate({
      actorUserId: 'tr-429',
      rateLimiter: limiter,
      body,
    })
    const limitedBody: unknown = await limited.json()
    expect(limited.status).toBe(429)
    expect(limitedBody).toMatchObject({
      error: { code: 'RATE_LIMITED' },
    })
  })
})
