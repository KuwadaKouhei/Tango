# 実装タスク一覧（TASKS）

> 状態: **T01 PR中（feature/T01-platform-slice）。人間review/merge後に次タスクへ進む。**
> 1タスク = 1機能 = 1ブランチ = 1PR。人間がmergeしてから依存する次タスクへ進む。未決事項の期限を越えて勝手なdefaultで実装しない。

## 1. 進め方

1. `OPEN_QUESTIONS.md`で対象タスクの意思決定ゲートを確認する。
2. 最新`main`から推奨branchを作る。
3. 関連するREQUIREMENTS / DESIGN / DATABASE / philosophyを読む。
4. 実装、test、自己review、必要な文書更新を同じPRへ含める。
5. format、lint、typecheck、test、buildを最終変更後に再実行する。
6. PRを人間がreview/mergeし、TASKSの状態を更新する。

状態: `⬜未着手` / `🚧作業中` / `🟡PR中` / `✅マージ済み`

## 2. タスク一覧

| ID | タイトル | 受け入れ条件 | 依存 | 意思決定 | branch | 状態 |
|---|---|---|---|---|---|---|
| T01 | Cloudflare上で動く最小縦スライス | 技術PoC | なし | OQ-013,014 | `feature/T01-platform-slice` | 🟡PR中 |
| T02 | Googleログインと保護画面 | AC-001,003 | T01 | OAuth環境設定 | `feature/T02-google-auth` | ⬜未着手 |
| T03 | D1 schema・migration・所有者分離基盤 | AC-003,009 | T01,T02 | OQ-009初期方針確認 | `feature/T03-d1-ownership` | ⬜未着手 |
| T04 | 複数意味・ヒント付き単語登録 | AC-002,006 | T03 | OQ-008,018 | `feature/T04-word-create` | ⬜未着手 |
| T05 | 単語一覧と未回答統計 | AC-003,010 | T04 | OQ-012 | `feature/T05-word-list` | ⬜未着手 |
| T06 | 単語・意味・ヒント編集 | AC-002,003 | T04,T05 | OQ-008,018 | `feature/T06-word-edit` | ⬜未着手 |
| T07 | 単語削除 | AC-003 | T06 | **OQ-009必須** | `feature/T07-word-delete` | ⬜未着手 |
| T08 | 翻訳候補による登録補助 | AC-004 | T04 | **OQ-001,015必須** | `feature/T08-translation` | ⬜未着手 |
| T09 | テスト設定・ランダム出題・ヒント表示 | AC-005,006 | T04,T05 | **OQ-005必須** | `feature/T09-random-study` | ⬜未着手 |
| T10 | exact/normalized判定と履歴保存 | AC-007,009 | T03,T09 | **OQ-004,018必須** | `feature/T10-local-judgement` | ⬜未着手 |
| T11 | 苦手優先出題 | AC-005 | T10 | **OQ-006,012必須** | `feature/T11-weak-study` | ⬜未着手 |
| T12 | AI意味判定fallback | AC-008,009 | T10 | **OQ-002,003,015必須** | `feature/T12-ai-judgement` | ⬜未着手 |
| T13 | 回答結果表示と次問題への遷移 | AC-005〜009 | T09,T10,T12 | OQ-005 | `feature/T13-answer-result` | ⬜未着手 |
| T14 | 正解率カード色とアクセシビリティ | AC-010,011 | T10,T11 | **OQ-007必須** | `feature/T14-mastery-visuals` | ⬜未着手 |
| T15 | CI・E2E・preview release gate | AC-001〜011 | T02〜T14 | OQ-012,017 | `feature/T15-release-gate` | ⬜未着手 |

## 3. タスク詳細

### T01 Cloudflare上で動く最小縦スライス

概要: 公式TanStack Start scaffoldを基点に、Start画面、Hono `/api/v1/health`、Cloudflare Workers build/previewを端から端まで通す。

完了条件:

- Node/pnpm/package versionを固定し、`pnpm-lock.yaml`を作る。
- `src/server.ts`で`/api/*`をHono、それ以外をStartへ分岐する。
- `wrangler.jsonc`、binding type生成、`.gitignore`、dummyのみの`.dev.vars.example`を用意する。
- local dev、Workers preview、production buildが成功する。
- health integration testがWorkers runtimeで成功する。
- 実scaffoldとの差をTECH_STACK/DIRECTORY_STRUCTUREへ反映し、OQ-013/014を決定する。

必須検証: POC-01、POC-02、format、lint、typecheck、test、build。

### T02 Googleログインと保護画面

概要: Better Auth + Google OAuth + D1でlogin、callback、session、logout、保護layoutを実装する。

完了条件:

- lockしたBetter Auth CLIでauth schemaを生成し、DATABASEへ実名を反映する。
- `/api/auth/*`を処理し、login成功後に単語一覧へ移動する。
- 未認証Webはloginへ誘導し、private APIは401を返す。
- secretをbrowser bundle、log、Gitへ含めない。
- preview環境でlogin、session復元、logout、再loginが成功する。

必須検証: POC-03、AC-001、未認証integration、callback URL/secure cookie確認。

### T03 D1 schema・migration・所有者分離基盤

概要: app table、Drizzle migration、D1 repository基盤、共通API error/auth/origin middlewareを作り、tenant isolationを先に証明する。

完了条件:

- DATABASE準拠のapp schemaとindexをmigration化する。
- local/previewで同一migrationを適用できる。
- FK、CHECK、複合owner FK、D1 batch rollback testが通る。
- repositoryはactor userでscopeし、他ユーザー資源を404とする。
- 共通error shapeとrequest IDがcontract testで固定される。

必須検証: POC-04、2ユーザーの漏えい/更新/削除否定test。

### T04 複数意味・ヒント付き単語登録

概要: 登録画面からHono API、application、D1までの縦スライスを実装する。

完了条件:

- 1件以上の意味を追加・削除・並べて登録できる。
- 意味0件、空白、OQ-018で決めた上限をUI/APIの両方で扱う。
- hintは任意で空文字をNULLへ正規化する。
- wordとmeaningsがD1 batchで全件成功または全件rollbackする。
- 新規画面に回答回数を表示しない。

必須検証: AC-002、意味0件、複数意味、rollback、他ユーザー指定不能。

### T05 単語一覧と未回答統計

概要: 所有単語を意味と統計付きcursor一覧で表示する。

完了条件:

- 自分の単語だけを一覧表示する。
- 全意味、未回答、正解数/回答数、編集/削除導線を表示する。
- 回答0件は`accuracy:null`で、0%と区別する。
- query planとページングを確認し、N+1を避ける。

必須検証: AC-003、AC-010、empty/loading/error、cursor安定性。

### T06 単語・意味・ヒント編集

概要: 所有単語を読み込み、複数意味とhintを原子的に置換更新する。

完了条件:

- 保存後も意味1件以上を保証する。
- 他ユーザーwordはGET/PUTとも404。
- update失敗時に古いword/meaningsが保たれる。
- 編集後に一覧とQuery cacheが整合する。

必須検証: AC-002/003、最終meaning削除拒否、batch rollback。

### T07 単語削除

概要: OQ-009で承認された履歴保持方針に従って削除を実装する。

完了条件:

- DATABASEのFK/soft-delete/schemaを決定内容へ更新する。
- 自分のwordだけを確認操作後に削除できる。
- 他ユーザーwordは404。
- 履歴あり/なし、再読込、統計への影響が承認方針どおり。

必須検証: OQ-009の全受け入れcase。決定前は着手禁止。

### T08 翻訳候補による登録補助

概要: provider portと最初のadapterを実装し、候補をフォームへ反映する。

完了条件:

- POC-06でprovider/model/料金上限/候補件数を評価しOQ-001を決定する。
- 翻訳だけではwords/meaningsへ一切書き込まない。
- 候補を選択・編集・削除・追加入力できる。
- timeout、429、provider schema不正を共通errorへ変換する。
- rate limitと入力上限を適用する。

必須検証: AC-004、provider contract、DB未更新、error/retry UX。

### T09 テスト設定・ランダム出題・ヒント表示

概要: mode設定画面とrandom問題取得、条件付きhint取得を実装する。

完了条件:

- random/weakの選択UIを表示し、randomで所有wordを出題する。
- OQ-005に従い件数・重複を扱う。
- hint無しはbutton無し、hint有りも押すまで本文を返さない/表示しない。
- 0 word時のempty stateを表示する。

必須検証: AC-005/006、他ユーザー問題除外、hint条件、二重要求。

### T10 exact/normalized判定と履歴保存

概要: 決定的な2段階判定をpure domainで実装し、回答履歴へ保存する。

完了条件:

- exact一致で`exact`、必須正規化一致で`normalized`となる。
- 複数意味のどれに一致しても正解。
- このタスクでは不一致をAIへ送らず、T12用port呼び出し点を用意する。
- answer/isCorrect/judgeType/hintUsed/timeを所有者履歴へ保存する。
- 回答送信の二重送信をUIで防ぐ。

必須検証: AC-007/009、正規化冪等性、AI mock呼び出し0回、0%統計。

### T11 苦手優先出題

概要: OQ-006で決めた正の重みに基づく出題strategyを実装する。

完了条件:

- 低正解率ほど統計的に高頻度となる固定seed testを用意する。
- 全wordのweightが0より大きい。
- 未回答、回答回数、直近結果を決定どおり扱う。
- random modeの挙動を変えない。
- 想定最大件数でquery/抽選時間を計測する。

必須検証: AC-005、weight property、所有者分離、性能記録。

### T12 AI意味判定fallback

概要: exact/normalized不一致時だけSemanticJudgeを呼び、透明性情報と履歴を返す。

完了条件:

- POC-05評価とOQ-002/003を決定する。
- exact/normalized時はAI 0回、不一致時だけ最大1回。
- provider responseをZod検証し、model/prompt versionをAI結果へ保存する。
- timeout/429/5xx/schema不正を決定したUX・保存方針で扱う。
- AI利用を結果画面で明示する。

必須検証: AC-008/009、固定評価セット、contract test、rate limit、秘密/本文logなし。

### T13 回答結果表示と次問題への遷移

概要: 判定結果の全必須情報を表示し、次の問題へ安全に進む。

完了条件:

- 正誤、回答、全登録意味、judge type、AI利用有無を表示する。
- loading中の再送信を拒否し、失敗は同一回答を安全に再試行できる。
- 次問題の重複・終了条件はOQ-005どおり。
- keyboard操作とscreen reader向けresult announcementを用意する。

必須検証: AC-005〜009、連打、error→retry、keyboard。

### T14 正解率カード色とアクセシビリティ

概要: 回答履歴を一覧へ反映し、未回答/0%/100%を色と文字で区別する。

完了条件:

- OQ-007で色空間、端点、contrast基準を決める。
- 未回答は白、0%回答済みは赤系で異なる文字label。
- 0〜100%を連続補間し、必ず数値と正解数/回答数を併記する。
- responsive幅、keyboard focus、contrastを検証する。

必須検証: AC-010/011、null/0/0.5/1、色以外の識別、visual check。

### T15 CI・E2E・preview release gate

概要: MVP主要動線を自動gate化し、previewへ再現可能に配備する。

完了条件:

- GitHub Actionsでfrozen install、format、lint、typecheck、unit/integration、buildを必須化する。
- AC-001〜011のtraceability表をPRまたはtest reportで埋める。
- 登録→テスト→統計のPlaywright E2Eを通す。外部Google/AIは安定したtest境界を使う。
- previewに同じmigration/configでdeployし、manual smoke testを記録する。
- secret、料金上限、log、rollback、OQ-012の性能目標を確認する。
- Blocker 0、最終変更後の全gate成功をrelease条件にする。

必須検証: AC-001〜011、Workers preview、migration rehearsal、security/quality review。

## 4. 受け入れ条件の網羅

| AC | 主担当タスク | 最終gate |
|---|---|---|
| AC-001 | T02 | T15 E2E |
| AC-002 | T04,T06 | T15 E2E |
| AC-003 | T02,T03,T04〜T07 | T15 isolation suite |
| AC-004 | T08 | T15 E2E/contract |
| AC-005 | T09,T11,T13 | T15 E2E |
| AC-006 | T04,T09 | T15 E2E |
| AC-007 | T10 | T15 integration |
| AC-008 | T12,T13 | T15 integration/E2E |
| AC-009 | T03,T10,T12 | T15 D1 integration |
| AC-010 | T05,T14 | T15 E2E |
| AC-011 | T14 | T15 accessibility/visual check |

## 5. 並行可能性

- T08はT04完了後、T05〜T07と並行開発できる。ただし同時merge時は最新mainへrebaseし全gateを再実行する。
- T11はT10後、T12と並行できる。
- 1人運用では並行branchを増やさず、表の順序を既定とする。

## 6. MVP外タスク

OQ-010の検索、重複警告、終了結果、間違い再テスト、AI手動修正は未採用であり、本表へ含めない。採用時はREQUIREMENTS/DESIGN/DATABASEを先に更新して新IDを追加する。

## 7. 更新履歴

- 2026-08-20 初版作成
- 2026-08-20 T01を作業中へ更新。OQ-013/014/016/017は決定済み
- 2026-08-20 T01をPR中へ更新
