import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { findOrCreateCa, findOrCreateStudent } from "@/lib/data/caStudent";
import {
  dedupeCandidates,
  listDriveCandidates,
  readTranscript,
} from "@/lib/google/importTranscripts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_INTERVIEW_TYPE = "初回面談";
/** Nottaが担当CAごとに保存先を振り分けられないため、取り込み時点では
 * 担当CAが分からない。ひとまずこの名前で登録し、取り込み後に
 * 面談詳細ページで正しいCA名に手入力で修正してもらう。 */
const UNASSIGNED_CA_NAME = "未設定";

/** 1回の呼び出しで使ってよい時間(ミリ秒)。上限60秒に余裕を持たせる */
const TIME_BUDGET_MS = 40_000;
/** 同時に読み取るファイル数 */
const CONCURRENCY = 4;

/**
 * 件数が多いと60秒以内に終わらないため、1回の呼び出しでは時間内に処理できた分だけ
 * 取り込み、残りの件数(remaining)を返す。画面側のボタンが remaining が0になるまで
 * 繰り返し呼び出す。
 */
export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const supabase = createServerSupabaseClient();

  let skipIds = new Set<string>();
  try {
    const body = await req.json();
    if (Array.isArray(body?.skipIds)) {
      skipIds = new Set(body.skipIds.filter((x: unknown) => typeof x === "string"));
    }
  } catch {
    // ボディなしでも動く
  }

  try {
    const { data: existingRows, error: existingError } = await supabase
      .from("interviews")
      .select("drive_file_id")
      .not("drive_file_id", "is", null);
    if (existingError) throw existingError;
    const alreadyImported = new Set(
      (existingRows ?? []).map((r: any) => r.drive_file_id as string)
    );

    const all = await listDriveCandidates();
    const { unique, duplicatesIgnored } = dedupeCandidates(all);

    const skippedAlreadyImported = unique.filter((c) =>
      alreadyImported.has(c.fileId)
    ).length;
    const pending = unique.filter(
      (c) => !alreadyImported.has(c.fileId) && !skipIds.has(c.fileId)
    );

    const ca = await findOrCreateCa(supabase, UNASSIGNED_CA_NAME);

    let imported = 0;
    let processed = 0;
    const errors: string[] = [];
    const failedIds: string[] = [];

    for (let i = 0; i < pending.length; i += CONCURRENCY) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) break;
      const chunk = pending.slice(i, i + CONCURRENCY);

      const results = await Promise.all(
        chunk.map(async (c) => {
          try {
            const f = await readTranscript(c);
            return { c, f, error: null as string | null };
          } catch (err: any) {
            return { c, f: null, error: err.message ?? "読み込みに失敗しました" };
          }
        })
      );

      // 学生の登録・面談の登録は、重複を避けるため1件ずつ順番に行う
      for (const r of results) {
        processed++;
        if (!r.f) {
          errors.push(`${r.c.name}: ${r.error}`);
          failedIds.push(r.c.fileId);
          continue;
        }
        try {
          const student = await findOrCreateStudent(supabase, r.f.studentName);
          const { error } = await supabase.from("interviews").insert({
            ca_id: ca.id,
            student_id: student.id,
            interview_date: r.f.interviewDate,
            interview_type: DEFAULT_INTERVIEW_TYPE,
            transcript: r.f.transcript,
            drive_file_id: r.f.fileId,
          });
          if (error) throw error;
          imported++;
        } catch (err: any) {
          errors.push(`${r.f.studentName}: ${err.message ?? "登録に失敗しました"}`);
          failedIds.push(r.c.fileId);
        }
      }
    }

    return NextResponse.json({
      imported,
      skippedAlreadyImported,
      duplicatesIgnored,
      remaining: Math.max(pending.length - processed, 0),
      errors,
      failedIds,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "Googleドライブからの取り込みに失敗しました" },
      { status: 500 }
    );
  }
}
