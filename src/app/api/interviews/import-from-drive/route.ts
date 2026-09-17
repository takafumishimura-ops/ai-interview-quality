import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { findOrCreateCa, findOrCreateStudent } from "@/lib/data/caStudent";
import { listTranscriptFilesFromDrive } from "@/lib/google/importTranscripts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_INTERVIEW_TYPE = "初回面談";

export async function POST() {
  const supabase = createServerSupabaseClient();

  try {
    const { data: existingRows, error: existingError } = await supabase
      .from("interviews")
      .select("drive_file_id")
      .not("drive_file_id", "is", null);
    if (existingError) throw existingError;
    const alreadyImported = new Set(
      (existingRows ?? []).map((r: any) => r.drive_file_id as string)
    );

    const { files, skippedFiles } = await listTranscriptFilesFromDrive();

    let imported = 0;
    let skippedAlreadyImported = 0;
    const errors: string[] = skippedFiles.map((s) => `${s.name}: ${s.reason}`);

    for (const f of files) {
      if (alreadyImported.has(f.fileId)) {
        skippedAlreadyImported++;
        continue;
      }

      try {
        const ca = await findOrCreateCa(supabase, f.caName);
        const student = await findOrCreateStudent(supabase, f.studentName);

        const { error } = await supabase.from("interviews").insert({
          ca_id: ca.id,
          student_id: student.id,
          interview_date: f.interviewDate,
          interview_type: DEFAULT_INTERVIEW_TYPE,
          transcript: f.transcript,
          drive_file_id: f.fileId,
        });
        if (error) throw error;

        imported++;
      } catch (err: any) {
        errors.push(`${f.caName}/${f.studentName}: ${err.message ?? "登録に失敗しました"}`);
      }
    }

    return NextResponse.json({ imported, skippedAlreadyImported, errors });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Googleドライブからの取り込みに失敗しました" },
      { status: 500 }
    );
  }
}
