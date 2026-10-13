import { Router } from "express";
import {
  createOrder,
  getMyOrders,
  getOrder,
  trackOrder,
  updateStatus,
  listAllOrders,
} from "../controllers/orderController.js";
import { protect, adminOnly } from "../middleware/auth.js";

const router = Router();

// Public — order tracking
router.get("/track/:orderId", trackOrder);

// User
router.post("/", protect, createOrder);
router.get("/me", protect, getMyOrders);
router.get("/:orderId", protect, getOrder);

// Admin
router.get("/", protect, adminOnly, listAllOrders);
router.put("/:id/status", protect, adminOnly, updateStatus);

export default router;
