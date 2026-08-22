import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import {
  apiErrorSchema,
  wordResponseSchema,
} from '../../src/features/words/api/word-schemas'
import { createAppServices } from '../../src/server/composition-root'
import { createSignedInApi } from '../setup/signed-in-api'
import { insertTestUser } from '../setup/test-builders'

const API_BASE = 'https://tango.test'

const mutationHeaders = () =>
  new Headers({
    'content-type': 'application/json',
    origin: env.BETTER_AUTH_URL,
  })

const callPost = async (input: {
  actorUserId: string
  term: string
  meanings?: string[]
}) =>
  createSignedInApi(input.actorUserId).fetch(
    new Request(`${API_BASE}/api/v1/words`, {
      method: 'POST',
      headers: mutationHeaders(),
      body: JSON.stringify({
        term: input.term,
        meanings: input.meanings ?? ['意味'],
        hint: null,
      }),
    }),
    env,
  )

const callPut = async (input: {
  actorUserId: string
  wordId: string
  term: string
  meanings?: string[]
}) =>
  createSignedInApi(input.actorUserId).fetch(
    new Request(
      `${API_BASE}/api/v1/words/${encodeURIComponent(input.wordId)}`,
      {
        method: 'PUT',
        headers: mutationHeaders(),
        body: JSON.stringify({
          term: input.term,
          meanings: input.meanings ?? ['意味'],
          hint: null,
        }),
      },
    ),
    env,
  )

const createdWordId = async (response: Response): Promise<string> => {
  const parsed = wordResponseSchema.parse(await response.json())
  return parsed.word.id
}

const countOwnedWords = async (ownerUserId: string): Promise<number> => {
  const services = createAppServices(env)
  const page = await services.wordRepository.listByOwner({
    ownerUserId,
    cursor: null,
    limit: 100,
  })
  return page.items.length
}

describe('POST /api/v1/words の重複拒否', () => {
  it('正規形が一致すると409 WORD_DUPLICATEを返し、2件目を保存しない', async () => {
    await insertTestUser(env.DB, 'dup-post')
    const existingWordId = await createdWordId(
      await callPost({ actorUserId: 'dup-post', term: 'apple' }),
    )

    const conflict = await callPost({ actorUserId: 'dup-post', term: 'apple' })

    expect(conflict.status).toBe(409)
    const parsed = apiErrorSchema.safeParse(await conflict.json())
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.error.code).toBe('WORD_DUPLICATE')
      expect(parsed.data.error.message).toBe(
        'この単語はすでに登録されています。',
      )
      expect(parsed.data.error.details?.existingWordId).toBe(existingWordId)
    }
    expect(await countOwnedWords('dup-post')).toBe(1)
  })

  it('existingWordIdへ他ユーザーの単語IDを出さない', async () => {
    await insertTestUser(env.DB, 'dup-leak-mine')
    await insertTestUser(env.DB, 'dup-leak-theirs')
    const theirs = await createdWordId(
      await callPost({ actorUserId: 'dup-leak-theirs', term: 'secret' }),
    )
    const mine = await createdWordId(
      await callPost({ actorUserId: 'dup-leak-mine', term: 'secret' }),
    )

    const conflict = await callPost({
      actorUserId: 'dup-leak-mine',
      term: 'secret',
    })

    const parsed = apiErrorSchema.safeParse(await conflict.json())
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.error.details?.existingWordId).toBe(mine)
      expect(parsed.data.error.details?.existingWordId).not.toBe(theirs)
    }
  })

  // normalizeTermはNFKC→trim→小文字化→空白畳み込みの順。各段が効くことを個別に見る。
  const normalizationCases = [
    { id: 'case', label: '大文字小文字', first: 'apple', second: 'Apple' },
    { id: 'width', label: '全角半角', first: 'apple', second: 'ａｐｐｌｅ' },
    { id: 'trim', label: '前後空白', first: 'apple', second: '  apple  ' },
    {
      id: 'inner',
      label: '連続する内部空白',
      first: 'ice cream',
      second: 'ice   cream',
    },
  ]

  for (const testCase of normalizationCases) {
    it(`${testCase.label}の違いは同一とみなして409にする`, async () => {
      const userId = `dup-norm-${testCase.id}`
      await insertTestUser(env.DB, userId)
      expect(
        (await callPost({ actorUserId: userId, term: testCase.first })).status,
      ).toBe(201)

      expect(
        (await callPost({ actorUserId: userId, term: testCase.second })).status,
      ).toBe(409)
      expect(await countOwnedWords(userId)).toBe(1)
    })
  }

  it('正規形が違えば登録できる', async () => {
    await insertTestUser(env.DB, 'dup-distinct')
    expect(
      (await callPost({ actorUserId: 'dup-distinct', term: 'apple' })).status,
    ).toBe(201)
    expect(
      (await callPost({ actorUserId: 'dup-distinct', term: 'apples' })).status,
    ).toBe(201)
    expect(await countOwnedWords('dup-distinct')).toBe(2)
  })

  it('別ユーザーの同じ単語は影響を受けない', async () => {
    await insertTestUser(env.DB, 'dup-owner-a')
    await insertTestUser(env.DB, 'dup-owner-b')

    expect(
      (await callPost({ actorUserId: 'dup-owner-a', term: 'shared' })).status,
    ).toBe(201)
    expect(
      (await callPost({ actorUserId: 'dup-owner-b', term: 'shared' })).status,
    ).toBe(201)

    expect(await countOwnedWords('dup-owner-a')).toBe(1)
    expect(await countOwnedWords('dup-owner-b')).toBe(1)
  })
})

describe('PUT /api/v1/words/:wordId の重複拒否', () => {
  it('自分自身は重複扱いしない。term据え置き保存が409にならない', async () => {
    await insertTestUser(env.DB, 'dup-put-self')
    const wordId = await createdWordId(
      await callPost({ actorUserId: 'dup-put-self', term: 'stay' }),
    )

    const response = await callPut({
      actorUserId: 'dup-put-self',
      wordId,
      term: 'stay',
      meanings: ['そのまま', '留まる'],
    })

    expect(response.status).toBe(200)
    const services = createAppServices(env)
    const word = await services.wordRepository.findOwnedById(
      'dup-put-self',
      wordId,
    )
    expect(word?.meanings.map((meaning) => meaning.meaning)).toEqual([
      'そのまま',
      '留まる',
    ])
  })

  it('大小文字だけ変える保存も自分自身なので通す', async () => {
    await insertTestUser(env.DB, 'dup-put-case')
    const wordId = await createdWordId(
      await callPost({ actorUserId: 'dup-put-case', term: 'apple' }),
    )

    const response = await callPut({
      actorUserId: 'dup-put-case',
      wordId,
      term: 'Apple',
    })

    expect(response.status).toBe(200)
    const services = createAppServices(env)
    const word = await services.wordRepository.findOwnedById(
      'dup-put-case',
      wordId,
    )
    expect(word?.term).toBe('Apple')
  })

  it('別の自分の単語と衝突すると409を返し、元の値を保つ', async () => {
    await insertTestUser(env.DB, 'dup-put-other')
    const first = await createdWordId(
      await callPost({ actorUserId: 'dup-put-other', term: 'alpha' }),
    )
    await callPost({ actorUserId: 'dup-put-other', term: 'beta' })

    const response = await callPut({
      actorUserId: 'dup-put-other',
      wordId: first,
      term: 'BETA',
      meanings: ['書き換わってはいけない'],
    })

    expect(response.status).toBe(409)
    const services = createAppServices(env)
    const word = await services.wordRepository.findOwnedById(
      'dup-put-other',
      first,
    )
    expect(word?.term).toBe('alpha')
    expect(word?.meanings.map((meaning) => meaning.meaning)).toEqual(['意味'])
  })

  it('別ユーザーが同じtermを持っていても更新できる', async () => {
    await insertTestUser(env.DB, 'dup-put-mine')
    await insertTestUser(env.DB, 'dup-put-theirs')
    const wordId = await createdWordId(
      await callPost({ actorUserId: 'dup-put-mine', term: 'origin' }),
    )
    await callPost({ actorUserId: 'dup-put-theirs', term: 'target' })

    const response = await callPut({
      actorUserId: 'dup-put-mine',
      wordId,
      term: 'target',
    })

    expect(response.status).toBe(200)
  })
})

/**
 * 事前照合と保存の間に別requestが割り込んだ状況の再現。
 * applicationを経由せずrepositoryへ直接入れて、UNIQUE違反が同じ409になることを見る。
 */
describe('UNIQUE制約違反の409変換', () => {
  const newWordInput = (userId: string, id: string) => ({
    id,
    userId,
    term: 'race',
    normalizedTerm: 'race',
    hint: null,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    meanings: [
      {
        id: `wm_${id}`,
        meaning: '競争',
        normalizedMeaning: '競争',
        sortOrder: 0,
      },
    ],
  })

  it('createの衝突をWORD_DUPLICATEへ変換する', async () => {
    await insertTestUser(env.DB, 'dup-race-create')
    const services = createAppServices(env)
    await services.wordRepository.create(
      newWordInput('dup-race-create', 'w_race_1'),
    )

    await expect(
      services.wordRepository.create(
        newWordInput('dup-race-create', 'w_race_2'),
      ),
    ).rejects.toMatchObject({
      code: 'WORD_DUPLICATE',
      httpStatus: 409,
      details: { existingWordId: 'w_race_1' },
    })
  })

  it('updateの衝突をWORD_DUPLICATEへ変換する', async () => {
    await insertTestUser(env.DB, 'dup-race-update')
    const services = createAppServices(env)
    await services.wordRepository.create(
      newWordInput('dup-race-update', 'w_race_3'),
    )
    await services.wordRepository.create({
      ...newWordInput('dup-race-update', 'w_race_4'),
      term: 'other',
      normalizedTerm: 'other',
      meanings: [
        {
          id: 'wm_race_4',
          meaning: 'ほか',
          normalizedMeaning: 'ほか',
          sortOrder: 0,
        },
      ],
    })

    await expect(
      services.wordRepository.update({
        ...newWordInput('dup-race-update', 'w_race_4'),
        meanings: [
          {
            id: 'wm_race_4b',
            meaning: '競争',
            normalizedMeaning: '競争',
            sortOrder: 0,
          },
        ],
      }),
    ).rejects.toMatchObject({ code: 'WORD_DUPLICATE', httpStatus: 409 })
  })

  it('重複以外の制約違反は500として扱えるよう素通しする', async () => {
    await insertTestUser(env.DB, 'dup-race-other')
    const services = createAppServices(env)
    await services.wordRepository.create(
      newWordInput('dup-race-other', 'w_race_5'),
    )

    // 同じidの再投入はPRIMARY KEY違反。409へ吸い込まれてはいけない。
    await expect(
      services.wordRepository.create({
        ...newWordInput('dup-race-other', 'w_race_5'),
        term: 'different',
        normalizedTerm: 'different',
      }),
    ).rejects.not.toMatchObject({ code: 'WORD_DUPLICATE' })
  })
})
