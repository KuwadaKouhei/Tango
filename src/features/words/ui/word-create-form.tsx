import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { INPUT_LIMITS } from '../domain/input-limits'
import { createWordRequest } from './create-word-request'
import type { WordResponse } from '../api/word-schemas'

type MeaningDraft = {
  key: string
  value: string
}

const newMeaningDraft = (): MeaningDraft => ({
  key: crypto.randomUUID(),
  value: '',
})

export function WordCreateForm() {
  const [term, setTerm] = useState('')
  const [meanings, setMeanings] = useState<MeaningDraft[]>([newMeaningDraft()])
  const [hint, setHint] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saved, setSaved] = useState<WordResponse['word'] | null>(null)

  const moveMeaning = (index: number, offset: number) => {
    const target = index + offset
    if (target < 0 || target >= meanings.length) {
      return
    }

    const next = meanings.slice()
    const current = next[index]
    const swapped = next[target]
    if (!current || !swapped) {
      return
    }

    next[index] = swapped
    next[target] = current
    setMeanings(next)
  }

  const submit = async () => {
    setErrorMessage(null)
    setIsSubmitting(true)
    const result = await createWordRequest({
      term,
      meanings: meanings.map((meaning) => meaning.value),
      hint: hint.length === 0 ? null : hint,
    })
    setIsSubmitting(false)

    if (!result.ok) {
      setErrorMessage(result.message)
      return
    }

    setSaved(result.word)
  }

  if (saved) {
    return (
      <section>
        <h1>登録しました</h1>
        <p>
          <strong>{saved.term}</strong>
        </p>
        <ol>
          {saved.meanings.map((meaning) => (
            <li key={meaning.id}>{meaning.meaning}</li>
          ))}
        </ol>
        {saved.hint ? <p>ヒント: {saved.hint}</p> : null}
        <p>
          <button
            type="button"
            onClick={() => {
              setSaved(null)
              setTerm('')
              setMeanings([newMeaningDraft()])
              setHint('')
              setErrorMessage(null)
            }}
          >
            続けて登録
          </button>
          {' / '}
          <Link to="/words">一覧へ</Link>
        </p>
      </section>
    )
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <h1>単語を登録</h1>
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}

      <p>
        <label htmlFor="term">英単語</label>
        <br />
        <input
          id="term"
          name="term"
          value={term}
          maxLength={INPUT_LIMITS.termMaxChars}
          onChange={(event) => setTerm(event.target.value)}
          required
        />
      </p>

      <fieldset>
        <legend>日本語の意味（1件以上）</legend>
        {meanings.map((meaning, index) => (
          <p key={meaning.key}>
            <label htmlFor={`meaning-${meaning.key}`}>
              意味 {String(index + 1)}
            </label>
            <br />
            <input
              id={`meaning-${meaning.key}`}
              value={meaning.value}
              maxLength={INPUT_LIMITS.meaningMaxChars}
              onChange={(event) => {
                const next = meanings.slice()
                next[index] = { ...meaning, value: event.target.value }
                setMeanings(next)
              }}
            />{' '}
            <button
              type="button"
              onClick={() => moveMeaning(index, -1)}
              disabled={index === 0}
            >
              上へ
            </button>{' '}
            <button
              type="button"
              onClick={() => moveMeaning(index, 1)}
              disabled={index === meanings.length - 1}
            >
              下へ
            </button>{' '}
            <button
              type="button"
              onClick={() =>
                setMeanings(meanings.filter((item) => item.key !== meaning.key))
              }
              disabled={meanings.length <= 1}
            >
              削除
            </button>
          </p>
        ))}
        <p>
          <button
            type="button"
            onClick={() => setMeanings([...meanings, newMeaningDraft()])}
            disabled={meanings.length >= INPUT_LIMITS.meaningMaxCount}
          >
            意味を追加
          </button>
        </p>
      </fieldset>

      <p>
        <label htmlFor="hint">ヒント（任意）</label>
        <br />
        <input
          id="hint"
          name="hint"
          value={hint}
          maxLength={INPUT_LIMITS.hintMaxChars}
          onChange={(event) => setHint(event.target.value)}
        />
      </p>

      <p>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '登録中…' : '登録する'}
        </button>
        {' / '}
        <Link to="/words">キャンセル</Link>
      </p>
    </form>
  )
}
