import { NextResponse } from "next/server";
import { getDriveClient, getRootFolderId } from "@/lib/google/driveClient";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 一時的な診断用エンドポイント。原因が分かったら削除してOK。
 * 取り込みと同じ検索を再現して、件数・ファイルの種類・読み取り可否だけを返す。
 * (ファイル名や本文は表示しません)
 */
export async function GET() {
  const drive = getDriveClient();
  const rootId = getRootFolderId();

  async function search(withFlags: boolean) {
    try {
      const res = await drive.files.list({
        q: `'${rootId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
        fields: "files(id, mimeType)",
        pageSize: 500,
        ...(withFlags
          ? { supportsAllDrives: true, includeItemsFromAllDrives: true }
          : {}),
      });
      const files = res.data.files ?? [];
      const mimeTypes: Record<string, number> = {};
      for (const f of files) {
        const m = f.mimeType ?? "unknown";
        mimeTypes[m] = (mimeTypes[m] ?? 0) + 1;
      }
      return { ok: true, count: files.length, mimeTypes, files };
    } catch (err: any) {
      return {
        ok: false,
        error: err.message ?? String(err),
        count: 0,
        mimeTypes: {} as Record<string, number>,
        files: [] as { id?: string | null; mimeType?: string | null }[],
      };
    }
  }

  async function tryExtract(id: string, mimeType: string) {
    try {
      if (mimeType === "application/vnd.google-apps.document") {
        const res = await drive.files.export(
          { fileId: id, mimeType: "text/plain" },
          { responseType: "text" }
        );
        return { mimeType, ok: true, textLength: String(res.data ?? "").length };
      }
      if (mimeType === "text/plain") {
        const res = await drive.files.get(
          { fileId: id, alt: "media", supportsAllDrives: true },
          { responseType: "text" }
        );
        return { mimeType, ok: true, textLength: String(res.data ?? "").length };
      }
      if (
        mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        const res = await drive.files.get(
          { fileId: id, alt: "media", supportsAllDrives: true },
          { responseType: "arraybuffer" }
        );
        const buffer = Buffer.from(res.data as ArrayBuffer);
        const mammoth = await import("mammoth");
        const { value } = await mammoth.extractRawText({ buffer });
        return { mimeType, ok: true, textLength: (value ?? "").length };
      }
      return { mimeType, ok: false, error: "unsupported mimeType" };
    } catch (err: any) {
      return { mimeType, ok: false, error: err.message ?? String(err) };
    }
  }

  const exact = await search(false);
  const flagged = await search(true);

  // 種類ごとに1件ずつ、実際に読み取れるか試す
  const seen = new Set<string>();
  const samples: { id: string; mimeType: string }[] = [];
  for (const f of flagged.files) {
    const m = f.mimeType ?? "unknown";
    if (f.id && !seen.has(m)) {
      seen.add(m);
      samples.push({ id: f.id, mimeType: m });
    }
  }
  const sampleResults = [];
  for (const s of samples.slice(0, 4)) {
    sampleResults.push(await tryExtract(s.id, s.mimeType));
  }

  return NextResponse.json({
    exactQuery: {
      ok: exact.ok,
      count: exact.count,
      mimeTypes: exact.mimeTypes,
      error: "error" in exact ? exact.error : undefined,
    },
    withSharedDriveFlags: {
      ok: flagged.ok,
      count: flagged.count,
      mimeTypes: flagged.mimeTypes,
      error: "error" in flagged ? flagged.error : undefined,
    },
    sampleResults,
  });
}
