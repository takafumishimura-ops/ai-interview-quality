import { getDriveClient, getRootFolderId } from "./driveClient";

export interface DriveTranscriptFile {
  fileId: string;
  caName: string;
  studentName: string;
  interviewDate: string; // YYYY-MM-DD
  transcript: string;
}

export interface SkippedDriveFile {
  name: string;
  reason: string;
}

/**
 * ファイル名から「学生名」と、先頭に日付が含まれていればその日付を取り出す。
 * 対応例:
 *  - "山田太郎.txt"                 -> 学生名: 山田太郎 / 日付: なし
 *  - "20260917_山田太郎.txt"        -> 学生名: 山田太郎 / 日付: 2026-09-17
 *  - "2026-09-17_山田太郎.txt"      -> 学生名: 山田太郎 / 日付: 2026-09-17
 */
function parseFileName(name: string): { studentName: string; dateFromName: string | null } {
  const withoutExt = name.replace(/\.(txt|docx|doc)$/i, "");
  const match = withoutExt.match(/^(\d{4})[-_\/]?(\d{2})[-_\/]?(\d{2})[_\-\s]+(.+)$/);
  if (match) {
    const [, y, mo, d, rest] = match;
    return { studentName: rest.trim(), dateFromName: `${y}-${mo}-${d}` };
  }
  return { studentName: withoutExt.trim(), dateFromName: null };
}

async function extractText(
  drive: ReturnType<typeof getDriveClient>,
  fileId: string,
  mimeType: string
): Promise<string> {
  // Googleドキュメント形式(Nottaがドライブ上に直接ドキュメントとして保存するケース)
  if (mimeType === "application/vnd.google-apps.document") {
    const res = await drive.files.export(
      { fileId, mimeType: "text/plain" },
      { responseType: "text" }
    );
    return (res.data as unknown as string) ?? "";
  }

  // プレーンテキスト(.txt)
  if (mimeType === "text/plain") {
    const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "text" });
    return (res.data as unknown as string) ?? "";
  }

  // Word形式(.docx)
  if (
    mimeType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const res = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );
    const buffer = Buffer.from(res.data as ArrayBuffer);
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer });
    return value ?? "";
  }

  throw new Error(
    "対応していないファイル形式です(.txt / Googleドキュメント / .docx のみ取り込めます)"
  );
}

/**
 * Googleドライブの親フォルダ(GOOGLE_DRIVE_ROOT_FOLDER_ID)直下にある
 * 「CA名のフォルダ」ごとに、その中の面談文字起こしファイルを読み取る。
 *
 * 想定するドライブの構成:
 *   親フォルダ/
 *     田中/            <- フォルダ名 = 担当CA名(システムのCA名と一致させること)
 *       山田太郎.txt    <- ファイル名 = 学生名(先頭に日付があれば面談日として使用)
 *       ...
 *     佐藤/
 *       ...
 */
export async function listTranscriptFilesFromDrive(): Promise<{
  files: DriveTranscriptFile[];
  skippedFiles: SkippedDriveFile[];
}> {
  const drive = getDriveClient();
  const rootId = getRootFolderId();

  const foldersRes = await drive.files.list({
    q: `'${rootId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id, name)",
    pageSize: 200,
  });
  const folders = foldersRes.data.files ?? [];

  const files: DriveTranscriptFile[] = [];
  const skippedFiles: SkippedDriveFile[] = [];

  for (const folder of folders) {
    if (!folder.id || !folder.name) continue;
    const caName = folder.name.trim();

    const filesRes = await drive.files.list({
      q: `'${folder.id}' in parents and trashed = false`,
      fields: "files(id, name, mimeType, createdTime)",
      pageSize: 500,
    });
    const driveFiles = filesRes.data.files ?? [];

    for (const f of driveFiles) {
      if (!f.id || !f.name) continue;
      const label = `${caName}/${f.name}`;
      try {
        const text = await extractText(drive, f.id, f.mimeType ?? "");
        if (!text.trim()) {
          skippedFiles.push({ name: label, reason: "文字起こしの中身が空でした" });
          continue;
        }

        const { studentName, dateFromName } = parseFileName(f.name);
        if (!studentName) {
          skippedFiles.push({ name: label, reason: "ファイル名から学生名を判定できませんでした" });
          continue;
        }
        const interviewDate =
          dateFromName ?? (f.createdTime ? f.createdTime.slice(0, 10) : new Date().toISOString().slice(0, 10));

        files.push({
          fileId: f.id,
          caName,
          studentName,
          interviewDate,
          transcript: text,
        });
      } catch (err: any) {
        skippedFiles.push({ name: label, reason: err.message ?? "読み込みに失敗しました" });
      }
    }
  }

  return { files, skippedFiles };
}
