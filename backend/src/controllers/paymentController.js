import crypto from "crypto";
import Razorpay from "razorpay";
import Stripe from "stripe";
import Order from "../models/Order.js";
import { sendOrderEmail, sendOrderSMS } from "../utils/notifications.js";

// ─── Lazy clients (so missing keys don't crash boot) ───────────
let razorpay;
function getRazorpay() {
  if (!razorpay) {
    if (!process.env.RAZORPAY_KEY_ID) throw new Error("Razorpay keys missing");
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpay;
}

let stripe;
function getStripe() {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe key missing");
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-11-20.acacia",
    });
  }
  return stripe;
}

// ─── RAZORPAY ──────────────────────────────────────────────────

/**
 * POST /api/payments/razorpay/create-order
 * Body: { orderId } — internal Khang order id
 * Returns the Razorpay order details for the frontend Checkout widget
 */
export async function createRazorpayOrder(req, res, next) {
  try {
    const { orderId } = req.body;
    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ message: "Order not found" });

    const rp = getRazorpay();
    const rpOrder = await rp.orders.create({
      amount: order.total * 100, // amount in paise
      currency: "INR",
      receipt: order.orderId,
      notes: {
        khangOrderId: order.orderId,
        userId: String(order.user),
      },
    });

    order.payment.razorpayOrderId = rpOrder.id;
    order.payment.gateway = "razorpay";
    await order.save();

    res.json({
      key: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId: rpOrder.id,
      amount: rpOrder.amount,
      currency: rpOrder.currency,
      orderId: order.orderId,
      customer: order.customer,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/payments/razorpay/verify
 * Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId }
 * Verifies the HMAC signature, marks the order as paid.
 */
export async function verifyRazorpayPayment(req, res, next) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = req.body;

    // Generate expected signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (expected !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.payment.razorpayPaymentId = razorpay_payment_id;
    order.payment.razorpaySignature = razorpay_signature;
    order.payment.status = "paid";
    order.payment.paidAt = new Date();
    await order.save();

    // Send confirmations
    sendOrderEmail(order).catch(() => {});
    sendOrderSMS(order).catch(() => {});

    res.json({
      message: "Payment verified",
      order: { orderId: order.orderId, status: order.status, total: order.total },
    });
  } catch (err) {
    next(err);
  }
}

// ─── STRIPE ────────────────────────────────────────────────────

/**
 * POST /api/payments/stripe/create-intent
 * Body: { orderId } — internal order id
 * Returns a clientSecret for stripe.js confirmCardPayment
 */
export async function createStripeIntent(req, res, next) {
  try {
    const { orderId } = req.body;
    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ message: "Order not found" });

    const st = getStripe();
    const intent = await st.paymentIntents.create({
      amount: order.total * 100, // smallest currency unit
      currency: "inr",
      automatic_payment_methods: { enabled: true },
      metadata: {
        khangOrderId: order.orderId,
        userId: String(order.user),
      },
      receipt_email: order.customer?.email,
    });

    order.payment.stripePaymentIntentId = intent.id;
    order.payment.stripeClientSecret = intent.client_secret;
    order.payment.gateway = "stripe";
    await order.save();

    res.json({
      clientSecret: intent.client_secret,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      orderId: order.orderId,
      amount: intent.amount,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/payments/stripe/webhook
 * Handles payment_intent.succeeded / failed events
 * NOTE: this route uses raw body parsing (set in server.js)
 */
export async function stripeWebhook(req, res) {
  const sig = req.headers["stripe-signature"];
  const st = getStripe();
  let event;
  try {
    event = st.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("Stripe webhook signature failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;
    const orderId = pi.metadata?.khangOrderId;
    const order = await Order.findOne({ orderId });
    if (order && order.payment.status !== "paid") {
      order.payment.status = "paid";
      order.payment.paidAt = new Date();
      await order.save();
      sendOrderEmail(order).catch(() => {});
      sendOrderSMS(order).catch(() => {});
    }
  } else if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object;
    const orderId = pi.metadata?.khangOrderId;
    const order = await Order.findOne({ orderId });
    if (order) {
      order.payment.status = "failed";
      await order.save();
    }
  }

  res.json({ received: true });
}

// ─── COMMON ────────────────────────────────────────────────────

/**
 * POST /api/payments/refund
 * Body: { orderId }
 */
export async function refundOrder(req, res, next) {
  try {
    const { orderId } = req.body;
    const order = await Order.findOne({ orderId });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.payment.status !== "paid")
      return res.status(400).json({ message: "Order is not paid" });

    if (order.payment.gateway === "razorpay") {
      const rp = getRazorpay();
      await rp.payments.refund(order.payment.razorpayPaymentId, {
        amount: order.total * 100,
      });
    } else if (order.payment.gateway === "stripe") {
      const st = getStripe();
      await st.refunds.create({
        payment_intent: order.payment.stripePaymentIntentId,
      });
    }

    order.payment.status = "refunded";
    order.status = "cancelled";
    order.tracking.push({
      stage: "cancelled",
      note: "Order refunded",
      at: new Date(),
    });
    await order.save();
    res.json({ message: "Refund processed", order });
  } catch (err) {
    next(err);
  }
}
