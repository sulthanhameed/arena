/**
 * Razorpay REST helpers.
 *
 * The Node SDK can't run on the Edge runtime, so we talk to the REST API with
 * `fetch` and verify signatures with Web Crypto (HMAC-SHA256) — which is the
 * exact same check the old Express controller did with node:crypto.
 */

const KEY_ID = () => Deno.env.get("RAZORPAY_KEY_ID") ?? "";
const KEY_SECRET = () => Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";

function authHeader(): string {
  return `Basic ${btoa(`${KEY_ID()}:${KEY_SECRET()}`)}`;
}

export function razorpayConfigured(): boolean {
  return Boolean(KEY_ID() && KEY_SECRET());
}

export function razorpayKeyId(): string {
  return KEY_ID();
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(data?.error?.description ?? `Razorpay error (${res.status})`);
  }
  return data as T;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

export function createRazorpayOrder(input: {
  amount: number; // paise
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  return call<RazorpayOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency ?? "INR",
      receipt: input.receipt,
      notes: input.notes ?? {},
    }),
  });
}

export function refundRazorpayPayment(
  paymentId: string,
  amount: number,
): Promise<{ id: string; status: string }> {
  return call(`/payments/${paymentId}/refund`, {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}

/** HMAC-SHA256(`${orderId}|${paymentId}`, keySecret) === signature */
export async function verifyRazorpaySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(KEY_SECRET()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${razorpayOrderId}|${razorpayPaymentId}`),
  );
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time-ish comparison
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}
