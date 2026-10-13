import { Router } from "express";
import auth from "./auth.js";
import products from "./products.js";
import orders from "./orders.js";
import payments from "./payments.js";
import reviews from "./reviews.js";

const router = Router();

router.get("/", (_req, res) =>
  res.json({
    name: "Khang Chinese Restaurant API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      products: "/api/products",
      orders: "/api/orders",
      payments: "/api/payments",
      reviews: "/api/reviews",
    },
  }),
);

router.use("/auth", auth);
router.use("/products", products);
router.use("/orders", orders);
router.use("/payments", payments);
router.use("/reviews", reviews);

export default router;
