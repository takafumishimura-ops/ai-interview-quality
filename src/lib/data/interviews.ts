import { createServerSupabaseClient } from "@/lib/supabase/server";
import { InterviewWithRelations } from "@/types/database";
import { InterviewForAggregation } from "@/lib/calculations/aggregations";
import { EvaluationItemKey } from "@/config/evaluationItems";

const SELECT_WITH_RELATIONS = `*,
  ca:cas(*),
  student:students(*),
  analysis:interview_analyses(*),
  scores:interview_scores(*, evaluation_item:evaluation_items(*))`;

function normalize(row: any): InterviewWithRelations {
  return {
    ...row,
    analysis: Array.isArray(row.analysis) ? row.analysis[0] ?? null : row.analysis,
  } as InterviewWithRelations;
}

/** Server Component から直接呼び出す一覧取得(API Routeを経由しない) */
export async function getInterviewsWithRelations(): Promise<InterviewWithRelations[]> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("interviews")
    .select(SELECT_WITH_RELATIONS)
    .order("interview_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalize);
}

export async function getInterviewWithRelations(
  id: string
): Promise<InterviewWithRelations | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("interviews")
    .select(SELECT_WITH_RELATIONS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? normalize(data) : null;
}

/** 担当者比較・成果比較の集計処理に渡す形式へ変換 */
export function toAggregationInput(
  interviews: InterviewWithRelations[]
): InterviewForAggregation[] {
  return interviews.map((it) => {
    const itemScores: Partial<Record<EvaluationItemKey, number>> = {};
    for (const s of it.scores ?? []) {
      const key = s.evaluation_item?.key as EvaluationItemKey | undefined;
      if (key) itemScores[key] = s.score;
    }
    return {
      id: it.id,
      caId: it.ca_id,
      caName: it.ca?.name ?? "不明",
      osCount: it.os_count,
      proposedCompanyCount: it.proposed_company_count,
      hasOs: it.has_os,
      overallScore: it.analysis?.overall_score ?? null,
      itemScores,
    };
  });
}
