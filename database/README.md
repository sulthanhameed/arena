# 🗄 Khang Database — Supabase / PostgreSQL

> Postgres schema, Row Level Security, seed data, indexes and ER diagram for
> the Khang Chinese Restaurant.

**The source of truth lives in [`/supabase`](../supabase/).** This folder is
the documentation and the operational scripts around it.

```
supabase/                        ← source of truth (applied by the CLI)
├── config.toml                  # local stack + per-function JWT settings
├── migrations/
│   ├── 20260101000000_initial_schema.sql     # tables, enums, indexes
│   ├── 20260101000100_functions_triggers.sql # triggers, auth hook
│   ├── 20260101000200_api_functions.sql      # RPC "endpoints"
│   └── 20260101000300_rls_policies.sql       # Row Level Security
├── seed.sql                     # 5 categories · 17 dishes · admin user
└── functions/                   # Deno Edge Functions (payments, notifications)

database/                        ← you are here
├── README.md
├── docs/
│   ├── ER-DIAGRAM.md            # tables, columns, foreign keys
│   ├── INDEXES.md               # every index and why it exists
│   └── RLS-POLICIES.md          # the authorisation model
└── scripts/
    ├── reset.sh                 # rebuild the local DB from migrations + seed
    └── backup.sh                # pg_dump / `supabase db dump` helper
```

## 🚀 Quick setup

### Option A — Local stack (Docker, via the Supabase CLI)

```bash
npm install -g supabase        # or: brew install supabase/tap/supabase
supabase start                 # Postgres + Auth + PostgREST + Studio + Storage
supabase db reset              # applies migrations/ then seed.sql
```

| Service | URL |
|---|---|
| API (PostgREST) | http://127.0.0.1:54321 |
| Studio (GUI) | http://127.0.0.1:54323 |
| Inbucket (catches emails) | http://127.0.0.1:54324 |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

`supabase start` prints the local `anon` key — put it in `.env` as
`VITE_SUPABASE_ANON_KEY`.

### Option B — Hosted project (free tier)

1. Create a project at <https://supabase.com/dashboard>
2. Link and push:

```bash
supabase link --project-ref <your-project-ref>
supabase db push                                    # runs every migration
psql "$SUPABASE_DB_URL" -f supabase/seed.sql        # optional: load the menu
```

3. Copy **Project URL** and **anon public** key from
   *Project Settings → API* into `.env`.

## 🔐 Security model

Authorisation is in the database, not in a middleware function, so it holds
for every client — web, mobile, curl.

| Old Express middleware | New Postgres equivalent |
|---|---|
| `protect` (verify JWT) | Supabase Auth + `auth.uid()` inside RLS policies |
| `adminOnly` | `public.is_admin()` used by policies and RPCs |
| "never trust client prices" comment | `create_order()` is `SECURITY DEFINER` and there is **no INSERT policy** on `orders` |
| bcrypt hashing in a model hook | `auth.users.encrypted_password`, managed by Supabase |

See [`docs/RLS-POLICIES.md`](docs/RLS-POLICIES.md) for the full policy list.

## 📊 Tables

| Table | Rows (seed) | Key constraints |
|---|---|---|
| `profiles` | 1 (admin) | PK → `auth.users(id)`, unique `lower(email)` |
| `categories` | 5 | unique `name`, unique `slug` |
| `products` | 17 | unique `slug`, unique `code`, FK → `categories` |
| `orders` | 0 | unique `order_number`, FK → `profiles` |
| `order_items` | 0 | FK → `orders` (cascade), FK → `products` (set null) |
| `order_tracking` | 0 | FK → `orders` (cascade) |
| `reviews` | 0 | unique `(user_id, product_id)` |
| `favourites` | 0 | PK `(user_id, product_id)` |

## 🧩 RPC "endpoints"

Called from the browser with `supabase.rpc(...)`:

| Function | Replaces | Who can call it |
|---|---|---|
| `create_order(items, address, customer, payment_method)` | `POST /api/orders` | authenticated |
| `track_order(order_number)` | `GET /api/orders/track/:id` | anyone (anon) |
| `set_order_status(order_id, status, note)` | `PUT /api/orders/:id/status` | admin |
| `submit_review(product, rating, text, location)` | `POST /api/reviews` | authenticated |
| `toggle_favourite(product)` | — | authenticated |
| `admin_order_stats()` | dashboard header | admin |
| `mark_order_paid(...)` | payment capture | `service_role` only |

## 🔁 Day-to-day commands

```bash
npm run db:start       # supabase start
npm run db:reset       # re-apply migrations + seed  (destroys local data)
npm run db:push        # push migrations to the linked hosted project
npm run db:types       # regenerate src/types/database.types.ts
./database/scripts/backup.sh    # dump the database
```

### Creating a new migration

```bash
supabase migration new add_loyalty_points
# edit supabase/migrations/<timestamp>_add_loyalty_points.sql
supabase db reset      # verify locally
supabase db push       # ship it
```

Never edit an already-pushed migration — add a new one.

## 👤 Admin account

`supabase/seed.sql` creates a real Supabase Auth user:

```
admin@khang.com / admin123     ⚠ change this before going live
```

On a hosted project, create the user in
*Dashboard → Authentication → Users* and then promote it:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```
