# Database Indexes

All indexes are created automatically by Mongoose schemas at startup
(when `autoIndex: true`, default in development). The same indexes are
defined in the migration script `../migrations/001-initial.js` for
manual / production deployments.

## Users

| Index | Type | Purpose |
|---|---|---|
| `{ email: 1 }` | unique | Login lookup, prevent duplicate signups |

## Categories

| Index | Type | Purpose |
|---|---|---|
| `{ slug: 1 }` | unique | URL routing |
| `{ sortOrder: 1 }` | regular | Display order in menu |

## Products

| Index | Type | Purpose |
|---|---|---|
| `{ slug: 1 }` | unique | URL routing |
| `{ category: 1 }` | regular | Filter menu by category |
| `{ featured: 1 }` | regular | Homepage signature picks |
| `{ name, description, chineseName }` | **text** | Global search (`?q=…`) |

## Orders

| Index | Type | Purpose |
|---|---|---|
| `{ orderId: 1 }` | unique | Public order tracking |
| `{ user: 1, createdAt: -1 }` | compound | "My Orders" view |
| `{ status: 1 }` | regular | Admin dashboard filtering |
| `{ "payment.status": 1 }` | regular | Revenue queries |

## Reviews

| Index | Type | Purpose |
|---|---|---|
| `{ user: 1, product: 1 }` | unique compound | One review per user per product |
| `{ product: 1, createdAt: -1 }` | compound | Latest reviews per product |

## How to verify in production

```bash
mongosh "<YOUR_MONGO_URI>"

> use khang
> db.products.getIndexes()
> db.orders.getIndexes()
```

## Performance notes

- The **text index** on products supports the `?q=` query parameter in
 `GET /api/products` and powers the global search modal in the frontend.
- The **compound `(user, createdAt: -1)`** on orders makes "My Orders"
 a single index scan — no full collection lookup.
- The **unique `(user, product)`** on reviews enforces the business rule
 at the DB level instead of relying on app code.
