import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { analyzeInterview } from "@/lib/openai/analyzeInterview";
import { EVALUATION_ITEM_KEYS } from "@/config/evaluationItems";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();

  const { data: interview, error: fetchError } = await supabase
    .from("interviews")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!interview) {
    return NextResponse.json({ error: "面談が見つかりません" }, { status: 404 });
  }

  try {
    const { result, rawResponse, model } = await analyzeInterview({
      transcript: interview.transcript,
      interviewType: interview.interview_type,
      proposedCompanies: interview.proposed_companies ?? [],
    });

    const { data: evaluationItems, error: itemsError } = await supabase
      .from("evaluation_items")
      .select("*")
      .eq("is_active", true);
    if (itemsError) throw itemsError;

    const itemByKey = new Map(evaluationItems.map((i: any) => [i.key, i]));

    const scoreValues = EVALUATION_ITEM_KEYS.map((key) => result.scores[key]?.score).filter(
      (v): v is 1 | 2 | 3 | 4 | 5 => typeof v === "number"
    );
    const overallScore =
      scoreValues.length > 0
        ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length
        : null;

    // interview_analyses を upsert(再分析にも対応)
    const { error: analysisError } = await supabase
      .from("interview_analyses")
      .upsert(
        {
          interview_id: interview.id,
          ca_talk_ratio: result.conversation_metrics.ca_talk_ratio,
          student_talk_ratio: result.conversation_metrics.student_talk_ratio,
          question_count: result.conversation_metrics.question_count,
          deep_question_count: result.conversation_metrics.deep_question_count,
          student_key_values: result.student_insights.key_values,
          student_challenges: result.student_insights.job_search_challenges,
          student_concerns: result.student_insights.concerns,
          os_impact_factors: result.os_impact_factors_top3,
          next_action_suggestions: result.next_action_suggestions ?? [],
          overall_score: overallScore,
          raw_response: rawResponse,
          model,
          analyzed_at: new Date().toISOString(),
        },
        { onConflict: "interview_id" }
      );
    if (analysisError) throw analysisError;

    // interview_scores を項目ごとにupsert
    for (const key of EVALUATION_ITEM_KEYS) {
      const item = itemByKey.get(key);
      const scoreResult = result.scores[key];
      if (!item || !scoreResult) continue;

      const { error: scoreError } = await supabase.from("interview_scores").upsert(
        {
          interview_id: interview.id,
          evaluation_item_id: item.id,
          score: scoreResult.score,
          reason: scoreResult.reason,
          good_points: scoreResult.good_points,
          improvement_points: scoreResult.improvement_points,
        },
        { onConflict: "interview_id,evaluation_item_id" }
      );
      if (scoreError) throw scoreError;
    }

    return NextResponse.json({ result, overallScore });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "AI分析に失敗しました" },
      { status: 500 }
    );
  }
}
