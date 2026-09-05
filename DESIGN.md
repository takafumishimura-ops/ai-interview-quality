# AI面談品質分析システム — 設計ドキュメント (MVP)

対象: 新卒人材紹介事業における面談品質分析。成果(OS率)の高いCAと低いCAの面談文字起こしを比較し、差分要因を特定する。

---

## 1. データベース設計 (Supabase / PostgreSQL)

### 設計方針
- 学生名は扱わず **学生ID** を基本キーとする(個人情報保護)。
- 「AI評価項目を後から変更できる」要件のため、12項目をコード固定にせず `evaluation_items` マスタテーブル + `interview_scores` の正規化構造にする。項目の追加・削除・並び替えはマスタ更新のみで対応可能。
- OS率は「OS数 ÷ 提案企業数」の派生値。**保存はせず参照時に計算する**ことを推奨(下記「設計判断」参照)。

```sql
-- CA(担当者)マスタ
create table cas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- 学生マスタ(学生IDのみ。氏名は保持しない)
create table students (
  id uuid primary key default gen_random_uuid(),
  student_code text not null unique, -- 例: STU-2026-0001
  created_at timestamptz not null default now()
);

-- 面談本体
create table interviews (
  id uuid primary key default gen_random_uuid(),
  ca_id uuid not null references cas(id),
  student_id uuid not null references students(id),
  interview_date date not null,
  interview_type text not null,              -- 初回/複数回目/内定者面談 等
  transcript text not null,                  -- 面談文字起こし
  proposed_companies jsonb not null default '[]', -- ["株式会社A", "株式会社B"]
  proposed_company_count int not null default 0,
  os_count int not null default 0,
  has_os boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 評価項目マスタ(12項目を後から追加/変更可能にする)
create table evaluation_items (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,      -- 例: rapport, questioning_skill ...
  label_ja text not null,        -- 例: ラポール形成
  display_order int not null,
  is_active boolean not null default true
);

-- 面談ごとのAI分析結果(項目別以外のメタ情報)
create table interview_analyses (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null unique references interviews(id) on delete cascade,
  ca_talk_ratio numeric,             -- CA発話比率(%)
  student_talk_ratio numeric,        -- 学生発話比率(%)
  question_count int,
  deep_question_count int,
  student_key_values jsonb,          -- string[]
  student_challenges jsonb,          -- string[]
  student_concerns jsonb,            -- string[]
  os_impact_factors jsonb,           -- [{factor, reasoning}] TOP3
  overall_score numeric,             -- 12項目平均(参照値としてキャッシュ)
  raw_response jsonb,                -- AIレスポンス全文(監査/再解析用)
  model text,                        -- 使用モデル名
  analyzed_at timestamptz not null default now()
);

-- 項目別スコア(evaluation_itemsと多対多的に紐づく)
create table interview_scores (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references interviews(id) on delete cascade,
  evaluation_item_id uuid not null references evaluation_items(id),
  score int not null check (score between 1 and 5),
  reason text,
  good_points text,
  improvement_points text,
  unique (interview_id, evaluation_item_id)
);

-- 複数面談のAI比較分析結果(保存して後から見返せるようにする)
create table comparison_analyses (
  id uuid primary key default gen_random_uuid(),
  name text,
  interview_ids jsonb not null,      -- uuid[]
  key_differences jsonb,             -- TOP5
  high_performer_behaviors jsonb,
  low_performer_improvements jsonb,  -- TOP3
  best_practices jsonb,
  next_hypotheses jsonb,
  raw_response jsonb,
  created_at timestamptz not null default now()
);
```

**設計判断(要相談):** 依頼文には登録項目として「OS率」が明示されていますが、OS率はOS数と提案企業数から機械的に算出できる値のため、`interviews`テーブルには保存せず、一覧・集計画面側で `os_count / proposed_company_count` を都度計算する方針にします。理由は、保存すると入力ミスや更新漏れでOS数・提案企業数と矛盾する状態が起こり得るためです。もし「後から手動でOS率だけ補正したい」といった運用がある場合は逆に保存カラムを追加した方が良いので、その場合は教えてください。デフォルトはこの方針で進めます。

---

## 2. 画面構成 (Next.js App Router)

| ルート | 画面名 | 内容 |
|---|---|---|
| `/interviews` | 面談一覧 | 担当者・面談日・OS結果・AI総合/深掘り/提案/クロージングスコアを一覧表示。CA・期間・OS有無で絞込 |
| `/interviews/new` | 面談データ登録 | 必要項目の入力フォーム(文字起こしは貼付) |
| `/interviews/[id]` | 面談詳細・AI分析 | 文字起こし表示、「AI分析実行」ボタン、12項目のスコア/理由/良い点/改善点、発話比率などの抽出情報を表示 |
| `/advisers` | 担当者比較 | CAごとの平均OS率・平均総合スコア・項目別平均・面談件数をカード/テーブルで表示。基準CAを選んで他CAと横並び比較(初期値: 田中さん) |
| `/comparison` | 成果比較 | OSした面談 vs しなかった面談の項目別平均を比較し、差分が大きい項目を強調表示 |
| `/ai-comparison` | AI比較分析 | 面談を複数選択→AIに「高成果 vs 低成果で何が違うか」を分析させ、TOP5差異・高成果者の行動・低成果者改善TOP3・ベストプラクティス・次の検証仮説を表示 |

---

## 3. AI分析 JSONスキーマ

### 3-1. 単一面談分析 (`/api/interviews/[id]/analyze`)

12項目は `src/config/evaluationItems.ts` で一元管理(下記ディレクトリ構成参照)。スキーマの `scores` はこの設定から動的に生成するため、項目を増減してもAPI/DBスキーマ自体は変更不要です。

```json
{
  "scores": {
    "rapport": { "score": 4, "reason": "...", "good_points": "...", "improvement_points": "..." },
    "questioning_skill": { "score": 3, "reason": "...", "good_points": "...", "improvement_points": "..." },
    "deep_diving": { "score": 3, "reason": "...", "good_points": "...", "improvement_points": "..." },
    "values_identification": { "score": 4, "reason": "...", "good_points": "...", "improvement_points": "..." },
    "issue_identification": { "score": 3, "reason": "...", "good_points": "...", "improvement_points": "..." },
    "information_structuring": { "score": 4, "reason": "...", "good_points": "...", "improvement_points": "..." },
    "proposal_match": { "score": 3, "reason": "...", "good_points": "...", "improvement_points": "..." },
    "proposal_reasoning": { "score": 3, "reason": "...", "good_points": "...", "improvement_points": "..." },
    "company_appeal": { "score": 4, "reason": "...", "good_points": "...", "improvement_points": "..." },
    "concern_confirmation": { "score": 2, "reason": "...", "good_points": "...", "improvement_points": "..." },
    "concern_resolution": { "score": 2, "reason": "...", "good_points": "...", "improvement_points": "..." },
    "closing": { "score": 3, "reason": "...", "good_points": "...", "improvement_points": "..." }
  },
  "conversation_metrics": {
    "ca_talk_ratio": 62.5,
    "student_talk_ratio": 37.5,
    "question_count": 18,
    "deep_question_count": 6,
    "proposed_company_count": 3
  },
  "student_insights": {
    "key_values": ["安定性", "成長環境", "人間関係"],
    "job_search_challenges": ["自己PRの言語化が弱い", "業界研究が浅い"],
    "concerns": ["転勤の有無", "給与水準"]
  },
  "os_impact_factors_top3": [
    { "factor": "懸念払拭が弱い", "reasoning": "..." },
    { "factor": "提案理由の説明が抽象的", "reasoning": "..." },
    { "factor": "クロージングで背中を押せていない", "reasoning": "..." }
  ]
}
```

12項目のキー対応表:

| key | 日本語 |
|---|---|
| rapport | ラポール形成 |
| questioning_skill | 質問力 |
| deep_diving | 深掘り力 |
| values_identification | 価値観・意思決定軸の特定 |
| issue_identification | 課題特定力 |
| information_structuring | 情報整理・言語化力 |
| proposal_match | 提案企業マッチ度 |
| proposal_reasoning | 提案理由の説明力 |
| company_appeal | 企業魅力訴求 |
| concern_confirmation | 懸念確認 |
| concern_resolution | 懸念払拭 |
| closing | クロージング |

### 3-2. 複数面談比較分析 (`/api/ai-comparison`)

```json
{
  "key_differences_top5": [
    { "point": "深掘り質問の回数", "detail": "..." }
  ],
  "high_performer_behaviors": ["...", "..."],
  "low_performer_improvements_top3": [
    { "point": "...", "detail": "..." }
  ],
  "best_practices_to_scale": ["...", "..."],
  "next_hypotheses_to_test": ["...", "..."]
}
```

---

## 4. ディレクトリ構成

```
ai-interview-quality/
├── .env.local.example
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── docs/
│   └── DESIGN.md
├── supabase/
│   └── migrations/
│       └── 0001_init.sql
└── src/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx                     -> /interviews へリダイレクト
    │   ├── interviews/
    │   │   ├── page.tsx                 -> 面談一覧
    │   │   ├── new/page.tsx             -> 面談登録フォーム
    │   │   └── [id]/page.tsx            -> 面談詳細・AI分析
    │   ├── advisers/page.tsx            -> 担当者比較
    │   ├── comparison/page.tsx          -> 成果比較(OS有無)
    │   ├── ai-comparison/page.tsx       -> AI比較分析
    │   └── api/
    │       ├── interviews/route.ts
    │       ├── interviews/[id]/analyze/route.ts
    │       └── ai-comparison/route.ts
    ├── components/
    │   ├── interviews/
    │   │   ├── InterviewForm.tsx
    │   │   ├── InterviewTable.tsx
    │   │   └── ScoreCard.tsx
    │   ├── advisers/AdviserComparisonTable.tsx
    │   └── comparison/OutcomeComparisonTable.tsx
    ├── config/
    │   └── evaluationItems.ts           -> 12項目の単一情報源(★変更容易性の要)
    ├── lib/
    │   ├── supabase/{client.ts,server.ts}
    │   ├── openai/{analyzeInterview.ts,compareInterviews.ts}
    │   └── calculations/{osRate.ts,aggregations.ts}
    └── types/
        ├── database.ts
        └── analysis.ts
```

**変更容易性のポイント:** 評価項目は `src/config/evaluationItems.ts` (アプリ側) と `evaluation_items` テーブル(DB側)の2箇所のみが情報源です。項目を追加・削除・文言変更する場合はこの2箇所を更新するだけで、UI・AIプロンプト・DB保存ロジックすべてに反映されます。

---

## 実装ステージ(段階的実装の予定順序)

1. プロジェクト雛形 + DBマイグレーション
2. 機能1: 面談データ登録
3. 機能2: AI面談分析(OpenAI連携)
4. 機能3: 面談一覧画面
5. 機能4: 担当者比較
6. 機能5: 成果比較(OS有無)
7. 機能6: AI比較分析
