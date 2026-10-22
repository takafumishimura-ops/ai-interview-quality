import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * 一時的な診断用エンドポイント。
 * Google連携の環境変数が「実際にどう見えているか」を、
 * 秘密の中身を一切表示せずに(存在するか・長さ・形式だけ)確認するためのもの。
 * 原因が分かったら、このファイルは削除してOK。
 */
export async function GET() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const folderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

  return NextResponse.json({
    email: {
      present: !!email,
      length: email?.length ?? 0,
      hasAt: email ? email.includes("@") : false,
      hasGserviceaccount: email ? email.includes("gserviceaccount.com") : false,
    },
    privateKey: {
      present: !!rawKey,
      length: rawKey?.length ?? 0,
      startsWithBegin: rawKey ? rawKey.trimStart().startsWith("-----BEGIN PRIVATE KEY-----") : false,
      containsEnd: rawKey ? rawKey.includes("-----END PRIVATE KEY-----") : false,
      containsLiteralBackslashN: rawKey ? rawKey.includes("\\n") : false,
      containsRealNewline: rawKey ? rawKey.includes("\n") : false,
    },
    folderId: {
      present: !!folderId,
      length: folderId?.length ?? 0,
      value: folderId ?? null,
    },
  });
}
