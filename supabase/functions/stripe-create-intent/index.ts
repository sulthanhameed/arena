/**
 * POST /functions/v1/stripe-create-intent
 * Body: { order_number }
 *
 * Replaces: POST /api/payments/stripe/create-intent
 */
import Stripe from "stripe";
import { fail, json, preflight } from "../_shared/cors.ts";
import {
  HttpError,
  loadOwnOrder,
  requireUser,
  serviceClient,
  toMinorUnits,
} from "../_shared/supabase.ts";

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
    if (!stripe) throw new HttpError("Stripe key is not configured", 503);

    const { supabase } = await requireUser(req);
    const { order_number } = await req.json().catch(() => ({}));
    if (!order_number) throw new HttpError("order_number is required");

    const order = await loadOwnOrder(supabase, order_number);
    if (order.payment_status === "paid") {
      throw new HttpError("Order is already paid", 409);
    }

    const intent = await stripe.paymentIntents.create({
      amount: toMinorUnits(order.total),
      currency: "inr",
      automatic_payment_methods: { enabled: true },
      metadata: {
        khang_order_number: order.order_number,
        user_id: order.user_id,
      },
      receipt_email: order.customer_email ?? undefined,
    });

    const admin = serviceClient();
    const { error } = await admin
      .from("orders")
      .update({
        stripe_payment_intent_id: intent.id,
        stripe_client_secret: intent.client_secret,
        payment_gateway: "stripe",
      })
      .eq("id", order.id);
    if (error) throw new HttpError(error.message, 500);

    return json(req, {
      client_secret: intent.client_secret,
      publishable_key: Deno.env.get("STRIPE_PUBLISHABLE_KEY") ?? null,
      order_number: order.order_number,
      amount: intent.amount,
    });
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    return fail(req, err instanceof Error ? err.message : "Unexpected error", status);
  }
});
