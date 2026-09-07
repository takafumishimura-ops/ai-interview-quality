/**
 * Supabaseテーブルに対応する手書きの型定義(MVP用の簡易版)。
 * 本格運用時は `supabase gen types typescript` で自動生成した型に置き換えてよい。
 */

export interface CaRow {
  id: string;
  name: string;
  created_at: string;
}

export interface StudentRow {
  id: string;
  name: string;
  created_at: string;
}

export interface InterviewRow {
  id: string;
  ca_id: string;
  student_id: string;
  interview_date: string;
  interview_type: string;
  transcript: string;
  proposed_companies: string[];
  proposed_company_count: number;
  os_count: number;
  has_os: boolean;
  created_at: string;
  updated_at: string;
}

export interface EvaluationItemRow {
  id: string;
  key: string;
  label_ja: string;
  display_order: number;
  is_active: boolean;
}

export interface InterviewAnalysisRow {
  id: string;
  interview_id: string;
  ca_talk_ratio: number | null;
  student_talk_ratio: number | null;
  question_count: number | null;
  deep_question_count: number | null;
  student_key_values: string[] | null;
  student_challenges: string[] | null;
  student_concerns: string[] | null;
  os_impact_factors: { factor: string; reasoning: string }[] | null;
  overall_score: number | null;
  raw_response: unknown;
  model: string | null;
  analyzed_at: string;
}

export interface InterviewScoreRow {
  id: string;
  interview_id: string;
  evaluation_item_id: string;
  score: number;
  reason: string | null;
  good_points: string | null;
  improvement_points: string | null;
}

export interface ComparisonAnalysisRow {
  id: string;
  name: string | null;
  interview_ids: string[];
  key_differences: { point: string; detail: string }[] | null;
  high_performer_behaviors: string[] | null;
  low_performer_improvements: { point: string; detail: string }[] | null;
  best_practices: string[] | null;
  next_hypotheses: string[] | null;
  raw_response: unknown;
  created_at: string;
}

/** 一覧・詳細画面で使う結合ビュー用の型 */
export interface InterviewWithRelations extends InterviewRow {
  ca: CaRow;
  student: StudentRow;
  analysis: InterviewAnalysisRow | null;
  scores: (InterviewScoreRow & { evaluation_item: EvaluationItemRow })[];
}
