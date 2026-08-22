export type TranslationInput = {
  term: string
}

export type TranslationCandidate = {
  text: string
}

/**
 * 英語→日本語の候補取得。provider SDKとCloudflare型はここへ出さない。
 * 呼び出し側はAbortSignalでtimeoutする。
 */
export type TranslationService = {
  translateToJapanese: (
    input: TranslationInput,
    signal: AbortSignal,
  ) => Promise<TranslationCandidate[]>
}
