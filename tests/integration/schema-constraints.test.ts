import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { createOpaqueId } from '../../src/platform/ids'
import { createWord } from '../../src/features/words/application/manage-word'
import { createAppServices } from '../../src/server/composition-root'
import { insertTestUser } from '../setup/test-builders'

const clock = { nowEpochMs: () => 1_700_000_000_000 }

describe('D1 schema constraints', () => {
  it('空白termはCHECKで拒否する', async () => {
    await insertTestUser(env.DB, 'user-check-term')

    await expect(
      env.DB.prepare(
        `INSERT INTO words (id, user_id, term, normalized_term, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
        .bind('w_blank', 'user-check-term', '   ', 'issue', 1, 1)
        .run(),
    ).rejects.toThrow()
  })

  it('所有者の違うtest_resultsは複合FKで拒否する', async () => {
    await insertTestUser(env.DB, 'user-fk-a')
    await insertTestUser(env.DB, 'user-fk-b')
    const services = createAppServices(env)
    const word = await createWord({
      command: {
        actorUserId: 'user-fk-a',
        term: 'issue',
        meanings: ['問題'],
        hint: null,
      },
      wordRepository: services.wordRepository,
      clock,
    })

    await expect(
      services.testResultRepository.append({
        id: createOpaqueId('tr'),
        userId: 'user-fk-b',
        wordId: word.id,
        answer: '問題',
        isCorrect: true,
        judgeType: 'exact',
        hintUsed: false,
        judgeProvider: null,
        judgeModel: null,
        promptVersion: null,
        createdAt: clock.nowEpochMs(),
      }),
    ).rejects.toThrow()
  })

  it('word+meaningsのbatch途中失敗は全体rollbackする', async () => {
    await insertTestUser(env.DB, 'user-batch')
    const wordId = 'w_batch_rollback'

    await expect(
      env.DB.batch([
        env.DB.prepare(
          `INSERT INTO words (id, user_id, term, normalized_term, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        ).bind(wordId, 'user-batch', 'issue', 'issue', 1, 1),
        env.DB.prepare(
          `INSERT INTO word_meanings (id, word_id, meaning, normalized_meaning, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ).bind('wm_ok', wordId, '問題', '問題', 0, 1, 1),
        env.DB.prepare(
          `INSERT INTO word_meanings (id, word_id, meaning, normalized_meaning, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        ).bind('wm_bad', wordId, '   ', '論点', 1, 1, 1),
      ]),
    ).rejects.toThrow()

    const leftover = await env.DB.prepare(`SELECT id FROM words WHERE id = ?`)
      .bind(wordId)
      .first()

    expect(leftover).toBeNull()
  })

  it('履歴があるwordのDELETEはCASCADEで履歴も消す', async () => {
    await insertTestUser(env.DB, 'user-cascade')
    const services = createAppServices(env)
    const word = await createWord({
      command: {
        actorUserId: 'user-cascade',
        term: 'issue',
        meanings: ['問題'],
        hint: null,
      },
      wordRepository: services.wordRepository,
      clock,
    })

    await services.testResultRepository.append({
      id: createOpaqueId('tr'),
      userId: 'user-cascade',
      wordId: word.id,
      answer: '問題',
      isCorrect: true,
      judgeType: 'exact',
      hintUsed: false,
      judgeProvider: null,
      judgeModel: null,
      promptVersion: null,
      createdAt: clock.nowEpochMs(),
    })

    const deleted = await services.wordRepository.deleteOwned(
      'user-cascade',
      word.id,
    )
    expect(deleted).toBe(true)

    const leftoverWord = await services.wordRepository.findOwnedById(
      'user-cascade',
      word.id,
    )
    expect(leftoverWord).toBeNull()

    const leftoverHistory = await env.DB.prepare(
      `SELECT id FROM test_results WHERE word_id = ?`,
    )
      .bind(word.id)
      .all()
    expect(leftoverHistory.results).toEqual([])
  })
})
