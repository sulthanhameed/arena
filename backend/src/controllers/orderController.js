import Order from "../models/Order.js";
import Product from "../models/Product.js";
import { generateOrderId } from "../utils/generateOrderId.js";
import { sendOrderEmail, sendOrderSMS } from "../utils/notifications.js";

/**
 * Recalculate totals server-side from product IDs and quantities
 * (Never trust client-sent prices)
 */
async function calculateTotals(items) {
  const ids = items.map((i) => i.product);
  const products = await Product.find({ _id: { $in: ids } });
  const map = new Map(products.map((p) => [String(p._id), p]));

  let subtotal = 0;
  const lines = items.map(({ product, qty }) => {
    const p = map.get(String(product));
    if (!p) throw Object.assign(new Error("Product not found"), { status: 400 });
    const line = {
      product: p._id,
      name: p.name,
      chineseName: p.chineseName,
      image: p.image,
      price: p.price,
      qty,
    };
    subtotal += p.price * qty;
    return line;
  });

  const tax = Math.round(subtotal * 0.05);
  const delivery = subtotal > 500 ? 0 : 40;
  const total = subtotal + tax + delivery;
  return { lines, subtotal, tax, delivery, total };
}

// POST /api/orders — create a new order (pending payment, except COD)
export async function createOrder(req, res, next) {
  try {
    const { items, address, customer, paymentMethod } = req.body;

    if (!items?.length) {
      return res.status(400).json({ message: "Cart is empty" });
    }
    if (!address?.line1) {
      return res.status(400).json({ message: "Delivery address is required" });
    }

    const { lines, subtotal, tax, delivery, total } = await calculateTotals(items);

    const order = await Order.create({
      orderId: generateOrderId(),
      user: req.user._id,
      items: lines,
      customer: {
        name: customer?.name || req.user.name,
        phone: customer?.phone || req.user.phone,
        email: req.user.email,
      },
      address,
      subtotal,
      tax,
      delivery,
      total,
      payment: {
        method: paymentMethod,
        gateway:
          paymentMethod === "cod"
            ? "cod"
            : paymentMethod === "card"
              ? "stripe"
              : "razorpay",
        status: paymentMethod === "cod" ? "pending" : "pending",
      },
      estimatedDelivery: new Date(Date.now() + 35 * 60 * 1000), // +35 min
    });

    // Fire-and-forget notifications for COD (since it's "confirmed" without payment)
    if (paymentMethod === "cod") {
      sendOrderEmail(order).catch(() => {});
      sendOrderSMS(order).catch(() => {});
    }

    res.status(201).json({ order });
  } catch (err) {
    next(err);
  }
}

// GET /api/orders/me — user's own orders
export async function getMyOrders(req, res, next) {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ count: orders.length, orders });
  } catch (err) {
    next(err);
  }
}

// GET /api/orders/:orderId — get one order
export async function getOrder(req, res, next) {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId }).lean();
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ order });
  } catch (err) {
    next(err);
  }
}

// GET /api/orders/track/:orderId — public tracking (no auth)
export async function trackOrder(req, res, next) {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId })
      .select("orderId status tracking estimatedDelivery deliveredAt total customer.name")
      .lean();
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ order });
  } catch (err) {
    next(err);
  }
}

// PUT /api/orders/:id/status — admin updates status
export async function updateStatus(req, res, next) {
  try {
    const { status, note } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.status = status;
    order.tracking.push({ stage: status, note, at: new Date() });
    if (status === "delivered") order.deliveredAt = new Date();

    await order.save();
    res.json({ order });
  } catch (err) {
    next(err);
  }
}

// GET /api/orders — admin lists all
export async function listAllOrders(req, res, next) {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate("user", "name email")
      .lean();
    res.json({ count: orders.length, orders });
  } catch (err) {
    next(err);
  }
}
