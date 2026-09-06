-- AI面談品質分析システム: 初期スキーマ
-- Supabase SQL Editor もしくは `supabase db push` で実行してください。

create extension if not exists "pgcrypto";

-- CA(担当者)マスタ
create table if not exists cas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- 学生マスタ(氏名は保持せず学生IDのみ)
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  student_code text not null unique,
  created_at timestamptz not null default now()
);

-- 面談本体
create table if not exists interviews (
  id uuid primary key default gen_random_uuid(),
  ca_id uuid not null references cas(id),
  student_id uuid not null references students(id),
  interview_date date not null,
  interview_type text not null,
  transcript text not null,
  proposed_companies jsonb not null default '[]'::jsonb,
  proposed_company_count int not null default 0,
  os_count int not null default 0,
  has_os boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_interviews_ca_id on interviews(ca_id);
create index if not exists idx_interviews_interview_date on interviews(interview_date);

-- 評価項目マスタ(後から追加・変更・並び替え可能)
create table if not exists evaluation_items (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label_ja text not null,
  display_order int not null,
  is_active boolean not null default true
);

-- 面談ごとのAI分析結果(項目別スコア以外)
create table if not exists interview_analyses (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null unique references interviews(id) on delete cascade,
  ca_talk_ratio numeric,
  student_talk_ratio numeric,
  question_count int,
  deep_question_count int,
  student_key_values jsonb,
  student_challenges jsonb,
  student_concerns jsonb,
  os_impact_factors jsonb,
  overall_score numeric,
  raw_response jsonb,
  model text,
  analyzed_at timestamptz not null default now()
);

-- 項目別スコア
create table if not exists interview_scores (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid not null references interviews(id) on delete cascade,
  evaluation_item_id uuid not null references evaluation_items(id),
  score int not null check (score between 1 and 5),
  reason text,
  good_points text,
  improvement_points text,
  unique (interview_id, evaluation_item_id)
);

create index if not exists idx_interview_scores_interview_id on interview_scores(interview_id);

-- 複数面談のAI比較分析結果
create table if not exists comparison_analyses (
  id uuid primary key default gen_random_uuid(),
  name text,
  interview_ids jsonb not null,
  key_differences jsonb,
  high_performer_behaviors jsonb,
  low_performer_improvements jsonb,
  best_practices jsonb,
  next_hypotheses jsonb,
  raw_response jsonb,
  created_at timestamptz not null default now()
);

-- 評価項目マスタの初期データ(src/config/evaluationItems.ts と対応させること)
insert into evaluation_items (key, label_ja, display_order) values
  ('rapport', 'ラポール形成', 1),
  ('questioning_skill', '質問力', 2),
  ('deep_diving', '深掘り力', 3),
  ('values_identification', '価値観・意思決定軸の特定', 4),
  ('issue_identification', '課題特定力', 5),
  ('information_structuring', '情報整理・言語化力', 6),
  ('proposal_match', '提案企業マッチ度', 7),
  ('proposal_reasoning', '提案理由の説明力', 8),
  ('company_appeal', '企業魅力訴求', 9),
  ('concern_confirmation', '懸念確認', 10),
  ('concern_resolution', '懸念払拭', 11),
  ('closing', 'クロージング', 12)
on conflict (key) do nothing;

-- MVPにつきRLSは無効(ローカル/社内限定運用を想定)。
-- 本番運用時は auth 導入のうえ RLS ポリシーを追加すること。
alter table cas disable row level security;
alter table students disable row level security;
alter table interviews disable row level security;
alter table evaluation_items disable row level security;
alter table interview_analyses disable row level security;
alter table interview_scores disable row level security;
alter table comparison_analyses disable row level security;
