/**
 * POST /functions/v1/stripe-webhook
 *
 * Replaces: POST /api/payments/stripe/webhook
 *
 * ⚠ This function must run WITHOUT JWT verification — Stripe doesn't send one.
 *   That is configured in supabase/config.toml:
 *       [functions.stripe-webhook]
 *       verify_jwt = false
 *   Authenticity comes from the Stripe signature instead.
 *
 * Point your Stripe webhook at:
 *   https://<project-ref>.supabase.co/functions/v1/stripe-webhook
 */
import Stripe from "stripe";
import { serviceClient } from "../_shared/supabase.ts";
import { notifyOrder } from "../_shared/notify.ts";

const secret = Deno.env.get("STRIPE_SECRET_KEY");
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

const stripe = secret
  ? new Stripe(secret, {
      apiVersion: "2025-02-24.acacia",
      httpClient: Stripe.createFetchHttpClient(),
    })
  : null;

// Edge runtime needs the async/SubtleCrypto signature verifier
const cryptoProvider = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req) => {
  if (!stripe || !webhookSecret) {
    return new Response("Stripe is not configured", { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing stripe-signature", { status: 400 });

  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider,
    );
  } catch (err) {
    console.error("Stripe webhook signature failed:", err);
    return new Response(
      `Webhook Error: ${err instanceof Error ? err.message : "invalid signature"}`,
      { status: 400 },
    );
  }

  const admin = serviceClient();

  const settle = async (status: "paid" | "failed", intent: Stripe.PaymentIntent) => {
    const orderNumber = intent.metadata?.khang_order_number;
    if (!orderNumber) return null;

    const { data, error } = await admin.rpc("mark_order_paid", {
      p_order_number: orderNumber,
      p_gateway: "stripe",
      p_payment_id: intent.id,
      p_signature: null,
      p_status: status,
    });
    if (error) console.error("mark_order_paid failed:", error.message);
    return data as Record<string, unknown> | null;
  };

  switch (event.type) {
    case "payment_intent.succeeded": {
      const order = await settle("paid", event.data.object as Stripe.PaymentIntent);
      if (order) {
        await notifyOrder({
          order_number: String(order.order_number),
          total: Number(order.total),
          customer_name: (order.customer as Record<string, string>)?.name,
          customer_email: (order.customer as Record<string, string>)?.email,
          customer_phone: (order.customer as Record<string, string>)?.phone,
          items: order.items as Array<{ name: string; price: number; qty: number }>,
        });
      }
      break;
    }
    case "payment_intent.payment_failed": {
      await settle("failed", event.data.object as Stripe.PaymentIntent);
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const intentId = typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id;
      if (intentId) {
        const { data } = await admin
          .from("orders")
          .select("order_number")
          .eq("stripe_payment_intent_id", intentId)
          .maybeSingle();
        if (data?.order_number) {
          await admin.rpc("mark_order_paid", {
            p_order_number: data.order_number,
            p_gateway: "stripe",
            p_payment_id: intentId,
            p_signature: null,
            p_status: "refunded",
          });
        }
      }
      break;
    }
    default:
      console.log(`Unhandled Stripe event: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
