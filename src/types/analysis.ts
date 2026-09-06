import { EvaluationItemKey } from "@/config/evaluationItems";

export interface ItemScoreResult {
  score: 1 | 2 | 3 | 4 | 5;
  reason: string;
  good_points: string;
  improvement_points: string;
}

export type ScoresByItem = Record<EvaluationItemKey, ItemScoreResult>;

export interface ConversationMetrics {
  ca_talk_ratio: number;
  student_talk_ratio: number;
  question_count: number;
  deep_question_count: number;
  proposed_company_count: number;
}

export interface StudentInsights {
  key_values: string[];
  job_search_challenges: string[];
  concerns: string[];
}

export interface OsImpactFactor {
  factor: string;
  reasoning: string;
}

/** 単一面談分析 (POST /api/interviews/[id]/analyze) のAIレスポンス構造 */
export interface InterviewAnalysisResult {
  scores: ScoresByItem;
  conversation_metrics: ConversationMetrics;
  student_insights: StudentInsights;
  os_impact_factors_top3: OsImpactFactor[];
}

export interface ComparisonDifference {
  point: string;
  detail: string;
}

/** 複数面談比較分析 (POST /api/ai-comparison) のAIレスポンス構造 */
export interface ComparisonAnalysisResult {
  key_differences_top5: ComparisonDifference[];
  high_performer_behaviors: string[];
  low_performer_improvements_top3: ComparisonDifference[];
  best_practices_to_scale: string[];
  next_hypotheses_to_test: string[];
}
