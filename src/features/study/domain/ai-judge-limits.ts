/**
 * OQ-002/015 で確定した AI 意味判定の上限と採用値。
 * model ID は公式 JSON Mode 対応の instruct モデルから lock する。
 *
 * 出典: https://developers.cloudflare.com/workers-ai/features/json-mode/
 */
export const AI_JUDGE_LIMITS = {
  provider: 'workers-ai',
  /**
   * Workers AI JSON Mode 対応一覧かつ公式 tutorial の instruct モデル。
   * 8B を選び、Workers Free の neuron 枠と 8 秒 timeout に合わせる。
   * wrangler 生成の AiModels はこの ID をまだ含まないため、adapter は狭い run 口を注入する。
   */
  model: '@cf/meta/llama-3.1-8b-instruct-fast',
  promptVersion: 'tango-judge-v1',
  timeoutMs: 8_000,
  rateLimitMax: 10,
  rateLimitWindowMs: 60_000,
  rateLimitedMessage:
    'AI判定の利用上限に達しました。しばらく待ってから再試行してください。',
} as const
