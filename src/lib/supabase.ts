/**
 * The one and only Supabase client for the Khang frontend.
 *
 * There is no REST server in this project any more — the browser talks
 * straight to Supabase:
 *   • PostgREST  → menu, reviews, order history   (guarded by RLS)
 *   • RPC        → create_order, track_order, …   (server-side business rules)
 *   • Auth       → sign-up / sign-in / sessions
 *   • Functions  → payment gateways & notifications
 *
 * Required env vars (see .env.example):
 *   VITE_SUPABASE_URL
 *   VITE_SUPABASE_ANON_KEY
 *
 * The anon key is a *public* key — it is safe in the bundle. Every table is
 * protected by Row Level Security, so the key alone grants nothing beyond
 * the public menu.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

/** True when the project is wired up; false → the app runs in offline demo mode. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn(
    "[khang] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — " +
      "running in offline demo mode. Copy .env.example to .env to connect.",
  );
}

export const supabase: SupabaseClient<Database> = createClient<Database>(
  // Harmless placeholders keep createClient from throwing before configuration.
  SUPABASE_URL || "http://localhost:54321",
  SUPABASE_ANON_KEY || "public-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "khang-auth",
    },
    global: {
      headers: { "x-application-name": "khang-web" },
    },
  },
);

/** Narrow a PostgrestError / FunctionsError into a plain message. */
export function errorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (err instanceof Error && err.message) return err.message;
  const maybe = err as { message?: string; error_description?: string; hint?: string };
  return maybe.message || maybe.error_description || maybe.hint || fallback;
}
