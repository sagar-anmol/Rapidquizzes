import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function hasSupabaseConfig() {
  return Boolean(url && anonKey);
}

export function hasSupabaseServiceConfig() {
  return Boolean(url && serviceKey);
}

export function supabaseAdmin(): SupabaseClient {
  if (!url || !serviceKey) {
    throw new Error("Supabase service configuration missing.");
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export async function getRoleForToken(accessToken: string): Promise<string | null> {
  if (!hasSupabaseConfig()) return null;
  const client = createClient(url!, anonKey!, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: userData } = await client.auth.getUser(accessToken);
  if (!userData?.user) return null;

  const { data } = await client
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();
  return data?.role ?? "candidate";
}
