/**
 * POST /functions/v1/refund-order
 * Body: { order_number }
 *
 * Replaces: POST /api/payments/refund  (admin only)
 */
import Stripe from "stripe";
import { fail, json, preflight } from "../_shared/cors.ts";
import { HttpError, requireAdmin, serviceClient, toMinorUnits } from "../_shared/supabase.ts";
import { refundRazorpayPayment } from "../_shared/razorpay.ts";

const secret = Deno.env.get("STRIPE_SECRET_KEY");
const stripe = secret
  ? new Stripe(secret, {
      apiVersion: "2025-02-24.acacia",
      httpClient: Stripe.createFetchHttpClient(),
    })
  : null;

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    await requireAdmin(req);

    const { order_number } = await req.json().catch(() => ({}));
    if (!order_number) throw new HttpError("order_number is required");

    const admin = serviceClient();
    const { data: order, error } = await admin
      .from("orders")
      .select(
        "id, order_number, total, payment_status, payment_gateway, razorpay_payment_id, stripe_payment_intent_id",
      )
      .eq("order_number", order_number)
      .maybeSingle();

    if (error) throw new HttpError(error.message, 500);
    if (!order) throw new HttpError("Order not found", 404);
    if (order.payment_status !== "paid") throw new HttpError("Order is not paid", 400);

    if (order.payment_gateway === "razorpay") {
      if (!order.razorpay_payment_id) throw new HttpError("No Razorpay payment to refund", 400);
      await refundRazorpayPayment(order.razorpay_payment_id, toMinorUnits(order.total));
    } else if (order.payment_gateway === "stripe") {
      if (!stripe) throw new HttpError("Stripe key is not configured", 503);
      if (!order.stripe_payment_intent_id) throw new HttpError("No Stripe intent to refund", 400);
      await stripe.refunds.create({ payment_intent: order.stripe_payment_intent_id });
    } else {
      throw new HttpError(`Cannot refund a ${order.payment_gateway} order`, 400);
    }

    const { data: refunded, error: rpcError } = await admin.rpc("mark_order_paid", {
      p_order_number: order.order_number,
      p_gateway: order.payment_gateway,
      p_payment_id: null,
      p_signature: null,
      p_status: "refunded",
    });
    if (rpcError) throw new HttpError(rpcError.message, 500);

    return json(req, { message: "Refund processed", order: refunded });
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    return fail(req, err instanceof Error ? err.message : "Unexpected error", status);
  }
});
