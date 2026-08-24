import type { Ref } from 'react'
import { Link } from '@tanstack/react-router'
import type { StudyAnswerResult } from '../api/study-schemas'
import { describeAnswerJudgement } from './describe-answer-judgement'

export function StudyAnswerResult({
  term,
  result,
  isLastQuestion,
  onNext,
  nextActionRef,
}: {
  term: string
  result: StudyAnswerResult
  isLastQuestion: boolean
  onNext: () => void
  nextActionRef: Ref<HTMLButtonElement>
}) {
  return (
    <div className="study-result">
      <p className="visually-hidden">{term}の判定結果</p>
      <p className={result.isCorrect ? 'study-correct' : 'study-incorrect'}>
        {result.isCorrect ? '正解' : '不正解'}
      </p>
      <p>判定: {describeAnswerJudgement(result)}</p>
      {result.judgedByAi ? <p>この判定にはAIを使いました。</p> : null}
      <p>あなたの回答: {result.answer}</p>
      <p>登録した意味</p>
      <ul>
        {result.meanings.map((meaning, index) => (
          <li key={`${String(index)}:${meaning}`}>{meaning}</li>
        ))}
      </ul>
      <p>
        <button type="button" onClick={onNext} ref={nextActionRef}>
          {isLastQuestion ? '終了する' : '次の問題へ'}
        </button>
        {' / '}
        <Link to="/study">やめる</Link>
      </p>
    </div>
  )
}
