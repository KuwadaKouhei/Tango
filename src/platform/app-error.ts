export type AppErrorCode =
  | 'INVALID_JSON'
  | 'UNAUTHENTICATED'
  | 'ORIGIN_NOT_ALLOWED'
  | 'WORD_NOT_FOUND'
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'INTERNAL_ERROR'

export class AppError extends Error {
  readonly name = 'AppError'

  private constructor(
    readonly code: AppErrorCode,
    readonly httpStatus: 400 | 401 | 403 | 404 | 422 | 500,
    message: string,
    readonly details: Record<string, unknown> = {},
    options?: { cause?: unknown },
  ) {
    super(message, options)
  }

  static invalidJson(cause?: unknown): AppError {
    return new AppError(
      'INVALID_JSON',
      400,
      'JSONとして読めません。',
      {},
      { cause },
    )
  }

  static unauthenticated(): AppError {
    return new AppError('UNAUTHENTICATED', 401, 'ログインが必要です。')
  }

  static originNotAllowed(): AppError {
    return new AppError(
      'ORIGIN_NOT_ALLOWED',
      403,
      'この操作は許可されたoriginからだけ実行できます。',
    )
  }

  static wordNotFound(): AppError {
    return new AppError('WORD_NOT_FOUND', 404, '対象の単語が見つかりません。')
  }

  static notFound(): AppError {
    return new AppError('NOT_FOUND', 404, '見つかりません。')
  }

  static validation(
    message: string,
    details: Record<string, unknown> = {},
  ): AppError {
    return new AppError('VALIDATION_FAILED', 422, message, details)
  }

  static internal(cause?: unknown): AppError {
    return new AppError(
      'INTERNAL_ERROR',
      500,
      '内部エラーが発生しました。',
      {},
      { cause },
    )
  }
}

export const isAppError = (error: unknown): error is AppError =>
  error instanceof AppError
