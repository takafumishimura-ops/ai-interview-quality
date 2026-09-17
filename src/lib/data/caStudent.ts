import { createServerSupabaseClient } from "@/lib/supabase/server";

type SupabaseClient = ReturnType<typeof createServerSupabaseClient>;

export async function findOrCreateCa(supabase: SupabaseClient, name: string) {
  const trimmed = name.trim();
  const { data: existing } = await supabase
    .from("cas")
    .select("*")
    .eq("name", trimmed)
    .maybeSingle();
  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("cas")
    .insert({ name: trimmed })
    .select("*")
    .single();
  if (error) throw error;
  return created;
}

export async function findOrCreateStudent(
  supabase: SupabaseClient,
  studentName: string
) {
  const trimmed = studentName.trim();
  const { data: existing } = await supabase
    .from("students")
    .select("*")
    .eq("name", trimmed)
    .maybeSingle();
  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("students")
    .insert({ name: trimmed })
    .select("*")
    .single();
  if (error) throw error;
  return created;
}
