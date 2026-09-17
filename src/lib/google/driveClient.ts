import { google } from "googleapis";

/**
 * Googleサービスアカウントを使ってGoogle Drive APIクライアントを作る。
 * 必要な環境変数(Vercelに設定すること):
 *  - GOOGLE_SERVICE_ACCOUNT_EMAIL: サービスアカウントのメールアドレス
 *  - GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: サービスアカウントの秘密鍵(-----BEGIN PRIVATE KEY-----...)
 *  - GOOGLE_DRIVE_ROOT_FOLDER_ID: Nottaの文字起こしを保存する親フォルダのID
 * 詳しい取得方法はセットアップガイドを参照。
 */
export function getDriveClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

  if (!email || !rawKey) {
    throw new Error(
      "Google連携の環境変数(GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)が設定されていません"
    );
  }

  // Vercelの環境変数は改行がそのまま貼れないことがあるため、\n をエスケープしている場合に対応する
  const privateKey = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });

  return google.drive({ version: "v3", auth });
}

export function getRootFolderId(): string {
  const id = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!id) {
    throw new Error("環境変数 GOOGLE_DRIVE_ROOT_FOLDER_ID が設定されていません");
  }
  return id;
}
