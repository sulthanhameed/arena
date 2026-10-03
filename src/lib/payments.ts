/**
 * High-level checkout orchestrator.
 *
 *   1. rpc('create_order')  → Postgres prices the cart and returns the order
 *   2. COD                  → done (an Edge Function sends the confirmation)
 *      UPI / Wallet / Card  → Edge Function creates the gateway order,
 *                             the widget opens, then the signature is
 *                             verified by another Edge Function
 *
 * No Express server, no Render instance — just Supabase.
 */
import { ordersApi, paymentsApi, type CreateOrderBody } from "./api";
import { openRazorpayCheckout } from "./razorpay";

export interface PaymentResult {
  success: boolean;
  orderId?: string;
  error?: string;
}

export async function runCheckout(body: CreateOrderBody): Promise<PaymentResult> {
  try {
    // 1 ── Create the order (totals calculated inside the database)
    const order = await ordersApi.create(body);

    // 2 ── Cash on delivery: confirmed immediately
    if (body.paymentMethod === "cod") {
      // Fire-and-forget email/SMS — never block the success screen on it
      paymentsApi.notify(order.order_number).catch(() => {});
      return { success: true, orderId: order.order_number };
    }

    // 3 ── Razorpay (UPI / wallet / card)
    const init = await paymentsApi.createRazorpayOrder(order.order_number);

    return await new Promise<PaymentResult>((resolve) => {
      openRazorpayCheckout({
        key: init.key,
        amount: init.amount,
        currency: init.currency,
        name: "Khang Restaurant",
        description: `Order ${init.order_number}`,
        order_id: init.razorpay_order_id,
        prefill: {
          name: init.customer?.name ?? undefined,
          email: init.customer?.email ?? undefined,
          contact: init.customer?.phone ?? undefined,
        },
        theme: { color: "#15803d" },
        notes: { khang_order_number: init.order_number },
        handler: async (resp) => {
          try {
            await paymentsApi.verifyRazorpay({
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
              order_number: init.order_number,
            });
            resolve({ success: true, orderId: init.order_number });
          } catch (err) {
            resolve({
              success: false,
              error: err instanceof Error ? err.message : "Verification failed",
            });
          }
        },
        modal: {
          ondismiss: () => resolve({ success: false, error: "Payment cancelled" }),
        },
      }).catch((err: Error) => resolve({ success: false, error: err.message }));
    });
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Checkout failed",
    };
  }
}
