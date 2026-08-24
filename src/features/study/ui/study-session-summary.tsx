import { Link } from '@tanstack/react-router'
import type { Ref } from 'react'
import type { StudySessionItem } from '../domain/summarize-study-session'
import { summarizeStudySession } from '../domain/summarize-study-session'
import { formatStudySessionAccuracy } from './format-study-session-summary'

export function StudySessionSummary({
  items,
  headingRef,
}: {
  items: readonly StudySessionItem[]
  headingRef: Ref<HTMLHeadingElement>
}) {
  const summary = summarizeStudySession(items)

  return (
    <section className="study-session">
      <h1 tabIndex={-1} ref={headingRef}>
        今回の結果
      </h1>
      {summary.askedCount === 0 ? (
        <p>出題できる単語がありませんでした。</p>
      ) : (
        <>
          <p>
            出題数 {String(summary.askedCount)} 問 / 正解数{' '}
            {String(summary.correctCount)} 問
          </p>
          <p>{formatStudySessionAccuracy(summary)}</p>
          <h2>各問の正誤</h2>
          <ol className="study-session-items">
            {summary.items.map((item, index) => (
              <li key={item.wordId}>
                {String(index + 1)}. {item.term}：
                {item.isCorrect ? '正解' : '不正解'}
              </li>
            ))}
          </ol>
        </>
      )}
      <p>
        <Link to="/words">一覧へ戻る</Link>
        {' / '}
        <Link to="/study">設定へ戻る</Link>
      </p>
    </section>
  )
}
