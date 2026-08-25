"use client";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cached: ReturnType<typeof createClient> | null = null;

export function supabaseBrowser() {
  if (!url || !anonKey) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
  if (!cached) {
    cached = createClient(url, anonKey);
  }
  return cached;
}

export function isSupabaseBrowserConfigured() {
  return Boolean(url && anonKey);
}
