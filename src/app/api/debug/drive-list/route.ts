import { NextResponse } from "next/server";
import { getDriveClient, getRootFolderId } from "@/lib/google/driveClient";

export const dynamic = "force-dynamic";

/**
 * 一時的な診断用エンドポイント。原因が分かったら削除してOK。
 */
export async function GET() {
  const drive = getDriveClient();
  const rootId = getRootFolderId();

  // ① フォルダそのものにアクセスできるか
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

  // ② フォルダの中身を一覧できるか
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

  // ③ フォルダIDを指定せず、サービスアカウントから見えているフォルダを全部出す
  let visibleFolders: unknown;
  try {
    const foldersRes = await drive.files.list({
      q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      fields: "files(id, name)",
      pageSize: 50,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    visibleFolders = {
      ok: true,
      count: foldersRes.data.files?.length ?? 0,
      folders: (foldersRes.data.files ?? []).map((f) => ({
        id: f.id,
        name: f.name,
        matchesRootId: f.id === rootId,
      })),
    };
  } catch (err: any) {
    visibleFolders = {
      ok: false,
      error: err.message ?? String(err),
      code: err.code ?? null,
    };
  }

  return NextResponse.json({
    rootFolderId: rootId,
    rootFolderIdLength: rootId.length,
    folderAccess,
    listing,
    visibleFolders,
  });
}
