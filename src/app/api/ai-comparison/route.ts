import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { compareInterviews, ComparisonTargetInterview } from "@/lib/openai/compareInterviews";

export const dynamic = "force-dynamic";

interface CompareBody {
  interviewIds: string[];
  name?: string;
}

const TRANSCRIPT_EXCERPT_LENGTH = 6000;

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();

  let body: CompareBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }

  if (!body.interviewIds || body.interviewIds.length < 2) {
    return NextResponse.json(
      { error: "比較分析には2件以上の面談を選択してください" },
      { status: 400 }
    );
  }

  try {
    const { data: interviews, error } = await supabase
      .from("interviews")
      .select(`*, ca:cas(*), analysis:interview_analyses(*)`)
      .in("id", body.interviewIds);
    if (error) throw error;
    if (!interviews || interviews.length < 2) {
      return NextResponse.json({ error: "指定された面談が見つかりません" }, { status: 404 });
    }

    const targets: ComparisonTargetInterview[] = interviews.map((row: any) => {
      const analysis = Array.isArray(row.analysis) ? row.analysis[0] : row.analysis;
      return {
        interviewId: row.id,
        caName: row.ca?.name ?? "不明",
        hasOs: row.has_os,
        overallScore: analysis?.overall_score ?? null,
        transcriptExcerpt: (row.transcript as string).slice(0, TRANSCRIPT_EXCERPT_LENGTH),
      };
    });

    const { result, rawResponse, model } = await compareInterviews(targets);

    const { data: saved, error: saveError } = await supabase
      .from("comparison_analyses")
      .insert({
        name: body.name ?? null,
        interview_ids: body.interviewIds,
        key_differences: result.key_differences_top5,
        high_performer_behaviors: result.high_performer_behaviors,
        low_performer_improvements: result.low_performer_improvements_top3,
        best_practices: result.best_practices_to_scale,
        next_hypotheses: result.next_hypotheses_to_test,
        raw_response: rawResponse,
      })
      .select("*")
      .single();
    if (saveError) throw saveError;

    return NextResponse.json({ result, model, comparisonId: saved.id });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "比較分析に失敗しました" },
      { status: 500 }
    );
  }
}
