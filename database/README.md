# 🗄 Khang Database

> MongoDB schemas, seed data, indexes, and ER diagram for the Khang Chinese Restaurant.

## 📁 Contents

```
database/
├── README.md                ← you are here
├── schema/                  # JSON Schema definitions for every collection
│   ├── users.schema.json
│   ├── categories.schema.json
│   ├── products.schema.json
│   ├── orders.schema.json
│   └── reviews.schema.json
├── seed/                    # Initial data
│   ├── categories.json      # 5 categories
│   ├── products.json        # 18 dishes
│   └── admin-user.json      # admin@khang.com / admin123
├── migrations/              # Versioned schema updates
│   └── 001-initial.js       # Creates indexes
├── scripts/
│   ├── seed.sh              # Run seed via Docker / mongosh
│   └── backup.sh            # Daily backup helper
└── docs/
    ├── ER-DIAGRAM.md        # Entity relationships
    └── INDEXES.md           # All index definitions
```

## 🚀 Quick Setup

### Option A — Local MongoDB (Docker)
```bash
docker run -d --name khang-mongo -p 27017:27017 -v khang-data:/data/db mongo:7
```

### Option B — MongoDB Atlas (cloud, free tier)
1. Create a free M0 cluster at https://www.mongodb.com/atlas
2. Network Access → Allow IP `0.0.0.0/0` (or your IP)
3. Database Access → create a user
4. Get the connection string and put it in `backend/.env` as `MONGO_URI`

### Seed the database
```bash
# from the repo root
cd backend
npm run seed          # uses ../database/seed/*.json
```

## 🗺️ Entity Relationships

```
┌──────────┐         ┌─────────┐
│  Users   │◄────────┤ Orders  │  (one user → many orders)
└──────────┘         └─────────┘
     │                    │
     │                    └──> items[].product → Products
     │
     └────────►  Reviews ────►  Products
                              ◄──── Categories (via category name)
```

See `docs/ER-DIAGRAM.md` for full details.

## 📊 Collections Summary

| Collection | Documents (seed) | Key Indexes |
|---|---|---|
| `users` | 1 (admin) | `email` (unique) |
| `categories` | 5 | `slug` (unique), `sortOrder` |
| `products` | 18 | `slug` (unique), text index on name/description, `featured` |
| `orders` | 0 | `orderId` (unique), `user`, `status`, `payment.status` |
| `reviews` | 0 | `(user, product)` unique compound, `product` |

## 🔧 Used by

The backend Mongoose models in `/backend/src/models/` correspond 1:1 with
the schemas in `database/schema/`. Mongoose schemas are the source of truth
at runtime; the JSON Schema files here are kept for documentation,
validation tooling, and reference.
