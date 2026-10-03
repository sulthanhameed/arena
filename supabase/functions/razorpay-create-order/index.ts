/**
 * POST /functions/v1/razorpay-create-order
 * Body: { order_number: "KH-2026-1042" }
 *
 * Replaces: POST /api/payments/razorpay/create-order
 *
 * Creates the Razorpay order for an existing Khang order and returns what the
 * Checkout widget needs. The amount always comes from the database row, never
 * from the browser.
 */
import { fail, json, preflight } from "../_shared/cors.ts";
import {
  HttpError,
  loadOwnOrder,
  requireUser,
  serviceClient,
  toMinorUnits,
} from "../_shared/supabase.ts";
import {
  createRazorpayOrder,
  razorpayConfigured,
  razorpayKeyId,
} from "../_shared/razorpay.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    if (!razorpayConfigured()) {
      throw new HttpError("Razorpay keys are not configured", 503);
    }

    const { supabase } = await requireUser(req);
    const { order_number } = await req.json().catch(() => ({}));
    if (!order_number) throw new HttpError("order_number is required");

    const order = await loadOwnOrder(supabase, order_number);
    if (order.payment_status === "paid") {
      throw new HttpError("Order is already paid", 409);
    }

    const rpOrder = await createRazorpayOrder({
      amount: toMinorUnits(order.total),
      currency: "INR",
      receipt: order.order_number,
      notes: { khang_order_number: order.order_number, user_id: order.user_id },
    });

    // Service role: the user may not update orders directly (RLS).
    const admin = serviceClient();
    const { error } = await admin
      .from("orders")
      .update({ razorpay_order_id: rpOrder.id, payment_gateway: "razorpay" })
      .eq("id", order.id);
    if (error) throw new HttpError(error.message, 500);

    return json(req, {
      key: razorpayKeyId(),
      razorpay_order_id: rpOrder.id,
      amount: rpOrder.amount,
      currency: rpOrder.currency,
      order_number: order.order_number,
      customer: {
        name: order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone,
      },
    });
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    return fail(req, err instanceof Error ? err.message : "Unexpected error", status);
  }
});
