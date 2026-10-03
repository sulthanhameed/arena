import { Router } from "express";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  createStripeIntent,
  refundOrder,
} from "../controllers/paymentController.js";
import { protect, adminOnly } from "../middleware/auth.js";

const router = Router();

// Razorpay
router.post("/razorpay/create-order", protect, createRazorpayOrder);
router.post("/razorpay/verify", protect, verifyRazorpayPayment);

// Stripe
router.post("/stripe/create-intent", protect, createStripeIntent);

// Refunds (admin)
router.post("/refund", protect, adminOnly, refundOrder);

export default router;
