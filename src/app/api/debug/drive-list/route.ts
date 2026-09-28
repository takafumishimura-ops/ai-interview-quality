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
  const drive = getDriveClient();
  const rootId = getRootFolderId();

  // ① フォルダそのものに、サービスアカウントがアクセスできているか
  let folderAccess: unknown;
  try {
    const folderRes = await drive.files.get({
      fileId: rootId,
      fields: "id, name, mimeType, driveId, ownedByMe, shared",
      supportsAllDrives: true,
    });
    folderAccess = { ok: true, data: folderRes.data };
  } catch (err: any) {
    folderAccess = {
      ok: false,
      error: err.message ?? String(err),
      code: err.code ?? null,
    };
  }

  // ② そのフォルダの「中身」を一覧できるか
  let listing: unknown;
  try {
    const filesRes = await drive.files.list({
      q: `'${rootId}' in parents and trashed = false`,
      fields: "files(id, name, mimeType, createdTime)",
      pageSize: 500,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    const files = filesRes.data.files ?? [];
    listing = {
      ok: true,
      totalFound: files.length,
      files: files.map((f) => ({
        mimeType: f.mimeType ?? null,
        isFolder: f.mimeType === "application/vnd.google-apps.folder",
        nameLength: f.name?.length ?? 0,
        createdTime: f.createdTime ?? null,
      })),
    };
  } catch (err: any) {
    listing = {
      ok: false,
      error: err.message ?? String(err),
      code: err.code ?? null,
    };
  }

  return NextResponse.json({ rootFolderId: rootId, folderAccess, listing });
}
