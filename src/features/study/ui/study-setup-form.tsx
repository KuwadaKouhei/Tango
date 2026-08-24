import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { STUDY_LIMITS } from '../domain/study-limits'
import type { StudyCountChoice, StudyMode } from '../domain/study-limits'

export function StudySetupForm() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<StudyMode>('random')
  const [count, setCount] = useState<StudyCountChoice>(
    STUDY_LIMITS.defaultCount,
  )

  return (
    <form
      className="study-setup"
      onSubmit={(event) => {
        event.preventDefault()
        void navigate({
          to: '/study/session',
          search: { mode, count },
        })
      }}
    >
      <h1>テストを始める</h1>
      <p>
        出題方法と件数を選んでください。同じテストの中で同じ単語は繰り返し出ません。
      </p>

      <fieldset>
        <legend>出題方法</legend>
        <p>
          <label>
            <input
              type="radio"
              name="mode"
              value="random"
              checked={mode === 'random'}
              onChange={() => {
                setMode('random')
              }}
            />
            完全ランダム
          </label>
        </p>
        <p>
          <label>
            <input
              type="radio"
              name="mode"
              value="weak"
              checked={mode === 'weak'}
              onChange={() => {
                setMode('weak')
              }}
            />
            苦手優先
          </label>
        </p>
      </fieldset>

      <fieldset>
        <legend>出題数</legend>
        {STUDY_LIMITS.countChoices.map((choice) => (
          <p key={choice}>
            <label>
              <input
                type="radio"
                name="count"
                value={String(choice)}
                checked={count === choice}
                onChange={() => {
                  setCount(choice)
                }}
              />
              {String(choice)}問
            </label>
          </p>
        ))}
        <p>
          <label>
            <input
              type="radio"
              name="count"
              value="all"
              checked={count === 'all'}
              onChange={() => {
                setCount('all')
              }}
            />
            全部
          </label>
        </p>
      </fieldset>

      <p>
        <button type="submit">開始する</button>
        {' / '}
        <Link to="/words">一覧へ</Link>
      </p>
    </form>
  )
}
