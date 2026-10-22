import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { InterviewWithRelations } from "@/types/database";
import { findOrCreateCa, findOrCreateStudent } from "@/lib/data/caStudent";

export const dynamic = "force-dynamic";

interface UpdateInterviewBody {
  caName?: string;
  studentName?: string;
  interviewDate?: string;
  interviewType?: string;
}

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();

  let body: UpdateInterviewBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }

  try {
    const update: Record<string, unknown> = {};

    if (body.caName !== undefined) {
      if (!body.caName.trim()) {
        return NextResponse.json({ error: "担当CA名を入力してください" }, { status: 400 });
      }
      const ca = await findOrCreateCa(supabase, body.caName);
      update.ca_id = ca.id;
    }
    if (body.studentName !== undefined) {
      if (!body.studentName.trim()) {
        return NextResponse.json({ error: "学生名を入力してください" }, { status: 400 });
      }
      const student = await findOrCreateStudent(supabase, body.studentName);
      update.student_id = student.id;
    }
    if (body.interviewDate !== undefined) {
      update.interview_date = body.interviewDate;
    }
    if (body.interviewType !== undefined) {
      update.interview_type = body.interviewType;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "更新する項目がありません" }, { status: 400 });
    }

    const { data: interview, error } = await supabase
      .from("interviews")
      .update(update)
      .eq("id", params.id)
      .select("*")
      .single();
    if (error) throw error;

    return NextResponse.json({ interview });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "更新に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient();

  // interview_analyses / interview_scores は on delete cascade で連動削除される
  const { error } = await supabase.from("interviews").delete().eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
