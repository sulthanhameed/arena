/**
 * POST /functions/v1/razorpay-verify
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_number }
 *
 * Replaces: POST /api/payments/razorpay/verify
 *
 * Verifies the HMAC signature, then marks the order paid through the
 * `mark_order_paid` RPC (service_role only) and fires notifications.
 */
import { fail, json, preflight } from "../_shared/cors.ts";
import {
  HttpError,
  loadOwnOrder,
  requireUser,
  serviceClient,
} from "../_shared/supabase.ts";
import { verifyRazorpaySignature } from "../_shared/razorpay.ts";
import { notifyOrder } from "../_shared/notify.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const { supabase } = await requireUser(req);
    const body = await req.json().catch(() => ({}));
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      order_number,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !order_number) {
      throw new HttpError("Missing payment verification fields");
    }

    // The caller must actually own this order (RLS enforces it).
    const order = await loadOwnOrder(supabase, order_number);

    if (order.razorpay_order_id && order.razorpay_order_id !== razorpay_order_id) {
      throw new HttpError("Payment does not belong to this order", 400);
    }

    const valid = await verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    );
    if (!valid) throw new HttpError("Invalid payment signature", 400);

    const admin = serviceClient();
    const { data, error } = await admin.rpc("mark_order_paid", {
      p_order_number: order.order_number,
      p_gateway: "razorpay",
      p_payment_id: razorpay_payment_id,
      p_signature: razorpay_signature,
      p_status: "paid",
    });
    if (error) throw new HttpError(error.message, 500);

    const paid = data as Record<string, unknown>;
    await notifyOrder({
      order_number: String(paid.order_number),
      total: Number(paid.total),
      customer_name: (paid.customer as Record<string, string>)?.name,
      customer_email: (paid.customer as Record<string, string>)?.email,
      customer_phone: (paid.customer as Record<string, string>)?.phone,
      items: paid.items as Array<{ name: string; price: number; qty: number }>,
    });

    return json(req, { message: "Payment verified", order: paid });
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    return fail(req, err instanceof Error ? err.message : "Unexpected error", status);
  }
});
