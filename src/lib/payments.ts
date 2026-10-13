/**
 * High-level payment orchestrator — handles Razorpay / Stripe / COD flows
 * by calling the backend, then opening the appropriate gateway widget.
 */
import { ordersApi, paymentsApi, type CreateOrderBody } from "./api";
import { openRazorpayCheckout } from "./razorpay";

export interface PaymentResult {
  success: boolean;
  orderId?: string;
  error?: string;
}

/**
 * Full checkout flow:
 *   1. Create an order on the backend (server recalculates totals)
 *   2. Depending on payment method, either:
 *      • COD → done
 *      • UPI/Wallet → Razorpay popup
 *      • Card → Stripe (handled separately if Stripe.js is wired)
 */
export async function runCheckout(body: CreateOrderBody): Promise<PaymentResult> {
  try {
    // 1. Create the order on backend
    const { order } = await ordersApi.create(body);

    // 2. COD — instant success, no payment widget
    if (body.paymentMethod === "cod") {
      return { success: true, orderId: order.orderId };
    }

    // 3. Razorpay flow (UPI / Wallet / Card via Razorpay)
    if (body.paymentMethod === "upi" || body.paymentMethod === "wallet" || body.paymentMethod === "card") {
      const init = await paymentsApi.createRazorpayOrder(order.orderId);

      return new Promise<PaymentResult>((resolve) => {
        openRazorpayCheckout({
          key: init.key,
          amount: init.amount,
          currency: init.currency,
          name: "Khang Restaurant",
          description: `Order ${init.orderId}`,
          order_id: init.razorpayOrderId,
          prefill: {
            name: init.customer?.name,
            email: init.customer?.email,
            contact: init.customer?.phone,
          },
          theme: { color: "#15803d" },
          notes: { khangOrderId: init.orderId },
          handler: async (resp) => {
            try {
              await paymentsApi.verifyRazorpay({
                ...resp,
                orderId: init.orderId,
              });
              resolve({ success: true, orderId: init.orderId });
            } catch (err) {
              resolve({
                success: false,
                error: err instanceof Error ? err.message : "Verification failed",
              });
            }
          },
          modal: {
            ondismiss: () =>
              resolve({ success: false, error: "Payment cancelled" }),
          },
        }).catch((err) =>
          resolve({ success: false, error: err.message }),
        );
      });
    }

    return { success: false, error: "Unsupported payment method" };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Checkout failed",
    };
  }
}
