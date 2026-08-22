# Git運用方針（GIT_CONVENTIONS）

> 状態: **承認済み（OQ-017）**
> Repository: [KuwadaKouhei/Tango](https://github.com/KuwadaKouhei/Tango)（PUBLIC）

## 1. 概要

- Git管理: 利用する。`main`を既定branch、`origin`を公開GitHub repositoryとする。
- 全体方針: 小さく検証可能な履歴を残し、`main`を常にgreenに保つ。
- 実装単位: `docs/TASKS.md` の **1タスク = 1機能 = 1ブランチ = 1PR**。
- マージ権限: AIはPR作成まで。人間がレビュー・承認・マージする。

## 2. ブランチ運用

- 戦略: GitHub Flowに近い短命feature branch。
- 起点: 最新の`main`。
- 命名: `feature/<task-id>-<kebab-slug>`、例 `feature/T05-word-create`。
- 修正: `fix/<task-id>-<kebab-slug>`、文書のみ: `docs/<slug>`。
- タスクに紐付かない開発基盤の整備: `chore/<slug>`、例 `chore/gitattributes-eol`。`docs/TASKS.md` へは載せず、振る舞いを変えないものに限る。
- `main`への直接commit: 原則禁止。2026-08-20の初回baselineは、公開repository作成・pushの明示依頼に基づく例外とする。
- PR本文: タスクID、対応AC/REQ、変更概要、テスト結果、レビュー結果、未確認事項、影響ドキュメントを含める。
- CI: format、lint、typecheck、test、buildが全て成功するまでmergeしない。

## 3. コミット粒度

- 1コミット1論理変更。単独でレビュー・revertできる大きさにする。
- 振る舞い変更と大規模formatを同じcommitへ混ぜない。
- WIP commitはfeature branch内で許容するが、PR merge前に意味のある履歴へ整理する。
- squash mergeを既定候補とするが、最終選択は人間が決める。
- ドキュメント初版は、repository作成時の初回baselineとして1commitにまとめる。以後は1フェーズ1commitを基本とする。
- コード変更と対応ドキュメント更新は同じPRに含める。

## 4. コミットメッセージ

- 形式: Conventional Commits `type(scope): 件名`。
- type: `feat`、`fix`、`docs`、`refactor`、`test`、`perf`、`style`、`chore`、`ci`。
- 言語: 日本語。
- 件名: 目安50字、末尾ピリオドなし、何が変わるかを具体的に書く。
- 本文: 変更理由、トレードオフ、移行・互換性、関連issue/PRを書く。
- 破壊的変更: `BREAKING CHANGE:` footerを付ける。

例:

```text
feat(words): 複数意味を含む単語登録APIを追加

意味0件の保存を拒否し、単語と意味をD1 batchで原子的に保存するため。
Refs: T05, AC-002
```

悪い例:

```text
fix
update files
いろいろ修正
```

## 5. PRとレビュー

- PRは1つのタスクとその受け入れ条件に集中させる。
- schema変更にはmigration、rollback方針、`DATABASE.md`更新を含める。
- API変更にはschema/contract testと`DESIGN.md`更新を含める。
- UI変更には主要状態（loading、empty、error、success）と必要な画面確認を含める。
- AI/翻訳変更にはprovider、model、prompt version、評価結果を含める。

## 6. 改行コード

- リポジトリ内・作業ツリーともLFへ統一し、`.gitattributes` の `* text=auto eol=lf` で強制する。
- Prettierの既定 `endOfLine: "lf"` に揃えるためであり、`core.autocrlf` の値に関わらず全環境で同じ結果になる。
- `.gitattributes` を消すと、Windowsの `core.autocrlf=true` 環境で `pnpm format` のたびに全ファイルが差分ゼロのまま変更扱いになり、branch切り替えが阻害される。
- 画像・font・アーカイブ等は `binary` を明示し、誤変換を防ぐ。

## 7. 禁止事項

- シークレット、APIキー、OAuth secret、Cloudflare token、Cookie、`.env`、`.dev.vars`をcommitしない。
- `node_modules`、build成果物、ローカルD1データ、テスト動画等の生成物を無差別にcommitしない。
- 検証失敗を無視するための`--no-verify`を常用しない。
- 他人またはユーザーの変更を無断でreset、checkout、上書きしない。
- AIはPRをmergeしない。

## 8. タグ・リリース

- MVP公開までは未定。
- 公開後はSemVerを候補とし、release noteへschema migrationと既知制限を記載する。

## 9. 更新履歴

- 2026-08-20 初版作成
- 2026-08-20 公開GitHub repositoryと初回baseline方針を反映
- 2026-08-20 OQ-017の運用細部を承認済みへ更新
- 2026-08-22 改行コード方針（`.gitattributes` でLF統一）と `chore/<slug>` branchを追加。以降の節番号を繰り下げ
