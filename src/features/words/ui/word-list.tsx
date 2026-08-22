import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { formatWordStatsLabel } from './format-word-stats'
import { listWordsRequest } from './list-words-request'
import { deleteWordRequest } from './word-detail-request'
import { isClientRuntime, wordQueryKeys } from './word-query-keys'
import type { WordListResponse } from '../api/word-schemas'

type WordListItem = WordListResponse['items'][number]

export function WordList({ onSignOut }: { onSignOut: () => void }) {
  const queryClient = useQueryClient()
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const listQuery = useInfiniteQuery({
    queryKey: wordQueryKeys.lists(),
    queryFn: async ({ pageParam }) => {
      const result = await listWordsRequest({ cursor: pageParam })
      if (!result.ok) {
        throw new Error(result.message)
      }
      return result.page
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: isClientRuntime(),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteWordRequest,
    onSuccess: async () => {
      setConfirmingId(null)
      // この画面が一覧を表示中なので、削除後は取り直す。
      await queryClient.invalidateQueries({ queryKey: wordQueryKeys.all })
    },
  })

  const items = listQuery.data?.pages.flatMap((page) => page.items) ?? []
  const deleteErrorMessage = !deleteMutation.isError
    ? null
    : deleteMutation.error instanceof Error
      ? deleteMutation.error.message
      : '削除に失敗しました。'

  return (
    <section>
      <h1>単語一覧</h1>
      <p>
        <Link to="/words/new">単語を登録</Link>
        {' / '}
        <button type="button" onClick={onSignOut}>
          ログアウト
        </button>
      </p>

      {listQuery.isPending ? <p>読み込み中…</p> : null}
      {listQuery.isError ? (
        <p role="alert">
          {listQuery.error instanceof Error
            ? listQuery.error.message
            : '一覧の取得に失敗しました。'}{' '}
          <button type="button" onClick={() => void listQuery.refetch()}>
            再試行
          </button>
        </p>
      ) : null}
      {listQuery.isSuccess && items.length === 0 ? (
        <p>まだ単語がありません。</p>
      ) : null}

      {items.map((word) => (
        <WordCard
          key={word.id}
          word={word}
          isConfirming={confirmingId === word.id}
          isDeleting={deleteMutation.isPending && confirmingId === word.id}
          errorMessage={confirmingId === word.id ? deleteErrorMessage : null}
          onAskDelete={() => {
            deleteMutation.reset()
            setConfirmingId(word.id)
          }}
          onCancelDelete={() => {
            deleteMutation.reset()
            setConfirmingId(null)
          }}
          onConfirmDelete={() => deleteMutation.mutate(word.id)}
        />
      ))}

      {listQuery.hasNextPage ? (
        <p>
          <button
            type="button"
            disabled={listQuery.isFetchingNextPage}
            onClick={() => void listQuery.fetchNextPage()}
          >
            {listQuery.isFetchingNextPage ? '読み込み中…' : 'さらに表示'}
          </button>
        </p>
      ) : null}
    </section>
  )
}

function WordCard({
  word,
  isConfirming,
  isDeleting,
  errorMessage,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  word: WordListItem
  isConfirming: boolean
  isDeleting: boolean
  errorMessage: string | null
  onAskDelete: () => void
  onCancelDelete: () => void
  onConfirmDelete: () => void
}) {
  return (
    <article className="word-card">
      <h2>{word.term}</h2>
      <ol>
        {word.meanings.map((meaning) => (
          <li key={meaning.id}>{meaning.meaning}</li>
        ))}
      </ol>
      <p className="word-card-stats">{formatWordStatsLabel(word.stats)}</p>
      <p>
        <Link to="/words/$wordId/edit" params={{ wordId: word.id }}>
          編集
        </Link>
        {' / '}
        {isConfirming ? (
          <>
            <button
              type="button"
              disabled={isDeleting}
              onClick={onConfirmDelete}
            >
              {isDeleting ? '削除中…' : '削除する'}
            </button>{' '}
            <button
              type="button"
              disabled={isDeleting}
              onClick={onCancelDelete}
            >
              やめる
            </button>
          </>
        ) : (
          <button type="button" onClick={onAskDelete}>
            削除
          </button>
        )}
      </p>
      {isConfirming ? (
        <p role="status">
          この単語と、この単語の回答履歴を削除します。取り消せません。
        </p>
      ) : null}
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
    </article>
  )
}
