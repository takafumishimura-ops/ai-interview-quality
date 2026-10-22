import { NextResponse } from "next/server";
import { getDriveClient } from "@/lib/google/driveClient";

export const dynamic = "force-dynamic";

/**
 * 一時的な診断用エンドポイント。原因が分かったら削除してOK。
 * アプリが実際にどのGoogleアカウントとして認識されているかを確認する。
 * (メールアドレスは秘密情報ではありません。秘密鍵は表示しません)
 */
export async function GET() {
  const envEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? null;
  const expected =
    "interview-drive-importer-684@business-os-508702.iam.gserviceaccount.com";

  try {
    const drive = getDriveClient();
    const res = await drive.about.get({
      fields: "user(emailAddress,displayName,permissionId)",
    });
    const driveEmail = res.data.user?.emailAddress ?? null;

    return NextResponse.json({
      envEmail,
      envEmailIsExpected684: envEmail === expected,
      driveSeesEmail: driveEmail,
      driveEmailIsExpected684: driveEmail === expected,
      driveUser: res.data.user,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        envEmail,
        envEmailIsExpected684: envEmail === expected,
        error: err.message ?? String(err),
        code: err.code ?? null,
      },
      { status: 500 }
    );
  }
}
