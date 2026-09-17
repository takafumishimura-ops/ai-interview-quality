import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { InterviewWithRelations } from "@/types/database";
import { findOrCreateCa, findOrCreateStudent } from "@/lib/data/caStudent";

export const dynamic = "force-dynamic";

interface CreateInterviewBody {
  caName: string;
  studentName: string;
  interviewDate: string; // YYYY-MM-DD
  interviewType: string;
  transcript: string;
}

export async function GET() {
  const supabase = createServerSupabaseClient();

  const { data: interviews, error } = await supabase
    .from("interviews")
    .select(
      `*,
      ca:cas(*),
      student:students(*),
      analysis:interview_analyses(*),
      scores:interview_scores(*, evaluation_item:evaluation_items(*))`
    )
    .order("interview_date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Supabaseは1:1リレーションでも配列で返すことがあるため正規化する
  const normalized = (interviews ?? []).map((row: any) => ({
    ...row,
    analysis: Array.isArray(row.analysis) ? row.analysis[0] ?? null : row.analysis,
  })) as InterviewWithRelations[];

  return NextResponse.json({ interviews: normalized });
}

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();

  let body: CreateInterviewBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストボディが不正です" }, { status: 400 });
  }

  if (!body.caName?.trim() || !body.studentName?.trim() || !body.transcript?.trim()) {
    return NextResponse.json(
      { error: "担当CA名・学生名・面談文字起こしは必須です" },
      { status: 400 }
    );
  }

  try {
    const ca = await findOrCreateCa(supabase, body.caName);
    const student = await findOrCreateStudent(supabase, body.studentName);

    const { data: interview, error } = await supabase
      .from("interviews")
      .insert({
        ca_id: ca.id,
        student_id: student.id,
        interview_date: body.interviewDate,
        interview_type: body.interviewType,
        transcript: body.transcript,
      })
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ interview }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "登録に失敗しました" },
      { status: 500 }
    );
  }
}
