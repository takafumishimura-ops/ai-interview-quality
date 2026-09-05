import { createClient } from "@supabase/supabase-js";

/**
 * サーバー専用クライアント(API Route / Server Component から利用)。
 * Service Role Key を使うため RLS をバイパスする。ブラウザに露出させないこと。
 */
export function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabaseの環境変数が設定されていません。.env.local を確認してください (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)"
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
