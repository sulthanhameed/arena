/**
 * Order notifications — the Deno replacement for `utils/notifications.js`.
 *
 * Nodemailer/Twilio SDKs don't run on the Edge runtime, so both channels are
 * plain `fetch` calls:
 *   • Email → Resend   (RESEND_API_KEY, EMAIL_FROM)
 *   • SMS   → Twilio   (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)
 *
 * Both are optional: if the secrets are missing we log and move on, exactly
 * like the old Express implementation.
 */

export interface NotifiableOrder {
  order_number: string;
  total: number;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  items?: Array<{ name: string; price: number; qty: number }>;
}

function itemsTable(order: NotifiableOrder): string {
  return (order.items ?? [])
    .map(
      (i) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #eee">${i.name} × ${i.qty}</td>` +
        `<td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₹${
          Number(i.price) * i.qty
        }</td></tr>`,
    )
    .join("");
}

export async function sendOrderEmail(order: NotifiableOrder): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.warn("⚠  RESEND_API_KEY not set — skipping email");
    return;
  }
  if (!order.customer_email) return;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#0a0a0a">
      <div style="background:#15803d;color:#fff;padding:24px;text-align:center">
        <h1 style="margin:0;font-size:28px">康 Khang</h1>
        <p style="margin:8px 0 0;opacity:.9">Order Confirmed</p>
      </div>
      <div style="padding:24px;background:#fff">
        <p>Hi ${order.customer_name ?? "there"},</p>
        <p>Thank you for your order! Your meal will arrive in 30–40 minutes.</p>
        <div style="background:#f9f9f9;padding:16px;border-radius:8px;margin:16px 0">
          <strong>Order ID:</strong> ${order.order_number}<br/>
          <strong>Total:</strong> ₹${order.total}
        </div>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">${itemsTable(order)}</table>
        <p style="font-size:12px;color:#666">Track your order at khang.com/track</p>
      </div>
    </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: Deno.env.get("EMAIL_FROM") ?? "Khang Restaurant <onboarding@resend.dev>",
        to: [order.customer_email],
        subject: `Order Confirmed · ${order.order_number} · Khang`,
        html,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    console.log(`✉  Email sent → ${order.customer_email}`);
  } catch (err) {
    console.error("✉  Email failed:", err instanceof Error ? err.message : err);
  }
}

export async function sendOrderSMS(order: NotifiableOrder): Promise<void> {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!sid || !token || !from) {
    console.warn("⚠  Twilio not configured — skipping SMS");
    return;
  }
  if (!order.customer_phone) return;

  try {
    const body = new URLSearchParams({
      To: order.customer_phone,
      From: from,
      Body:
        `Khang: Order ${order.order_number} confirmed! ₹${order.total}. ` +
        `Arriving in 30-40 min. Track: khang.com/track`,
    });

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      },
    );
    if (!res.ok) throw new Error(await res.text());
    console.log(`📱 SMS sent → ${order.customer_phone}`);
  } catch (err) {
    console.error("📱 SMS failed:", err instanceof Error ? err.message : err);
  }
}

/** Fire both channels without blocking the response. */
export function notifyOrder(order: NotifiableOrder): Promise<unknown> {
  return Promise.allSettled([sendOrderEmail(order), sendOrderSMS(order)]);
}
