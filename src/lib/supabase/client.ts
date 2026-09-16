import { createClient } from "@supabase/supabase-js";

/**
 * ブラウザ用クライアント(anon keyのみ使用)。MVPでは読み取り専用の軽い用途に限定し、
 * 書き込みを伴う操作は API Route 経由(server.ts)で行う想定。
 */
export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, anonKey);
}
