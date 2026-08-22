export type AppErrorCode =
  | 'INVALID_JSON'
  | 'UNAUTHENTICATED'
  | 'ORIGIN_NOT_ALLOWED'
  | 'WORD_NOT_FOUND'
  | 'WORD_DUPLICATE'
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'RATE_LIMITED'
  | 'PROVIDER_INVALID_RESPONSE'
  | 'AI_JUDGE_UNAVAILABLE'
  | 'INTERNAL_ERROR'

export class AppError extends Error {
  readonly name = 'AppError'

  private constructor(
    readonly code: AppErrorCode,
    readonly httpStatus:
      400 | 401 | 403 | 404 | 409 | 422 | 429 | 500 | 502 | 503,
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

  /**
   * OQ-008: 同一利用者内で正規形が一致する単語は登録できない。
   * existingWordIdは所有者scopeで引いた自分の単語に限る。
   * 他人の登録状況を伝えないため、他ユーザーのIDをここへ入れてはいけない。
   */
  static wordDuplicate(existingWordId: string): AppError {
    return new AppError(
      'WORD_DUPLICATE',
      409,
      'この単語はすでに登録されています。',
      { existingWordId },
    )
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

  static rateLimited(retryAfterSeconds?: number): AppError {
    return new AppError(
      'RATE_LIMITED',
      429,
      '翻訳の利用上限に達しました。しばらく待ってから再試行してください。',
      retryAfterSeconds === undefined ? {} : { retryAfterSeconds },
    )
  }

  static providerInvalidResponse(cause?: unknown): AppError {
    return new AppError(
      'PROVIDER_INVALID_RESPONSE',
      502,
      '外部サービスの応答形式が正しくありません。',
      {},
      { cause },
    )
  }

  /**
   * DESIGNのcode名。翻訳とAI判定の一時障害で共用する。
   * 公開messageにprovider本文を載せない。
   */
  static aiJudgeUnavailable(cause?: unknown): AppError {
    return new AppError(
      'AI_JUDGE_UNAVAILABLE',
      503,
      '外部サービスが一時的に利用できません。しばらくしてから再試行してください。',
      {},
      { cause },
    )
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
