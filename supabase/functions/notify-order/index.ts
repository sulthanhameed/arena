/**
 * POST /functions/v1/notify-order
 * Body: { order_number }
 *
 * Sends the confirmation email + SMS for an order. Used for Cash-on-Delivery,
 * which is "confirmed" without a payment gateway round-trip — the equivalent
 * of the fire-and-forget calls in the old createOrder controller.
 */
import { fail, json, preflight } from "../_shared/cors.ts";
import { HttpError, loadOwnOrder, requireUser, serviceClient } from "../_shared/supabase.ts";
import { notifyOrder } from "../_shared/notify.ts";

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    const { supabase } = await requireUser(req);
    const { order_number } = await req.json().catch(() => ({}));
    if (!order_number) throw new HttpError("order_number is required");

    // Ownership check via RLS
    await loadOwnOrder(supabase, order_number);

    const admin = serviceClient();
    const { data, error } = await admin
      .from("orders")
      .select(
        "order_number, total, customer_name, customer_email, customer_phone, order_items(name, price, qty)",
      )
      .eq("order_number", order_number)
      .single();
    if (error) throw new HttpError(error.message, 500);

    await notifyOrder({
      order_number: data.order_number,
      total: Number(data.total),
      customer_name: data.customer_name,
      customer_email: data.customer_email,
      customer_phone: data.customer_phone,
      items: (data.order_items ?? []) as Array<{ name: string; price: number; qty: number }>,
    });

    return json(req, { message: "Notifications queued" });
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    return fail(req, err instanceof Error ? err.message : "Unexpected error", status);
  }
});
