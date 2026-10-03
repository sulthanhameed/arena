/**
 * Shared CORS + JSON response helpers for every Khang Edge Function.
 *
 * Set CLIENT_URL (comma separated list allowed) as a function secret to lock
 * the API down to your own frontend:
 *   supabase secrets set CLIENT_URL=https://khang.vercel.app
 */

const allowList = (Deno.env.get("CLIENT_URL") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed = allowList.length === 0
    ? "*"
    : allowList.includes(origin)
    ? origin
    : allowList[0];

  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, stripe-signature",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Vary": "Origin",
  };
}

export function preflight(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }
  return null;
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

export function fail(req: Request, message: string, status = 400): Response {
  console.error(`✗ ${status} — ${message}`);
  return json(req, { message }, status);
}
