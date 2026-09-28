import { NextResponse } from "next/server";
import { getDriveClient, getRootFolderId } from "@/lib/google/driveClient";

export const dynamic = "force-dynamic";

/**
 * 一時的な診断用エンドポイント。
 * 「サービスアカウントが、実際にそのフォルダの中に何を見ているか」を、
 * ファイル名などの中身は一切表示せずに(件数・形式だけ)確認するためのもの。
 * 原因が分かったら、このファイルは削除してOK。
 */
export async function GET() {
  try {
    const drive = getDriveClient();
    const rootId = getRootFolderId();

    const filesRes = await drive.files.list({
      q: `'${rootId}' in parents and trashed = false`,
      fields: "files(id, name, mimeType, createdTime)",
      pageSize: 500,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    const files = filesRes.data.files ?? [];

    return NextResponse.json({
      rootFolderId: rootId,
      totalFound: files.length,
      files: files.map((f) => ({
        mimeType: f.mimeType ?? null,
        isFolder: f.mimeType === "application/vnd.google-apps.folder",
        nameLength: f.name?.length ?? 0,
        createdTime: f.createdTime ?? null,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err.message ?? String(err),
        code: err.code ?? null,
        errors: err.errors ?? null,
      },
      { status: 500 }
    );
  }
}
