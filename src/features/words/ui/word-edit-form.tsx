import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  loadWordRequest,
  updateWordRequest,
  WordRequestError,
} from './word-detail-request'
import { WordFields } from './word-fields'
import type { MeaningDraft } from './word-fields'
import { isClientRuntime, wordQueryKeys } from './word-query-keys'

const toDrafts = (
  meanings: { id: string; meaning: string }[],
): MeaningDraft[] =>
  meanings.map((meaning) => ({ key: meaning.id, value: meaning.meaning }))

export function WordEditForm({ wordId }: { wordId: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const wordQuery = useQuery({
    queryKey: wordQueryKeys.detail(wordId),
    queryFn: () => loadWordRequest(wordId),
    enabled: isClientRuntime(),
    retry: (failureCount, error) => {
      if (error instanceof WordRequestError && error.notFound) {
        return false
      }
      return failureCount < 1
    },
  })

  const mutation = useMutation({
    mutationFn: (input: {
      term: string
      meanings: string[]
      hint: string | null
    }) =>
      updateWordRequest({
        wordId,
        term: input.term,
        meanings: input.meanings,
        hint: input.hint,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: wordQueryKeys.all })
      await navigate({ to: '/words' })
    },
  })

  const notFound =
    wordQuery.error instanceof WordRequestError && wordQuery.error.notFound
  const word = wordQuery.data

  if (!word) {
    if (notFound) {
      return (
        <section>
          <h1>単語を編集</h1>
          <p role="alert">対象の単語が見つかりません。</p>
          <p>
            <Link to="/words">一覧へ</Link>
          </p>
        </section>
      )
    }

    if (wordQuery.isError) {
      return (
        <section>
          <h1>単語を編集</h1>
          <p role="alert">
            {wordQuery.error instanceof Error
              ? wordQuery.error.message
              : '単語の取得に失敗しました。'}{' '}
            <button type="button" onClick={() => void wordQuery.refetch()}>
              再試行
            </button>
          </p>
          <p>
            <Link to="/words">一覧へ</Link>
          </p>
        </section>
      )
    }

    return <p>読み込み中…</p>
  }

  return (
    <WordEditFields
      key={word.updatedAt}
      initial={word}
      isSaving={mutation.isPending}
      errorMessage={
        mutation.isError
          ? mutation.error instanceof Error
            ? mutation.error.message
            : '保存に失敗しました。'
          : null
      }
      onSubmit={(input) => mutation.mutate(input)}
    />
  )
}

function WordEditFields({
  initial,
  isSaving,
  errorMessage,
  onSubmit,
}: {
  initial: {
    term: string
    meanings: { id: string; meaning: string }[]
    hint: string | null
  }
  isSaving: boolean
  errorMessage: string | null
  onSubmit: (input: {
    term: string
    meanings: string[]
    hint: string | null
  }) => void
}) {
  const [term, setTerm] = useState(initial.term)
  const [meanings, setMeanings] = useState(() => toDrafts(initial.meanings))
  const [hint, setHint] = useState(initial.hint ?? '')

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit({
          term,
          meanings: meanings.map((meaning) => meaning.value),
          hint: hint.length === 0 ? null : hint,
        })
      }}
    >
      <h1>単語を編集</h1>
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
      <WordFields
        term={term}
        meanings={meanings}
        hint={hint}
        onTermChange={setTerm}
        onMeaningsChange={setMeanings}
        onHintChange={setHint}
      />
      <p>
        <button type="submit" disabled={isSaving}>
          {isSaving ? '保存中…' : '保存する'}
        </button>
        {' / '}
        <Link to="/words">キャンセル</Link>
      </p>
    </form>
  )
}
