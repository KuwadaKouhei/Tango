export type JsonFetchOutcome =
  | { received: true; ok: boolean; status: number; body: unknown }
  | { received: false; message: string }

/**
 * 通信断やJSON以外の応答でPromiseをrejectさせない。
 * 呼び出し側が必ず日本語のエラー表示へ進めるようにし、
 * ブラウザ生成の英語メッセージを画面へ出さないためのもの。
 */
export const fetchJson = async (
  input: string,
  init: RequestInit,
): Promise<JsonFetchOutcome> => {
  let response: Response
  try {
    response = await fetch(input, init)
  } catch {
    return {
      received: false,
      message:
        'ネットワークに接続できませんでした。通信状況を確認してください。',
    }
  }

  try {
    return {
      received: true,
      ok: response.ok,
      status: response.status,
      body: await response.json(),
    }
  } catch {
    return {
      received: false,
      message: `サーバーの応答を解釈できませんでした。（HTTP ${String(response.status)}）`,
    }
  }
}
