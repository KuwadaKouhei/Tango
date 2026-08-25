# 未決事項・意思決定ゲート（OPEN_QUESTIONS）

> 原典の「要確認」を実装都合で勝手に固定しないための台帳。`未決` の項目は、記載した期限までに人間が決定し、関連する REQUIREMENTS / DESIGN / DATABASE / TASKS を同じ変更で更新する。

## 1. プロダクト仕様

| ID | 論点 | 主な選択肢 | 決定期限 | 状態 |
|---|---|---|---|---|
| OQ-001 | 翻訳プロバイダー、モデル、候補件数、料金上限 | Workers AI / DeepL / Google Translation / その他 | T08着手前 | 決定済み（DeepL API Free / 候補1件） |
| OQ-002 | AI判定プロバイダー、モデル、プロンプト、再試行、タイムアウト | Workers AIを含む交換可能な候補 | T11着手前 | 決定済み（Workers AI。model は `@cf/meta/llama-3.1-8b-instruct-fast`） |
| OQ-003 | AI障害時の回答扱い | 未採点で再試行 / 不正解として保存 / AIなしで不正解 | T11着手前 | 決定済み（未採点・履歴非保存・再試行） |
| OQ-004 | 正規化の追加範囲 | 句読点・記号・かなカナ・長音・表記ゆれ | T09着手前 | 決定済み（重複判定は現状。判定のみ句読点+かなカナ） |
| OQ-005 | テスト出題数・既定値・同一テスト内重複 | 1問ずつ継続 / 固定件数 / 選択式、重複可否 | T10着手前 | 決定済み（開始時に5/10/20/全部、既定10、同一テスト内重複なし） |
| OQ-006 | 苦手優先の重み | 正解率、未回答、回答回数、直近結果の組合せ | T10着手前 | 決定済み（未回答=0%、床0.05、回数・直近は見ない） |
| OQ-007 | カード色とアクセシビリティ基準 | 色空間・補間・コントラスト・段階 | T07着手前 | 決定済み（白とHSL端点の連続補間、数値併記、WCAG AA） |
| OQ-008 | 重複単語の定義・扱い | 許可 / 警告 / ユーザー単位で禁止 | T05着手前 | 決定済み（ユーザー単位で禁止） |
| OQ-009 | 単語削除時の回答履歴 | カスケード削除 / 保持して匿名化 / ソフトデリート | T06着手前・初回本番データ投入前 | 決定済み（カスケード削除） |
| OQ-010 | MVP追加候補 | 検索、重複警告、終了結果、間違い再テスト、AI判定手動修正 | タスク追加前 | 決定済み（検索と終了結果はMVP。他はMVP外） |
| OQ-011 | Chrome拡張の認証・CORS・配布 | Cookie / トークン、権限、ストア配布 | 将来フェーズ設計時 | 将来 |
| OQ-012 | 性能目標と想定規模 | p95応答、同時利用者、単語数、履歴数 | 本番公開判定前 | 未決 |

## 2. 技術・運用

| ID | 論点 | 現時点の推奨案 | 決定期限 | 状態 |
|---|---|---|---|---|
| OQ-013 | TanStack Start RC採用可否 | 公式Cloudflare例でPoCし、SSR・Hono分岐・認証・D1・本番ビルドを通してから固定 | T01完了時 | 決定済み（採用） |
| OQ-014 | 依存バージョン | 2026-08-20の候補を `TECH_STACK.md` に記録し、T01で互換セットをlockfileへ固定 | T01完了時 | 決定済み |
| OQ-015 | Cloudflare料金プラン・上限 | MVP利用量とWorkers AIモデル要件を見積もり、Free/Paidを選ぶ | T03完了時 | 決定済み（Workers Free） |
| OQ-016 | 設計・実装・テスト思想 | 個人MVP向け推奨デフォルトを暫定採用。人間レビュー後に承認へ変更 | 実装着手前 | 決定済み |
| OQ-017 | Git/GitHub運用 | Git管理と公開repository `KuwadaKouhei/Tango` は決定済み。GitHub Flow、Conventional Commits、1タスク=1PRは暫定案 | 実装着手前 | 決定済み |
| OQ-018 | 入力件数・文字数上限 | term 100、meaning 200、意味20件、hint/answer 500文字を初期guardrail候補とする | T05着手前 | 決定済み（候補値をそのまま確定） |

## 3. 決定記録

### OQ-013（2026-08-20）

TanStack Start 1.168.48（製品ページはRC表記）を採用する。公式CLIの Cloudflare blank scaffold を起点に、`vite dev`、`vite build`、`vite preview`、SSR画面応答が成功した（POC-01）。

### OQ-014（2026-08-20）

互換セットを `package.json` と `pnpm-lock.yaml` へ exact 固定した。公式CLIは TypeScript 6.0.2 を使うため、npm latest の TypeScript 7 は採用しない。pnpm は `packageManager` で 11.22.0 に固定。詳細は `TECH_STACK.md`。

### OQ-016（2026-08-20）

`PLAN_PHILOSOPHY` / `CODING_PHILOSOPHY` / `TEST_PHILOSOPHY` の推奨デフォルトを承認した。

### OQ-017（2026-08-20）

GitHub Flow、Conventional Commits、1タスク=1ブランチ=1PR、AIはmergeしない運用を承認した。公開repositoryは既存決定どおり `KuwadaKouhei/Tango`。

### OQ-008（2026-08-22）

同一ユーザー内で単語の重複登録を**禁止**する。同一判定は `normalizeTerm` の正規形（NFKC → trim → 小文字化 → 連続空白の1個化）の一致とする。`Issue` / `issue` / `ｉｓｓｕｅ` / ` issue ` は同じ単語として扱う。

- 判定範囲はユーザー単位。別ユーザーが同じ単語を持つのは正常。
- 真値はDBの `UNIQUE(user_id, normalized_term)`。applicationの事前照合は親切なエラーのためであり、同時実行で抜けた分はUNIQUE違反を `409` へ変換して塞ぐ。
- 編集時は自分自身を除外して判定する。term を変えない保存が409にならないこと。
- OQ-010の「重複警告」はMVP外のまま。今回決めたのは警告ではなく**保存の拒否**であり、既存単語の編集画面へ誘導するUIは作らない。
- 比較に使うのは `normalized_term` のみ。意味（`normalized_meaning`）の重複はDBでもUIでも禁止しない。

**OQ-004との関係**: 重複判定の `normalizeTerm` はこの決定のまま固定する。OQ-004（2026-08-23）は判定用正規化だけを広げ、`normalized_term` のUNIQUE再計算は行わない。

### OQ-009（2026-08-22）

単語を削除したら、その単語の回答履歴も**カスケード削除**する。

- `test_results` の複合FK `(word_id, user_id) → words(id, user_id)` を `ON DELETE RESTRICT` から `ON DELETE CASCADE` へ変更する。
- `word_meanings` は従来どおりCASCADE。
- 削除は不可逆で学習履歴を失う。UIは実行前に確認操作を必須とする。
- ソフトデリートと履歴の匿名化スナップショットは採用しない。`words.deleted_at` も履歴側のterm/meaningスナップショットも作らない。
- 統計は履歴から導出するため、削除後にその単語の正解率・回答数は残らない。全体集計を将来追加する場合、削除済み単語の回答は母数から消える。

### OQ-018（2026-08-22）

初期guardrail候補の値をそのまま確定値とする。変更しない。

| 項目 | 確定値 |
|---|---|
| term | 100文字 |
| meaning | 200文字 |
| 1単語あたりの意味 | 20件 |
| hint | 500文字 |
| answer | 500文字（T09以降で適用） |

`INPUT_LIMITS` の「決定までの防御値」という位置づけを解除する。値が変わらないため既存データへの影響はない。

上限はDBのCHECK制約で二重化しない。Zod schemaとUIの `maxLength` だけで守り、将来の見直しでmigrationが要らない状態を保つ。長さ0の拒否は既存のCHECKを維持する。

### OQ-001（2026-08-22）

翻訳は **Workers AI** の **`@cf/meta/m2m100-1.2b`** を使う。利用者決定。

| 項目 | 確定値 | 理由 |
|---|---|---|
| provider | Workers AI | 同一Cloudflare基盤。bindingでsecretを増やさない |
| model | `@cf/meta/m2m100-1.2b` | 公式の翻訳モデル。1リクエスト1訳文 |
| 候補件数 | 1 | モデルが単一 `translated_text` を返す。追加の意味はフォームで手入力する |
| 入力上限 | term 100文字 | OQ-018と同じ。denial-of-wallet抑制 |
| 言語 | `en` → `ja` のみ | TRANS-001。他方向は422 |
| timeout | 8秒（wall clock、AbortSignal） | フォーム操作の待ち上限。自動retryしない |
| rate limit | 認証ユーザーあたり 10回 / 60秒 | isolate内スライディングウィンドウ。連打とneuron消費を抑える |

Workers AIへの実呼び出しは `source_lang: "english"` / `target_lang: "japanese"`（公式TypeScript例に合わせる）。HTTP APIは `sourceLanguage: "en"` / `targetLanguage: "ja"`。

CloudflareのRate Limiting製品は使わない（OQ-015がFreeのため）。limitはWorker isolate内だけ有効で、複数isolate間では共有されない。個人MVPでは許容する。

POC-06のlive品質比較（代表単語セットでの人手確認）はこの環境では未実施。通常CIはcontract mockのみ。previewでの人手確認を残す。品質が足りなければportを保ったままadapterを差し替える。

### OQ-001（2026-08-23 再決定）

previewで `@cf/meta/m2m100-1.2b` の訳質が単語帳の意味候補として不足したため、**DeepL API Free** へ差し替える。利用者決定。

| 項目 | 確定値 | 理由 |
|---|---|---|
| provider | DeepL API Free | EN→JAの短文・単語に強い。月50万文字まで無償 |
| endpoint | `https://api-free.deepl.com/v2/translate` | Freeキー（`:fx`）用ホスト |
| 認証 | Workers secret `DEEPL_AUTH_KEY` | `Authorization: DeepL-Auth-Key …`。query/bodyにkeyを載せない |
| 候補件数 | 1 | Translate APIは1リクエスト1訳文。追加の意味はフォームで手入力 |
| 入力上限 | term 100文字 | OQ-018と同じ |
| 言語 | `en` → `ja` のみ（DeepLへは `EN` / `JA`） | TRANS-001。他方向は422 |
| timeout | 8秒（wall clock、AbortSignal） | 変更なし。自動retryしない |
| rate limit | 認証ユーザーあたり 10回 / 60秒 | isolate内。DeepLの429/456も `RATE_LIMITED` へ変換 |

Workers AI bindingはT12のAI判定用に残し、翻訳からは外す。通常CIはDeepLをlive callしない。

POC-06のDeepL live確認は2026-08-23に配備Workerで実施した。候補1件をフォームへ載せ、翻訳操作だけではDBへ書かないことを確認。providerはDeepL API Freeのまま。

### OQ-005（2026-08-23）

テスト開始時に出題数を選ぶ。利用者決定。

| 項目 | 確定値 |
|---|---|
| 選択肢 | 5 / 10 / 20 / 全部 |
| 既定値 | 10 |
| 同一テスト内の重複 | **しない** |
| 単語不足 | 所有単語数が選択件数より少なければ、所有単語の全件を出題して終了する |
| 問題番号 | 現在の番号 / 今回の出題数（不足時は実際の件数）を表示する |

`test_sessions` テーブルは作らない。出題は1件ずつ `POST /api/v1/study/questions` し、クライアントが今回出した `wordId` を `excludeWordIds` へ載せる。サーバーは所有単語から除外済みを除いて1件返す。候補が無いとき、所有0件なら `404 NO_STUDY_WORDS`、除外で尽きたら `200` で `question: null`。

終了結果はクライアントが今回の判定応答から算出する。各回答の正本は従来どおり `test_results` へ1件ずつ保存する。

### OQ-004（2026-08-23）

正規化を **用途で分ける**。利用者決定。

| 用途 | 関数 | 規則 | 保存 |
|---|---|---|---|
| 英単語の重複判定 | `normalizeTerm` | NFKC → trim → 小文字（`en-US`）→ 連続空白の1個化 | `words.normalized_term`。UNIQUEは現状のまま。再計算しない |
| 意味の保存・検索 | `normalizeMeaning` | NFKC → trim → 小文字（`ja-JP`）→ 連続空白の1個化 | `word_meanings.normalized_meaning`。再計算しない |
| テスト回答の normalized 判定 | `normalizeForJudgement` | 上記の意味正規化のあと、カタカナ→ひらがな、Unicode句読点 `\p{P}` と記号 `\p{S}` を除去 | **保存しない**。判定時に回答原文と各意味原文へ適用する |

含めないもの:

- 長音のゆれ（`コンピューター` と `コンピュータ` は正規化では同一視しない。`ー` は Letter Modifier であり句読点除去でも残る）
- 漢字かな交じりの表記ゆれ辞書（`子供` / `子ども`）。ここはAI判定へ任せる

判定で正規化後が空文字になった回答は `normalized` 一致にしない。exactでも不一致ならAI判定へ進む。

`normalized_term` のUNIQUEを広げないため、既存行の衝突解消migrationは不要。

### OQ-010（2026-08-23）

MVP追加候補の採否。利用者決定。

| 候補 | 採否 | 実装 |
|---|---|---|
| 単語検索 | **MVPに含める** | T18。一覧の `q` 絞り込み |
| テスト終了結果 | **MVPに含める** | T13。出題数・正解数・今回の正解率・今回各問の正誤。再テスト操作は付けない |
| 重複時に既存編集へ誘導 | MVP外 | 409拒否のまま（OQ-008） |
| 間違えた単語だけ再テスト | MVP外 | 出題キューの永続化が要るため先送り |
| AI判定の手動修正 | MVP外 | 監査履歴とデータモデルを先送り |

### OQ-006（2026-08-23）

苦手優先の重み。利用者決定。SQLへ埋め込まず application の `WeaknessWeightPolicy` で計算する。

```text
accuracy = 未回答 ? 0 : correct / total
weight  = max(1 - accuracy, 0.05)
```

- 未回答は 0% と同じ重み（1.0）
- 正解率だけを見る。回答回数と直近正誤は見ない
- 100% でも床 0.05 を残し、出題可能性を0にしない
- 同一テスト内は OQ-005 どおり除外済みを除いて重み付き抽選する

### OQ-002（2026-08-23）

AI意味判定の提供者は **Workers AI**。利用者決定。翻訳（DeepL）とは別経路。`SemanticJudge` portは維持する。

| 項目 | 確定値 |
|---|---|
| provider | Workers AI（binding `AI`） |
| model ID | **`@cf/meta/llama-3.1-8b-instruct-fast`**。公式 JSON Mode 対応の instruct。Workers Free と 8 秒 timeout に合わせ 8B を選んだ。live 品質は POC-05 人手確認 |
| 入力 | 英単語、登録意味、回答のみ。profile / session / OAuth / hint / 履歴は送らない |
| 出力 | boolean の意味一致。Zodで検証する |
| timeout | 8秒（wall clock、AbortSignal） |
| 自動retry | しない。クライアントが失敗を見て再試行する |
| rate limit | 認証ユーザーあたり 10回 / 60秒。翻訳とは別カウンタ。isolate内スライディングウィンドウ |
| CI | 通常CIは live call しない。contract mock と固定評価セット |

prompt本文と `prompt_version`（`tango-judge-v1`）はT12で固定し、AI結果行へ保存する。品質が不足したらportのままadapterを差し替える。

### OQ-003（2026-08-23）

AI判定が timeout / 429 / 5xx / 契約外JSON のとき、**未採点のまま履歴へ保存せず**、同じ回答を再試行できる。HTTPは `503 AI_JUDGE_UNAVAILABLE`。通信失敗を不正解にしない。

exact / normalized で決着した場合は従来どおり保存する。

### OQ-007（2026-08-23）

カード色。利用者決定。色だけに意味を持たせず、未回答／正解率／正解数／回答数を文字でも出す。

| 状態 | 背景 |
|---|---|
| 未回答（`accuracy === null`） | 白 `#ffffff` |
| 回答済み 0% | `hsl(0 70% 88%)` |
| 回答済み 100% | `hsl(95 55% 82%)` |
| 回答済み 0〜100% | 上記端点の H / S / L を正解率で線形補間する。段階パレットは使わない |

文字色はカード上で **WCAG 2.2 AA**（通常テキスト 4.5:1）を目標とする。薄いパステルなので本文は暗い色を使う。T14で実装（本文 `#1a1816`）。

### OQ-015（2026-08-22）

Cloudflareの料金プランは **Workers Free** とする。利用者決定。

- Paid専用のRate Limiting bindingやUnbound CPU前提の処理をMVPへ入れない。
- 翻訳はDeepL API Freeの文字数枠で使う。入力長・timeout・ユーザー単位rate limitで消費を抑える。
- Workers AIのneuron枠はAI判定で使う。model は `@cf/meta/llama-3.1-8b-instruct-fast`。通常CIは live call しない。
- D1 Freeの容量上限は従来どおり。規模目標はOQ-012が未決のまま。

## 4. 更新手順

1. 決定者が選択肢と理由を本書へ記録する。
2. 状態を `決定済み` にし、決定日を追記する。
3. 影響する要件、設計、DB、タスク、テストを同じ変更で更新する。
4. 実装後に決定を変える場合は、データ移行・互換性・ロールバックも記録する。

## 5. 更新履歴

- 2026-08-20 初版作成
- 2026-08-20 OQ-013/014/016/017を決定済みへ更新
- 2026-08-20 T03着手。OQ-009は未決のまま初期FKをRESTRICTとし、公開削除はT07まで作らない。OQ-015はT03完了時まで未決
- 2026-08-20 T04着手。OQ-008は重複を禁止しない。OQ-018は未決のまま初期guardrail候補を防御値として適用
- 2026-08-21 T05着手。OQ-008/018は未決のまま。重複単語は別カードとして並べる。OQ-012も未決のまま、DESIGNのcursor既定20/上限100を防御値としてだけ使う
- 2026-08-21 T06着手。OQ-008/018は未決のまま。OQ-009は未決のため公開DELETEは作らない
- 2026-08-22 OQ-008を「ユーザー単位で禁止・正規形で判定」、OQ-009を「カスケード削除」、OQ-018を「候補値のまま確定」として決定済みへ更新
- 2026-08-22 OQ-001をWorkers AI `@cf/meta/m2m100-1.2b`・候補1件・入力100文字・rate limit、OQ-015をWorkers Freeとして決定済みへ更新
- 2026-08-23 OQ-001をDeepL API Freeへ再決定。候補1件・入力100文字・timeout/rate limitは維持
- 2026-08-23 OQ-002/003/004/005/006/007/010を決定済みへ更新。検索と終了結果をMVPへ含め、間違い再テスト・重複誘導・AI手動修正はMVP外
- 2026-08-23 POC-06のDeepL live確認を配備Workerで実施済みと記録
- 2026-08-24 T12で OQ-002 の model ID を `@cf/meta/llama-3.1-8b-instruct-fast` にlock。POC-05 liveは未実施
- 2026-08-25 T14で OQ-007 のカード色を実装。本文色は `#1a1816`
- 2026-08-25 T15で OQ-012 は未決のまま。CI/E2Eを追加し、本番SLOは固定しない
- 2026-08-25 T15マージ。MVP実装タスクは完了。残未決は OQ-011（将来）と OQ-012（本番公開判定前）
- 2026-08-25 T15入り Worker 再配備と smoke を人間実施済みと記録。POC-05 liveは未実施
