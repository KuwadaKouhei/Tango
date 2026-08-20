# 設計思想（PLAN_PHILOSOPHY）

> 状態: **承認済み（OQ-016）**
> アーキテクチャ・構造に関する判断基準を定める。決定は固定ではなく、要件や検証結果に応じて理由付きで更新する。

## 1. 基本原則

- **ドメイン中心**: 正規化、判定順序、出題、所有者スコープなどのプロダクトルールをUI・DB・AI SDKから独立させる。
- **境界で交換可能にする**: D1、翻訳、AI判定、認証はポート越しに扱い、外部技術の変更をドメインへ波及させない。
- **MVPの単純さを守る**: 将来拡張のための境界は設けるが、未採用機能や抽象的な汎用基盤は先に作らない。
- **セキュリティと整合性を先に置く**: ユーザー分離、入力検証、秘密情報保護、履歴整合性は開発速度より優先する。

## 2. 採用した決定

| 論点 | 決定 | 理由 |
|---|---|---|
| アーキテクチャ | 機能単位 + 軽量なポート&アダプタ | 個人MVPで過剰な層を避けつつ、AI・翻訳・D1を交換可能にするため |
| モジュール境界 | `auth`、`words`、`translation`、`study`、`history` のドメイン単位 | 変更理由と受け入れ条件がまとまり、縦スライスで実装しやすい |
| 依存方向 | routes/UI/adapters → application → domain。domainは外部詳細に依存しない | 正規化・判定・抽選を高速かつ決定的にテストするため |
| API境界 | Hono REST APIを外部公開可能な唯一のアプリAPIにする | 将来Chrome拡張とWebで同じユースケースを共有するため |
| Web内の呼び出し | Webも原則 `/api/v1` の契約を利用し、サーバー関数だけに業務処理を閉じ込めない | 外部クライアントとの挙動差を避けるため |
| 状態管理 | サーバー状態はTanStack Query、URLで表せる状態はRouter、フォーム・表示状態はローカル | 複数の真実や不要なグローバルストアを作らないため |
| 同期/非同期 | MVPは同期要求中心。AI/翻訳はタイムアウト可能な外部I/Oとして分離 | ジョブ基盤を先に持たず、失敗境界だけ明確にするため |
| エラー | 想定内失敗は型付きエラー、想定外は境界で捕捉し共通APIエラーへ変換 | エラーを握りつぶさず、UIとログの契約を安定させるため |
| 拡張性 vs 単純さ | YAGNI。2つ目の実装が現れるまで汎用化しない | 仕様未決の多いMVPで誤った抽象を固定しないため |
| データ | 履歴を事実の正本とし、統計はまず問い合わせ時に算出 | 集計値の二重管理による不整合を避けるため |
| 非機能優先度 | セキュリティ・データ整合性 > 保守性 > UX > 計測後の性能最適化 | 個人データ漏えいと履歴破損は後から補償しにくいため |
| プラットフォーム | Cloudflare制約を明示的なアダプタへ閉じ込める | D1やWorkers AIのロックイン範囲を限定するため |

## 3. 境界と依存ルール

```text
React routes/components
        │
        v
Hono API routes ── authentication / validation / HTTP mapping
        │
        v
Application use cases ── orchestration / authorization scope
        │
        v
Domain ── normalization / judgement / selection / entities
        ^
        │ implements ports
Adapters ── Drizzle+D1 / Better Auth / Workers AI / Translation provider
```

- domainからReact、Hono、Drizzle、Better Auth、Cloudflare SDKをimportしない。
- applicationはHonoの`Context`や生の`Request`を受け取らない。
- routesはSQLやAI promptを直接持たず、use caseへ委譲する。
- adapter固有エラーはapplication境界でプロジェクト共通エラーへ変換する。
- 所有者チェックはrouteの表示制御ではなく、repository query条件とuse caseで強制する。

## 4. アンチパターン

- `user_id` をリクエスト本文から受け取り、所有者の根拠にする。
- ReactコンポーネントからD1やAI bindingを直接呼ぶ。
- exactまたはnormalizedで決着した後もAIを呼ぶ。
- 未決事項を「実装しやすいから」という理由だけでプロダクト仕様へ昇格する。
- `utils` や `shared` にドメイン不明のコードを集める。
- 初期からmicroservices、イベントバス、集計テーブルを導入する。
- 外部API障害を空の成功応答や暗黙の不正解へ置き換える。

## 5. 具体例

良い例:

```ts
const result = await answerQuestion.execute({
  actorUserId: session.user.id,
  wordId: input.wordId,
  answer: input.answer,
  hintUsed: input.hintUsed,
})
```

悪い例:

```ts
// UIから渡されたuserIdを信用し、routeでDBとAIを直接操作している
await db.insert(testResults).values({ userId: body.userId, ...body })
```

## 6. 逸脱の扱い

逸脱が必要な場合は、先に `DESIGN.md` の「設計思想からの逸脱」へ、対象、理由、影響、撤回条件を記録する。実装だけを先に変更しない。

## 7. 更新履歴

- 2026-08-20 初版作成
- 2026-08-20 OQ-016承認を反映
