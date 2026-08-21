import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { AppError } from '../../src/platform/app-error'
import { createOpaqueId } from '../../src/platform/ids'
import { listOwnedWords } from '../../src/features/words/application/list-owned-words'
import { createWord } from '../../src/features/words/application/manage-word'
import { encodeWordListCursor } from '../../src/features/words/domain/word-list-cursor'
import { createAppServices } from '../../src/server/composition-root'
import { insertTestUser } from '../setup/test-builders'

const createOwnedWord = async (
  userId: string,
  term: string,
  meanings: string[],
  nowEpochMs: number,
) => {
  const services = createAppServices(env)
  return createWord({
    command: {
      actorUserId: userId,
      term,
      meanings,
      hint: null,
    },
    wordRepository: services.wordRepository,
    clock: { nowEpochMs: () => nowEpochMs },
  })
}

const appendResult = async (input: {
  userId: string
  wordId: string
  isCorrect: boolean
  createdAt: number
}) => {
  const services = createAppServices(env)
  await services.testResultRepository.append({
    id: createOpaqueId('tr'),
    userId: input.userId,
    wordId: input.wordId,
    answer: '問題',
    isCorrect: input.isCorrect,
    judgeType: 'exact',
    hintUsed: false,
    judgeProvider: null,
    judgeModel: null,
    promptVersion: null,
    createdAt: input.createdAt,
  })
}

describe('list owned words', () => {
  it('自分の単語だけを返し、他ユーザーの単語は出さない', async () => {
    await insertTestUser(env.DB, 'list-owner')
    await insertTestUser(env.DB, 'list-other')
    await createOwnedWord('list-owner', 'apple', ['りんご'], 100)
    await createOwnedWord('list-other', 'orange', ['みかん'], 101)

    const services = createAppServices(env)
    const page = await listOwnedWords({
      actorUserId: 'list-owner',
      cursor: null,
      limit: 20,
      wordRepository: services.wordRepository,
    })

    expect(page.items.map((word) => word.term)).toEqual(['apple'])
    expect(page.nextCursor).toBeNull()
  })

  it('回答0件は未回答、0%回答済みと区別する', async () => {
    await insertTestUser(env.DB, 'list-stats')
    const unanswered = await createOwnedWord('list-stats', 'empty', ['空'], 200)
    const zeroPercent = await createOwnedWord(
      'list-stats',
      'miss',
      ['失敗'],
      201,
    )
    await appendResult({
      userId: 'list-stats',
      wordId: zeroPercent.id,
      isCorrect: false,
      createdAt: 300,
    })
    await appendResult({
      userId: 'list-stats',
      wordId: zeroPercent.id,
      isCorrect: false,
      createdAt: 301,
    })

    const services = createAppServices(env)
    const page = await listOwnedWords({
      actorUserId: 'list-stats',
      cursor: null,
      limit: 20,
      wordRepository: services.wordRepository,
    })

    const unansweredItem = page.items.find((item) => item.id === unanswered.id)
    const zeroItem = page.items.find((item) => item.id === zeroPercent.id)

    expect(unansweredItem?.stats).toEqual({
      status: 'unanswered',
      correct: 0,
      total: 0,
      accuracy: null,
    })
    expect(zeroItem?.stats).toEqual({
      status: 'answered',
      correct: 0,
      total: 2,
      accuracy: 0,
    })
  })

  it('複数意味を1回の一覧取得で付け、新しい順で返す', async () => {
    await insertTestUser(env.DB, 'list-meanings')
    await createOwnedWord('list-meanings', 'older', ['古い'], 10)
    await createOwnedWord('list-meanings', 'issue', ['問題', '論点'], 20)

    const services = createAppServices(env)
    const page = await listOwnedWords({
      actorUserId: 'list-meanings',
      cursor: null,
      limit: 20,
      wordRepository: services.wordRepository,
    })

    expect(page.items.map((word) => word.term)).toEqual(['issue', 'older'])
    expect(page.items[0]?.meanings.map((meaning) => meaning.meaning)).toEqual([
      '問題',
      '論点',
    ])
  })

  it('cursorは重なりも欠落もなく次ページを返す', async () => {
    await insertTestUser(env.DB, 'list-cursor')
    const created = [
      await createOwnedWord('list-cursor', 'a', ['あ'], 50),
      await createOwnedWord('list-cursor', 'b', ['い'], 50),
      await createOwnedWord('list-cursor', 'c', ['う'], 50),
    ]

    const services = createAppServices(env)
    const first = await listOwnedWords({
      actorUserId: 'list-cursor',
      cursor: null,
      limit: 2,
      wordRepository: services.wordRepository,
    })
    expect(first.items).toHaveLength(2)
    expect(first.nextCursor).toEqual(expect.any(String))

    const second = await listOwnedWords({
      actorUserId: 'list-cursor',
      cursor: first.nextCursor,
      limit: 2,
      wordRepository: services.wordRepository,
    })
    expect(second.items).toHaveLength(1)

    const ids = [...first.items, ...second.items].map((word) => word.id)
    expect(ids).toHaveLength(3)
    expect(new Set(ids).size).toBe(3)
    expect(ids.sort()).toEqual(created.map((word) => word.id).sort())
  })

  it('不正なcursorは422相当で拒否する', async () => {
    await insertTestUser(env.DB, 'list-bad-cursor')
    const services = createAppServices(env)

    await expect(
      listOwnedWords({
        actorUserId: 'list-bad-cursor',
        cursor: '%%%',
        limit: 20,
        wordRepository: services.wordRepository,
      }),
    ).rejects.toBeInstanceOf(AppError)
  })

  it('空一覧はitems空でnextCursorはnull', async () => {
    await insertTestUser(env.DB, 'list-empty')
    const services = createAppServices(env)
    const page = await listOwnedWords({
      actorUserId: 'list-empty',
      cursor: null,
      limit: 20,
      wordRepository: services.wordRepository,
    })
    expect(page).toEqual({ items: [], nextCursor: null })
  })

  it('一覧SQLは所有者indexを使う', async () => {
    const plan = await env.DB.prepare(
      `EXPLAIN QUERY PLAN
       SELECT w.id, COUNT(tr.id) AS total, COALESCE(SUM(tr.is_correct), 0) AS correct
       FROM words w
       LEFT JOIN test_results tr
         ON tr.word_id = w.id AND tr.user_id = w.user_id
       WHERE w.user_id = ?
         AND (w.created_at, w.id) < (?, ?)
       GROUP BY w.id
       ORDER BY w.created_at DESC, w.id DESC
       LIMIT ?`,
    )
      .bind('list-plan', 1, 'w_cursor', 20)
      .all<{ detail: string }>()

    const details = plan.results.map((row) => row.detail).join('\n')
    expect(details).toMatch(/idx_words_user_created/u)
  })

  it('存在しないcursor位置でも所有者外の単語は混ざらない', async () => {
    await insertTestUser(env.DB, 'list-cursor-owner')
    await insertTestUser(env.DB, 'list-cursor-other')
    await createOwnedWord('list-cursor-other', 'secret', ['秘密'], 90)
    await createOwnedWord('list-cursor-owner', 'mine', ['自分'], 80)

    const services = createAppServices(env)
    const page = await listOwnedWords({
      actorUserId: 'list-cursor-owner',
      cursor: encodeWordListCursor({ createdAt: 1_000, id: 'w_zzz' }),
      limit: 20,
      wordRepository: services.wordRepository,
    })

    expect(page.items.map((word) => word.term)).toEqual(['mine'])
  })
})
