import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createWordRequest } from './create-word-request'
import { newMeaningDraft, WordFields } from './word-fields'
import { wordQueryKeys } from './word-query-keys'
import type { WordResponse } from '../api/word-schemas'

export function WordCreateForm() {
  const queryClient = useQueryClient()
  const [term, setTerm] = useState('')
  const [meanings, setMeanings] = useState(() => [newMeaningDraft()])
  const [hint, setHint] = useState('')
  const [saved, setSaved] = useState<WordResponse['word'] | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      const result = await createWordRequest({
        term,
        meanings: meanings.map((meaning) => meaning.value),
        hint: hint.length === 0 ? null : hint,
      })
      if (!result.ok) {
        throw new Error(result.message)
      }
      return result.word
    },
    onSuccess: async (word) => {
      await queryClient.invalidateQueries({ queryKey: wordQueryKeys.all })
      setSaved(word)
    },
  })

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
              mutation.reset()
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
        mutation.mutate()
      }}
    >
      <h1>単語を登録</h1>
      {mutation.isError ? (
        <p role="alert">
          {mutation.error instanceof Error
            ? mutation.error.message
            : '登録に失敗しました。'}
        </p>
      ) : null}

      <WordFields
        term={term}
        meanings={meanings}
        hint={hint}
        onTermChange={setTerm}
        onMeaningsChange={setMeanings}
        onHintChange={setHint}
      />

      <p>
        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? '登録中…' : '登録する'}
        </button>
        {' / '}
        <Link to="/words">キャンセル</Link>
      </p>
    </form>
  )
}
