import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type ClientEnv = Record<string, string | undefined>;

const env = (import.meta as ImportMeta & { env: ClientEnv }).env;

export const supabaseUrl = env.VITE_SUPABASE_URL?.replace(/\/$/, "") || "";
export const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || "";
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

let client: SupabaseClient | null = null;

/**
 * Returns the browser Supabase client only when public project settings exist.
 * Keeping this lazy lets the visual demo still start without leaking placeholder
 * credentials into a production build.
 */
export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }

  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return client;
}
