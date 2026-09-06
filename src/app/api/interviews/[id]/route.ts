import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { InterviewWithRelations } from "@/types/database";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();

  const { data: interview, error } = await supabase
    .from("interviews")
    .select(
      `*,
      ca:cas(*),
      student:students(*),
      analysis:interview_analyses(*),
      scores:interview_scores(*, evaluation_item:evaluation_items(*))`
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!interview) {
    return NextResponse.json({ error: "面談が見つかりません" }, { status: 404 });
  }

  const normalized = {
    ...interview,
    analysis: Array.isArray((interview as any).analysis)
      ? (interview as any).analysis[0] ?? null
      : (interview as any).analysis,
  } as InterviewWithRelations;

  return NextResponse.json({ interview: normalized });
}
