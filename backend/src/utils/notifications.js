import nodemailer from "nodemailer";

let transporter;
function getTransport() {
  if (transporter) return transporter;
  if (!process.env.EMAIL_HOST) {
    console.warn("⚠  Email not configured — skipping send");
    return null;
  }
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  return transporter;
}

/**
 * Send an order confirmation email
 */
export async function sendOrderEmail(order) {
  const t = getTransport();
  if (!t || !order.customer?.email) return;

  const itemsHtml = order.items
    .map(
      (i) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #eee">${i.name} × ${i.qty}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">₹${i.price * i.qty}</td></tr>`,
    )
    .join("");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#0a0a0a">
      <div style="background:#15803d;color:#fff;padding:24px;text-align:center">
        <h1 style="margin:0;font-size:28px">康 Khang</h1>
        <p style="margin:8px 0 0;opacity:.9">Order Confirmed</p>
      </div>
      <div style="padding:24px;background:#fff">
        <p>Hi ${order.customer?.name || "there"},</p>
        <p>Thank you for your order! Your meal will arrive in 30–40 minutes.</p>
        <div style="background:#f9f9f9;padding:16px;border-radius:8px;margin:16px 0">
          <strong>Order ID:</strong> ${order.orderId}<br/>
          <strong>Total:</strong> ₹${order.total}
        </div>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">${itemsHtml}</table>
        <p style="font-size:12px;color:#666">Track your order at khang.com/track</p>
      </div>
    </div>
  `;

  try {
    await t.sendMail({
      from: process.env.EMAIL_FROM,
      to: order.customer.email,
      subject: `Order Confirmed · ${order.orderId} · Khang`,
      html,
    });
    console.log(`✉  Email sent → ${order.customer.email}`);
  } catch (err) {
    console.error("✉  Email failed:", err.message);
  }
}

/**
 * Send an SMS via Twilio
 */
export async function sendOrderSMS(order) {
  if (!process.env.TWILIO_ACCOUNT_SID) {
    console.warn("⚠  Twilio not configured — skipping SMS");
    return;
  }
  if (!order.customer?.phone) return;

  try {
    const { default: twilio } = await import("twilio");
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
    await client.messages.create({
      body: `Khang: Order ${order.orderId} confirmed! ₹${order.total}. Arriving in 30-40 min. Track: khang.com/track`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: order.customer.phone,
    });
    console.log(`📱 SMS sent → ${order.customer.phone}`);
  } catch (err) {
    console.error("📱 SMS failed:", err.message);
  }
}
