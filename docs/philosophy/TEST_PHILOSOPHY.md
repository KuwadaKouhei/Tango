# テスト思想（TEST_PHILOSOPHY）

> 状態: **承認済み（OQ-016）**
> 品質担保の判断基準を定める。テストは実装詳細ではなく、要件と境界の振る舞いを証明する。

## 1. 基本原則

- 受け入れ条件とセキュリティ境界を、再実行可能なテストへ直接結び付ける。
- 純粋なルールは高速なunit、D1・Hono・認証境界はWorkers integration、主要動線だけをE2Eで守る。
- AI・翻訳は契約テストと固定評価セットで扱い、ネットワーク依存を通常CIへ持ち込まない。
- バグ修正は、失敗を再現するテストを先に追加してから直す。

## 2. 採用した決定

| 論点 | 決定 | 理由 |
|---|---|---|
| 全体構成 | integration重視のテスティングトロフィー | 所有者スコープ、D1制約、Hono契約が主要リスクだから |
| unit | 正規化、判定順序、統計、色計算、重み付き抽選 | 組合せを高速・決定的に網羅できるため |
| integration | Hono + application + 実D1 migrationをWorkers runtimeで実行 | NodeだけではWorkers bindingやruntime差を見逃すため |
| contract | AI/翻訳portの成功・schema不正・timeout・429・5xx | provider障害をアプリの安定した失敗へ変換できることを証明するため |
| E2E | Google認証はテスト用代替または保存済み状態を使い、登録→テスト→統計の主要動線に限定 | OAuth外部依存によるflakyを抑えつつユーザー価値を守るため |
| TDD | 重要domain ruleとバグ修正で先行。単純なUIは後追い可 | 費用対効果の高い箇所へ集中するため |
| coverage | 全体目安: line 80%、branch 75%。認可・判定順序・正規化は分岐100% | 数値目的化を避けつつ、危険な分岐は漏らさないため |
| mock | ネットワーク、OAuth、AI、翻訳、時刻、乱数だけ。内部moduleは原則mockしない | 実装詳細への密結合を避けるため |
| snapshot | 原則不使用。小さく安定したschema出力だけ例外 | 意味の薄い大量差分を防ぐため |
| CI gate | format、lint、typecheck、unit/integration、buildを必須。E2Eは主要PRとmainで必須 | mainを常に実行可能にするため |
| flaky | retryで隠さず原因修正。隔離はissue・担当・期限を明記 | 品質低下を常態化させないため |
| traceability | AC-001〜AC-011と各テストIDをTASKS/PRに記載 | 完了条件の取りこぼしを防ぐため |

## 3. 最低限のテストマトリクス

| 対象 | 必須ケース |
|---|---|
| 認証・認可 | 未認証401、他ユーザー対象404、自分のCRUD成功、本文user_id無視/拒否 |
| 単語・意味 | 1件/複数意味、意味0件拒否、空文字、上限、原子的な親子更新rollback |
| 正規化 | trim、大小文字、NFKC全半角、連続空白、複数意味の各位置 |
| 判定順序 | exactでAI 0回、normalizedでAI 0回、不一致でAI 1回、AI schema不正、timeout |
| ヒント | 無しならbutton無し、押下まで非表示、回答履歴へtrue/false保存 |
| 統計 | 0件は未回答、0%回答済みと区別、複数履歴の正解数・率 |
| 翻訳 | 候補反映、ユーザー編集、翻訳だけではwords/meaningsが増えない |
| 二重送信 | 送信中disabled、連打で回答履歴が意図せず重複しない |

## 4. テストの書き方

- 名前は「状況 → 操作 → 期待結果」が読める日本語または英語に統一する。
- Arrange / Act / Assertを分離し、1テストの失敗理由を1つにする。
- データは各テストで作成し、実行順に依存しない。
- property-based testingは正規化の冪等性 `normalize(normalize(x)) === normalize(x)` に検討する。
- AI品質評価は通常CIと分け、固定データセット、モデルID、prompt version、実行日、正答率、曖昧率、p95を記録する。

## 5. アンチパターン

- component内部関数やprivate実装を直接テストする。
- D1 repositoryを全てmockし、所有者スコープのSQLを一度も実行しない。
- 外部AIのライブ応答を通常CIの合否へ直接使う。
- coverageを上げるためだけの無意味なassertを追加する。
- flakyを無期限skipまたは無制限retryで隠す。
- 最終変更後にテスト・buildを再実行せず、以前の成功を根拠にする。

## 6. 更新履歴

- 2026-08-20 初版作成
- 2026-08-20 OQ-016承認を反映
