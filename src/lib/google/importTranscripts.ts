import { getDriveClient, getRootFolderId } from "./driveClient";

const GOOGLE_DOC_MIME = "application/vnd.google-apps.document";
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export interface DriveCandidate {
  fileId: string;
  name: string;
  mimeType: string;
  createdTime: string | null;
}

export interface DriveTranscriptFile {
  fileId: string;
  studentName: string;
  interviewDate: string; // YYYY-MM-DD
  transcript: string;
}

type DriveClient = ReturnType<typeof getDriveClient>;

/**
 * ファイル名から「学生名」と「面談日」を読み取る。
 *
 * Nottaの実際のファイル名の例:
 *  - "井原奏さん：就活の名人(tiktok) - 2026-09-18 10:55:33"
 *  - "宮川 環さん：就活の名人(横山) - 2026-09-28 17:36:26.docx"
 *  - "高橋大翔さん: 就活の名人エージェント(0101) - 2026-09-28 17:39:07"
 * -> 「さん」より前を学生名(空白は除く)、名前の中の YYYY-MM-DD を面談日とする。
 *
 * 従来の形式にも対応:
 *  - "20260917_山田太郎.txt" / "山田太郎.txt"
 */
export function parseFileName(name: string): {
  studentName: string;
  dateFromName: string | null;
} {
  const base = name.replace(/\.(txt|docx|doc)$/i, "").trim();

  const dateInName = base.match(/(\d{4})-(\d{2})-(\d{2})/);
  const dateFromName = dateInName
    ? `${dateInName[1]}-${dateInName[2]}-${dateInName[3]}`
    : null;

  // 「○○さん：」「○○さん:」の形
  const san = base.match(/^(.+?)さん\s*[：:]/);
  if (san) {
    return { studentName: san[1].replace(/[\s　]+/g, ""), dateFromName };
  }

  // 従来形式: 先頭に日付がある
  const lead = base.match(/^(\d{4})[-_\/]?(\d{2})[-_\/]?(\d{2})[_\-\s]+(.+)$/);
  if (lead) {
    return {
      studentName: lead[4].trim(),
      dateFromName: `${lead[1]}-${lead[2]}-${lead[3]}`,
    };
  }

  return { studentName: base, dateFromName };
}

/**
 * Nottaは同じ面談を「Googleドキュメント」と「.docx」の2つで(1秒ずれた時刻で)
 * 保存するため、そのまま取り込むと二重になる。
 * 名前から拡張子と「秒」を除いたものが同じなら同じ面談とみなし、
 * Googleドキュメントを優先して1件だけ残す。
 */
function dedupeKey(name: string): string {
  const base = name.replace(/\.(txt|docx|doc)$/i, "").trim();
  return base.replace(/(\d{1,2}:\d{2}):\d{2}\s*$/, "$1");
}

export function dedupeCandidates(candidates: DriveCandidate[]): {
  unique: DriveCandidate[];
  duplicatesIgnored: number;
} {
  const byKey = new Map<string, DriveCandidate>();
  for (const c of candidates) {
    const key = dedupeKey(c.name);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, c);
    } else if (existing.mimeType !== GOOGLE_DOC_MIME && c.mimeType === GOOGLE_DOC_MIME) {
      byKey.set(key, c);
    }
  }
  const unique = Array.from(byKey.values());
  return { unique, duplicatesIgnored: candidates.length - unique.length };
}

async function extractText(
  drive: DriveClient,
  fileId: string,
  mimeType: string
): Promise<string> {
  if (mimeType === GOOGLE_DOC_MIME) {
    const res = await drive.files.export(
      { fileId, mimeType: "text/plain" },
      { responseType: "text" }
    );
    return (res.data as unknown as string) ?? "";
  }

  if (mimeType === "text/plain") {
    const res = await drive.files.get(
      { fileId, alt: "media", supportsAllDrives: true },
      { responseType: "text" }
    );
    return (res.data as unknown as string) ?? "";
  }

  if (mimeType === DOCX_MIME) {
    const res = await drive.files.get(
      { fileId, alt: "media", supportsAllDrives: true },
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
 * 親フォルダ(GOOGLE_DRIVE_ROOT_FOLDER_ID)直下のファイル一覧(中身はまだ読まない)。
 * 件数が多くても短時間で返せるように、一覧の取得と本文の読み取りを分けている。
 */
export async function listDriveCandidates(): Promise<DriveCandidate[]> {
  const drive = getDriveClient();
  const rootId = getRootFolderId();

  const candidates: DriveCandidate[] = [];
  let pageToken: string | undefined;
  do {
    const res = await drive.files.list({
      q: `'${rootId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
      fields: "nextPageToken, files(id, name, mimeType, createdTime)",
      pageSize: 200,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    for (const f of res.data.files ?? []) {
      if (!f.id || !f.name) continue;
      candidates.push({
        fileId: f.id,
        name: f.name,
        mimeType: f.mimeType ?? "",
        createdTime: f.createdTime ?? null,
      });
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return candidates;
}

/** 1ファイルの本文を読み取り、取り込み用のデータにする。失敗時は理由つきでthrowする。 */
export async function readTranscript(
  candidate: DriveCandidate
): Promise<DriveTranscriptFile> {
  const drive = getDriveClient();
  const text = await extractText(drive, candidate.fileId, candidate.mimeType);
  if (!text.trim()) {
    throw new Error("文字起こしの中身が空でした");
  }

  const { studentName, dateFromName } = parseFileName(candidate.name);
  if (!studentName) {
    throw new Error("ファイル名から学生名を判定できませんでした");
  }

  const interviewDate =
    dateFromName ??
    (candidate.createdTime
      ? candidate.createdTime.slice(0, 10)
      : new Date().toISOString().slice(0, 10));

  return {
    fileId: candidate.fileId,
    studentName,
    interviewDate,
    transcript: text,
  };
}
