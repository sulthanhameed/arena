/**
 * Supabase clients for Edge Functions.
 *
 *  • userClient(req)    — runs as the signed-in caller, so Row Level Security
 *                         still applies. Use this for anything a user does.
 *  • serviceClient()    — bypasses RLS. Only for trusted, post-verification
 *                         writes (payment captured, webhook received, refund).
 *
 * This is the replacement for `middleware/auth.js` (protect / adminOnly).
 */
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export function userClient(req: Request): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export class HttpError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

/** Throws 401 unless a valid Supabase Auth JWT is present. */
export async function requireUser(
  req: Request,
): Promise<{ user: User; supabase: SupabaseClient }> {
  const supabase = userClient(req);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new HttpError("Not authorised — please sign in", 401);
  }
  return { user: data.user, supabase };
}

/** Throws 403 unless the caller's profile has role = 'admin'. */
export async function requireAdmin(
  req: Request,
): Promise<{ user: User; supabase: SupabaseClient }> {
  const { user, supabase } = await requireUser(req);
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || data?.role !== "admin") {
    throw new HttpError("Admin access required", 403);
  }
  return { user, supabase };
}

export interface OrderRow {
  id: string;
  order_number: string;
  user_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  total: number;
  payment_status: string;
  payment_gateway: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  stripe_payment_intent_id: string | null;
}

/** Loads an order the caller is allowed to see (RLS does the checking). */
export async function loadOwnOrder(
  supabase: SupabaseClient,
  orderNumber: string,
): Promise<OrderRow> {
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id, order_number, user_id, customer_name, customer_phone, customer_email, total, payment_status, payment_gateway, razorpay_order_id, razorpay_payment_id, stripe_payment_intent_id",
    )
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (error) throw new HttpError(error.message, 400);
  if (!data) throw new HttpError("Order not found", 404);
  return data as OrderRow;
}

/** Converts rupees to the smallest currency unit (paise) safely. */
export function toMinorUnits(amount: number): number {
  return Math.round(Number(amount) * 100);
}
