import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { resolvePlannedCount } from '../domain/planned-count'
import { STUDY_LIMITS } from '../domain/study-limits'
import type { StudyCountChoice, StudyMode } from '../domain/study-limits'
import type { StudyQuestion } from '../domain/study-question'
import { requestHint } from './request-hint'
import { requestNextQuestion } from './request-next-question'

export type StudySessionSearch = {
  mode: StudyMode
  count: StudyCountChoice
}

type SessionStatus = 'loading' | 'empty' | 'question' | 'finished' | 'error'

export function StudySession({ mode, count }: StudySessionSearch) {
  const [status, setStatus] = useState<SessionStatus>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [ownedWordCount, setOwnedWordCount] = useState(0)
  const [plannedCount, setPlannedCount] = useState(0)
  const [shownCount, setShownCount] = useState(0)
  const [excludeWordIds, setExcludeWordIds] = useState<string[]>([])
  const [question, setQuestion] = useState<StudyQuestion | null>(null)
  const [hintText, setHintText] = useState<string | null>(null)
  const [isHintPending, setIsHintPending] = useState(false)
  const [answerDraft, setAnswerDraft] = useState('')

  const loadQuestion = async (excluded: readonly string[]) => {
    setStatus('loading')
    setErrorMessage(null)
    setHintText(null)
    setAnswerDraft('')

    const result = await requestNextQuestion({
      mode,
      excludeWordIds: excluded,
    })
    if (!result.ok) {
      if (result.code === 'NO_STUDY_WORDS') {
        setStatus('empty')
        return
      }

      setErrorMessage(result.message)
      setStatus('error')
      return
    }

    setOwnedWordCount(result.page.ownedWordCount)
    const nextPlanned = resolvePlannedCount(count, result.page.ownedWordCount)
    setPlannedCount(nextPlanned)

    if (result.page.question === null || nextPlanned === 0) {
      setQuestion(null)
      setStatus('finished')
      return
    }

    setQuestion(result.page.question)
    setShownCount(excluded.length + 1)
    setStatus('question')
  }

  useEffect(() => {
    void loadQuestion([])
  }, [mode, count])

  const showNext = () => {
    if (!question) {
      return
    }

    const nextExcluded = [...excludeWordIds, question.wordId]
    if (nextExcluded.length >= plannedCount) {
      setExcludeWordIds(nextExcluded)
      setQuestion(null)
      setHintText(null)
      setStatus('finished')
      return
    }

    setExcludeWordIds(nextExcluded)
    void loadQuestion(nextExcluded)
  }

  const revealHint = async () => {
    if (!question || hintText !== null || isHintPending) {
      return
    }

    setIsHintPending(true)
    setErrorMessage(null)
    const result = await requestHint(question.wordId)
    setIsHintPending(false)
    if (!result.ok) {
      setErrorMessage(result.message)
      return
    }

    setHintText(result.hint)
  }

  if (status === 'empty') {
    return (
      <section>
        <h1>テスト</h1>
        <p>まだ単語がありません。先に単語を登録してください。</p>
        <p>
          <Link to="/words/new">単語を登録</Link>
          {' / '}
          <Link to="/words">一覧へ</Link>
        </p>
      </section>
    )
  }

  if (status === 'finished') {
    return (
      <section>
        <h1>今回の出題は終わりました</h1>
        <p>
          {ownedWordCount === 0
            ? '出題できる単語がありませんでした。'
            : `${String(plannedCount)}問を出題しました。`}
        </p>
        <p>
          <Link to="/study">設定へ戻る</Link>
          {' / '}
          <Link to="/words">一覧へ</Link>
        </p>
      </section>
    )
  }

  return (
    <section className="study-session">
      <h1>テスト</h1>
      {status === 'loading' ? <p>読み込み中…</p> : null}
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}

      {status === 'error' ? (
        <p>
          <button
            type="button"
            onClick={() => void loadQuestion(excludeWordIds)}
          >
            再試行
          </button>
          {' / '}
          <Link to="/study">設定へ戻る</Link>
        </p>
      ) : null}

      {status === 'question' && question ? (
        <>
          <p>
            問題 {String(shownCount)} / {String(plannedCount)}
          </p>
          <p className="study-term">{question.term}</p>
          {question.hasHint ? (
            <p>
              <button
                type="button"
                onClick={() => void revealHint()}
                disabled={isHintPending || hintText !== null}
                aria-expanded={hintText !== null}
              >
                {isHintPending
                  ? '読み込み中…'
                  : hintText !== null
                    ? 'ヒントを表示済み'
                    : 'ヒントを見る'}
              </button>
            </p>
          ) : null}
          {hintText !== null ? (
            <p role="status" className="study-hint">
              {hintText}
            </p>
          ) : null}

          <p>
            <label htmlFor="study-answer">日本語の意味</label>
            <br />
            <input
              id="study-answer"
              name="answer"
              value={answerDraft}
              maxLength={STUDY_LIMITS.answerMaxChars}
              autoComplete="off"
              onChange={(event) => {
                setAnswerDraft(event.target.value)
              }}
            />
          </p>
          <p>
            回答の正誤判定は次の更新で追加します。今は出題とヒントを確認できます。
          </p>
          <p>
            <button type="button" onClick={showNext}>
              {shownCount >= plannedCount ? '終了する' : '次の問題'}
            </button>
            {' / '}
            <Link to="/study">やめる</Link>
          </p>
        </>
      ) : null}
    </section>
  )
}
