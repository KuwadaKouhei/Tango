import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { formatWordStatsLabel } from './format-word-stats'
import { listWordsRequest } from './list-words-request'
import type { WordListResponse } from '../api/word-schemas'

type ListStatus = 'loading' | 'ready' | 'error'

export function WordList({ onSignOut }: { onSignOut: () => void }) {
  const [status, setStatus] = useState<ListStatus>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [items, setItems] = useState<WordListResponse['items']>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const loadPage = async (cursor: string | null, append: boolean) => {
    const result = await listWordsRequest({ cursor })
    if (!result.ok) {
      setStatus('error')
      setErrorMessage(result.message)
      return
    }

    setItems((current) =>
      append ? [...current, ...result.page.items] : result.page.items,
    )
    setNextCursor(result.page.nextCursor)
    setErrorMessage(null)
    setStatus('ready')
  }

  useEffect(() => {
    void loadPage(null, false)
    // 初回取得のみ。loadPageはrenderごとに新しくなるため依存に入れない。
  }, [])

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

      {status === 'loading' ? <p>読み込み中…</p> : null}
      {status === 'error' ? (
        <p role="alert">
          {errorMessage}{' '}
          <button
            type="button"
            onClick={() => {
              setStatus('loading')
              void loadPage(null, false)
            }}
          >
            再試行
          </button>
        </p>
      ) : null}
      {status === 'ready' && items.length === 0 ? (
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

      {nextCursor ? (
        <p>
          <button
            type="button"
            disabled={isLoadingMore}
            onClick={() => {
              setIsLoadingMore(true)
              void loadPage(nextCursor, true).finally(() => {
                setIsLoadingMore(false)
              })
            }}
          >
            {isLoadingMore ? '読み込み中…' : 'さらに表示'}
          </button>
        </p>
      ) : null}
    </section>
  )
}
