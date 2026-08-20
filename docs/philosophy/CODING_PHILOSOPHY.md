# 実装思想（CODING_PHILOSOPHY）

> 状態: **承認済み（OQ-016）**
> コードの書き方に関する判断基準を定める。逸脱が必要なら理由を関連設計へ残して相談する。

## 1. 基本原則

- 意図が名前と型から読める、小さく凝集したコードを書く。
- ビジネスロジックは純粋関数へ寄せ、DB・ネットワーク・時刻・乱数を境界へ集める。
- 不正状態を型・schema・DB制約で表現不能に近づける。
- エラーを隠さず、ユーザー向け情報と運用向け情報を分離する。

## 2. 採用した決定

| 論点 | 決定 | 理由 |
|---|---|---|
| TypeScript | `strict`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes`を有効化 | API・D1・AI境界の欠損値をコンパイル時に見つけるため |
| `any` | 原則禁止。外部入力は`unknown`からschemaで絞る | 型安全を見かけだけにしないため |
| 命名 | 変数・関数はcamelCase、型・ComponentはPascalCase、DBはsnake_case、ファイルはkebab-case | TSとSQLの標準的な読みやすさを両立するため |
| boolean | `isCorrect`、`hasHint`、`canEdit`のように真偽が読める名前 | 否定や曖昧なflagを避けるため |
| 関数粒度 | 1関数1責務、行数より凝集度で判断 | 過分割と巨大関数の両方を避けるため |
| 副作用 | domainは純粋。時刻、ID、乱数、DB、AIは注入するport越し | 再現可能なテストとprovider交換を可能にするため |
| エラー | `AppError`のcodeを契約とし、原因は`cause`へ保持。空catch禁止 | UIの分岐と調査可能性を両立するため |
| validation | HTTP/外部AI応答はZod。domain invariantはconstructor/factoryで再検証 | 境界と中心の双方で不正状態を止めるため |
| return | ガード節と早期returnでネストを浅くする | 正常系と失敗条件を読みやすくするため |
| DRY | 3回目を目安に共通化。意味の異なる偶然の重複は許容 | 早すぎる抽象化を避けるため |
| コメント | 「なぜ」「制約」「出典」を日本語で書く。自明な処理説明は書かない | コードから分からない判断だけを残すため |
| 公開契約 | API schema、port、複雑なdomain ruleにはTSDoc | 呼び出し条件と失敗を明示するため |
| format/lint | Prettier + ESLint、CIで差分・違反を拒否 | スタイル議論と手作業を減らすため |
| 依存追加 | 要件適合、Workers互換、保守状況、license、bundle影響を確認 | エッジruntimeで動かない依存を避けるため |
| シークレット | コードへ直書きしない。`.env` / `.dev.vars` / tokenをコミットしない。値をログしない | 認証情報漏えいを防ぐため |

## 3. 実装規約

### 3.1 Resultと例外

- 入力不備、未認証、対象なし、外部サービス一時停止など想定内の失敗はcode付きの型へする。
- programming errorや想定外障害は例外として上げ、HTTP境界で500へ変換する。
- 公開エラーにSQL、stack、provider本文、内部ID、secretを含めない。

### 3.2 日付・ID・乱数

- DB時刻はUnix epoch millisecondsのintegerへ統一する。
- ID生成は衝突しにくいtext IDをapplication境界で行う。
- ランダム出題は`RandomSource`を注入し、テストではseedまたは固定列を使う。

### 3.3 ログ

- JSON構造化ログを使い、`requestId`、route、status、durationMs、errorCodeを記録する。
- 回答本文、登録意味、OAuth token、Cookie、AI prompt全文は既定で記録しない。
- `console.log`の一時デバッグを完成条件に残さない。

## 4. アンチパターン

- `as SomeType` だけで外部入力を信用する。
- route/componentへSQL、prompt、正規化ルールを埋め込む。
- `catch { return null }` で障害と未存在を同一化する。
- 1つの「万能service」や責務不明な`helpers.ts`を作る。
- 将来使うかもしれないexport、option、抽象基底classを先に増やす。
- module scopeでWorkersのsecret環境変数を読む。

## 5. 具体例

良い例:

```ts
export const normalizeMeaning = (value: string): string =>
  value.normalize('NFKC').trim().toLocaleLowerCase('ja-JP').replace(/\s+/gu, ' ')
```

```ts
const parsed = createWordRequestSchema.safeParse(await c.req.json())
if (!parsed.success) {
  throw AppError.validation(parsed.error)
}
```

悪い例:

```ts
const body = (await request.json()) as CreateWordRequest
try { await doEverything(body) } catch { return { ok: false } }
```

## 6. 更新履歴

- 2026-08-20 初版作成
- 2026-08-20 OQ-016承認を反映
