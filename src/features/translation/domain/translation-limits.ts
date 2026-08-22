/**
 * OQ-001（2026-08-22）で確定した翻訳の上限と採用値。
 * 入力長は OQ-018 の term 上限と同じ。候補件数はモデルが1訳文のため1。
 */
export const TRANSLATION_LIMITS = {
  provider: 'workers-ai',
  model: '@cf/meta/m2m100-1.2b',
  sourceLanguage: 'en',
  targetLanguage: 'ja',
  /**
   * Workers AI公式の TypeScript 例に合わせる。
   * パラメータ説明の ISO コード（en/ja）ではなく、example の英語名を送る。
   */
  workersAiSourceLang: 'english',
  workersAiTargetLang: 'japanese',
  termMaxChars: 100,
  candidateCount: 1,
  candidateMaxChars: 200,
  timeoutMs: 8_000,
  rateLimitMax: 10,
  rateLimitWindowMs: 60_000,
} as const
