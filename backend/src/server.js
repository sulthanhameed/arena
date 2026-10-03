import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { connectDB } from "./config/db.js";
import routes from "./routes/index.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { stripeWebhook } from "./controllers/paymentController.js";

const app = express();

// ─── Stripe webhook MUST be mounted with raw body BEFORE express.json() ───
app.post(
  "/api/payments/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook,
);

// ─── Security & parsing middleware ───
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(
  cors({
    origin: process.env.CLIENT_URL?.split(",") || "*",
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ─── Rate limiting ───
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});
app.use("/api/", limiter);

// ─── Health check ───
app.get("/health", (_req, res) =>
  res.json({ status: "ok", uptime: process.uptime() }),
);

// ─── Routes ───
app.use("/api", routes);

// ─── 404 + error handler ───
app.use(notFound);
app.use(errorHandler);

// ─── Boot ───
const PORT = Number(process.env.PORT) || 5000;

(async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Khang API running on http://localhost:${PORT}`);
    console.log(`📚 Docs:    http://localhost:${PORT}/api`);
    console.log(`💓 Health:  http://localhost:${PORT}/health`);
  });
})();

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});
