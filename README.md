# AI面談品質分析システム(MVP)

新卒人材紹介事業向けに、成果の高いCAと低いCAの面談文字起こしをAIで比較分析し、OS率の差につながっている要因を特定するためのMVPです。

設計の詳細(DB設計・画面構成・AI分析JSONスキーマ・ディレクトリ構成)は [docs/DESIGN.md](docs/DESIGN.md) を参照してください。

## 技術構成

- Next.js 14 (App Router) / TypeScript
- Tailwind CSS
- Supabase (PostgreSQL)
- OpenAI API

## セットアップ手順

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. Supabaseプロジェクトの準備

1. https://supabase.com でプロジェクトを作成(ローカルで動かす場合は [Supabase CLI](https://supabase.com/docs/guides/cli) + `supabase start` でも可)
2. SQL Editor で `supabase/migrations/0001_init.sql` の内容を実行してテーブルを作成
3. プロジェクトの `Project URL` と `anon key` / `service_role key` を控える

### 3. 環境変数の設定

`.env.local.example` をコピーして `.env.local` を作成し、値を埋めてください。

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # サーバー側のみで使用。絶対に公開しないこと
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini        # 任意。既定値はgpt-4o-mini
```

### 4. ローカル起動

```bash
npm run dev
```

http://localhost:3000 にアクセスすると `/interviews`(面談一覧)にリダイレクトされます。

## 画面一覧

| パス | 内容 |
|---|---|
| `/interviews` | 面談一覧(機能3) |
| `/interviews/new` | 面談データ登録(機能1) |
| `/interviews/[id]` | 面談詳細・AI分析実行/結果表示(機能2) |
| `/advisers` | 担当者比較(機能4) |
| `/comparison` | 成果比較・OS有無(機能5) |
| `/ai-comparison` | AI比較分析(機能6) |

## 評価項目を変更したい場合

`src/config/evaluationItems.ts` が12評価項目の単一情報源です。項目の追加・削除・文言変更はこのファイルと、DBの `evaluation_items` テーブル(`supabase/migrations/0001_init.sql` のINSERT文、または管理画面から)の2箇所を更新するだけで、AIプロンプト・DB保存・UI表示すべてに反映されます。コード側のロジック(`analyzeInterview.ts` のプロンプト生成、`ScoreCard.tsx` の表示など)は変更不要です。

## 既知の制約(MVPのため)

- 認証機能は未実装です。社内限定・小規模運用を前提としています。本番運用時はSupabase AuthなどでログインとRow Level Securityの設定を追加してください。
- OS率はDBに保存せず、常に `OS数 / 提案企業数` から計算しています(データ不整合を避けるため)。詳細は `docs/DESIGN.md` の「設計判断」を参照してください。
- AI分析は1面談ずつ同期実行です。大量一括分析やバックグラウンドジョブ化は未対応です。
- OpenAIのレスポンスはJSON形式を強制していますが、モデルの出力揺れに備えて最低限のバリデーションのみ行っています。運用データが増えてきたらプロンプトのチューニングや失敗時リトライの追加を推奨します。
