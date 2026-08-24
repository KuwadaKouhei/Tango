import { useEffect, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { StudyAnswerResult as StudyAnswerPayload } from '../api/study-schemas'
import { resolvePlannedCount } from '../domain/planned-count'
import type { StudySessionItem } from '../domain/summarize-study-session'
import type { StudyCountChoice, StudyMode } from '../domain/study-limits'
import { STUDY_LIMITS } from '../domain/study-limits'
import type { StudyQuestion } from '../domain/study-question'
import { describeAnswerResultAnnouncement } from './describe-answer-result-announcement'
import { requestAnswer } from './request-answer'
import { requestHint } from './request-hint'
import { requestNextQuestion } from './request-next-question'
import { StudyAnswerResult } from './study-answer-result'
import { StudySessionSummary } from './study-session-summary'

export type StudySessionSearch = {
  mode: StudyMode
  count: StudyCountChoice
}

type SessionStatus = 'loading' | 'empty' | 'question' | 'finished' | 'error'

export function StudySession({ mode, count }: StudySessionSearch) {
  const [status, setStatus] = useState<SessionStatus>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [plannedCount, setPlannedCount] = useState(0)
  const [shownCount, setShownCount] = useState(0)
  const [excludeWordIds, setExcludeWordIds] = useState<string[]>([])
  const [question, setQuestion] = useState<StudyQuestion | null>(null)
  const [hintText, setHintText] = useState<string | null>(null)
  const [isHintPending, setIsHintPending] = useState(false)
  const [answerDraft, setAnswerDraft] = useState('')
  const [isAnswerPending, setIsAnswerPending] = useState(false)
  const [lastResult, setLastResult] = useState<StudyAnswerPayload | null>(null)
  const [sessionItems, setSessionItems] = useState<StudySessionItem[]>([])
  const nextActionRef = useRef<HTMLButtonElement>(null)
  const summaryHeadingRef = useRef<HTMLHeadingElement>(null)

  const loadQuestion = async (excluded: readonly string[]) => {
    setStatus('loading')
    setErrorMessage(null)
    setHintText(null)
    setAnswerDraft('')
    setLastResult(null)
    setIsAnswerPending(false)
    if (excluded.length === 0) {
      setSessionItems([])
    }

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

  useEffect(() => {
    if (lastResult) {
      nextActionRef.current?.focus()
    }
  }, [lastResult])

  useEffect(() => {
    if (status === 'finished') {
      summaryHeadingRef.current?.focus()
    }
  }, [status])

  const showNext = () => {
    if (!question) {
      return
    }

    const nextExcluded = [...excludeWordIds, question.wordId]
    if (nextExcluded.length >= plannedCount) {
      setExcludeWordIds(nextExcluded)
      setQuestion(null)
      setHintText(null)
      setLastResult(null)
      setStatus('finished')
      return
    }

    setExcludeWordIds(nextExcluded)
    void loadQuestion(nextExcluded)
  }

  const revealHint = async () => {
    if (!question || hintText !== null || isHintPending || lastResult) {
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

  const submitAnswer = async () => {
    if (!question || isAnswerPending || lastResult) {
      return
    }

    setIsAnswerPending(true)
    setErrorMessage(null)
    const result = await requestAnswer({
      wordId: question.wordId,
      answer: answerDraft,
      hintUsed: hintText !== null,
    })
    setIsAnswerPending(false)
    if (!result.ok) {
      setErrorMessage(result.message)
      return
    }

    setSessionItems((current) => [
      ...current,
      {
        wordId: result.result.wordId,
        term: question.term,
        isCorrect: result.result.isCorrect,
      },
    ])
    setLastResult(result.result)
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
      <StudySessionSummary
        items={sessionItems}
        headingRef={summaryHeadingRef}
      />
    )
  }

  return (
    <section className="study-session">
      <h1>テスト</h1>
      {status === 'loading' ? <p>読み込み中…</p> : null}
      {errorMessage ? <p role="alert">{errorMessage}</p> : null}
      <p className="visually-hidden" role="status" aria-live="polite">
        {lastResult && question
          ? describeAnswerResultAnnouncement(question.term, lastResult)
          : ''}
      </p>

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
          {question.hasHint && lastResult === null ? (
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

          {lastResult === null ? (
            <form
              aria-busy={isAnswerPending}
              onSubmit={(event) => {
                event.preventDefault()
                void submitAnswer()
              }}
            >
              <p>
                <label htmlFor="study-answer">日本語の意味</label>
                <br />
                <input
                  id="study-answer"
                  name="answer"
                  value={answerDraft}
                  maxLength={STUDY_LIMITS.answerMaxChars}
                  autoComplete="off"
                  disabled={isAnswerPending}
                  onChange={(event) => {
                    setAnswerDraft(event.target.value)
                  }}
                />
              </p>
              <p>
                <button
                  type="submit"
                  disabled={isAnswerPending || answerDraft.trim().length === 0}
                >
                  {isAnswerPending ? '判定中…' : '回答する'}
                </button>
                {' / '}
                <Link to="/study">やめる</Link>
              </p>
            </form>
          ) : (
            <StudyAnswerResult
              term={question.term}
              result={lastResult}
              isLastQuestion={shownCount >= plannedCount}
              onNext={showNext}
              nextActionRef={nextActionRef}
            />
          )}
        </>
      ) : null}
    </section>
  )
}
