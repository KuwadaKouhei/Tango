import { INPUT_LIMITS } from '../domain/input-limits'

export type MeaningDraft = {
  key: string
  value: string
}

export const newMeaningDraft = (): MeaningDraft => ({
  key: crypto.randomUUID(),
  value: '',
})

export function WordFields({
  term,
  meanings,
  hint,
  onTermChange,
  onMeaningsChange,
  onHintChange,
}: {
  term: string
  meanings: MeaningDraft[]
  hint: string
  onTermChange: (value: string) => void
  onMeaningsChange: (value: MeaningDraft[]) => void
  onHintChange: (value: string) => void
}) {
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
    onMeaningsChange(next)
  }

  return (
    <>
      <p>
        <label htmlFor="term">英単語</label>
        <br />
        <input
          id="term"
          name="term"
          value={term}
          maxLength={INPUT_LIMITS.termMaxChars}
          onChange={(event) => onTermChange(event.target.value)}
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
                onMeaningsChange(next)
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
                onMeaningsChange(
                  meanings.filter((item) => item.key !== meaning.key),
                )
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
            onClick={() => onMeaningsChange([...meanings, newMeaningDraft()])}
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
          onChange={(event) => onHintChange(event.target.value)}
        />
      </p>
    </>
  )
}
