// ─────────────────────────────────────────────────────────────
// Migration 001 — Initial indexes
// Run with: mongosh <connection-string> database/migrations/001-initial.js
// ─────────────────────────────────────────────────────────────

print("→ Creating initial indexes...");

db.users.createIndex({ email: 1 }, { unique: true, name: "uniq_email" });

db.categories.createIndex({ slug: 1 }, { unique: true, name: "uniq_slug" });
db.categories.createIndex({ sortOrder: 1 }, { name: "by_sort_order" });

db.products.createIndex({ slug: 1 }, { unique: true, name: "uniq_slug" });
db.products.createIndex({ category: 1 }, { name: "by_category" });
db.products.createIndex({ featured: 1 }, { name: "by_featured" });
db.products.createIndex(
  { name: "text", description: "text", chineseName: "text" },
  { name: "full_text_search", default_language: "english" },
);

db.orders.createIndex({ orderId: 1 }, { unique: true, name: "uniq_order_id" });
db.orders.createIndex({ user: 1, createdAt: -1 }, { name: "by_user_recent" });
db.orders.createIndex({ status: 1 }, { name: "by_status" });
db.orders.createIndex({ "payment.status": 1 }, { name: "by_payment_status" });

db.reviews.createIndex(
  { user: 1, product: 1 },
  { unique: true, name: "uniq_user_product" },
);
db.reviews.createIndex({ product: 1, createdAt: -1 }, { name: "by_product_recent" });

print("✓ Indexes created successfully.");
print("");
print("To verify:");
print("  db.products.getIndexes()");
print("  db.orders.getIndexes()");
