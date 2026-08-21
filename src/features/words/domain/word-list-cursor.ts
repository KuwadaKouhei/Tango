import { AppError } from '../../../platform/app-error'
import type { WordListCursor } from './word-list-page'

const toBase64Url = (value: string): string =>
  btoa(value).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')

const fromBase64Url = (value: string): string => {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/')
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4))
  return atob(`${padded}${pad}`)
}

const isCursor = (value: unknown): value is WordListCursor => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const record = value as Record<string, unknown>
  return (
    typeof record.createdAt === 'number' &&
    Number.isInteger(record.createdAt) &&
    Number.isFinite(record.createdAt) &&
    typeof record.id === 'string' &&
    record.id.length > 0
  )
}

export const encodeWordListCursor = (cursor: WordListCursor): string =>
  toBase64Url(JSON.stringify(cursor))

export const decodeWordListCursor = (value: string): WordListCursor => {
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(value))
    if (!isCursor(parsed)) {
      throw new Error('cursor shape is invalid')
    }

    return { createdAt: parsed.createdAt, id: parsed.id }
  } catch {
    throw AppError.validation('一覧の続き位置が正しくありません。', {
      field: 'cursor',
    })
  }
}
