/**
 * OQ-001（2026-08-23再決定）で確定した翻訳の上限と採用値。
 * 入力長は OQ-018 の term 上限と同じ。候補件数は1。
 */
export const TRANSLATION_LIMITS = {
  provider: 'deepl',
  /**
   * DeepL Translate APIに公開model IDはない。応答の透明性用ラベル。
   */
  model: 'deepl-translate',
  sourceLanguage: 'en',
  targetLanguage: 'ja',
  deeplSourceLang: 'EN',
  deeplTargetLang: 'JA',
  deeplEndpoint: 'https://api-free.deepl.com/v2/translate',
  termMaxChars: 100,
  candidateCount: 1,
  candidateMaxChars: 200,
  timeoutMs: 8_000,
  rateLimitMax: 10,
  rateLimitWindowMs: 60_000,
} as const
