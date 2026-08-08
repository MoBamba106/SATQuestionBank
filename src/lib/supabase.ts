import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Resolve Supabase project URL / public key.
 * Prefers the names Supabase's Vercel integration injects, then NEXT_PUBLIC_* aliases.
 */
export function resolveSupabaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    ""
  );
}

export function resolveSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    ""
  );
}

/** Service role / secret key — server only, never expose to the browser. */
export function resolveSupabaseServiceRoleKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    ""
  );
}

const supabaseUrl = resolveSupabaseUrl();
const supabaseKey = resolveSupabaseAnonKey();

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase client is not configured.");
  }
  if (!browserClient) {
    browserClient = createClient(supabaseUrl, supabaseKey);
  }
  return browserClient;
}
