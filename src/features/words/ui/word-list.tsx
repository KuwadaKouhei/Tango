import { Link } from '@tanstack/react-router'
import { useInfiniteQuery } from '@tanstack/react-query'
import { formatWordStatsLabel } from './format-word-stats'
import { listWordsRequest } from './list-words-request'
import { isClientRuntime, wordQueryKeys } from './word-query-keys'

export function WordList({ onSignOut }: { onSignOut: () => void }) {
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

  const items = listQuery.data?.pages.flatMap((page) => page.items) ?? []

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
        <article key={word.id} className="word-card">
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
            <button
              type="button"
              disabled
              title="削除方針が未決のため、まだ使えません"
            >
              削除
            </button>
          </p>
        </article>
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
