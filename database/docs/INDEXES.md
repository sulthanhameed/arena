# Database Indexes

All indexes are created by the migrations in
[`supabase/migrations/`](../../supabase/migrations/) and are applied by
`supabase db push` (hosted) or `supabase db reset` (local).

Inspect them at any time with:

```sql
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;
```

## `profiles`

| Index | Type | Purpose |
|---|---|---|
| `profiles_pkey` | unique (PK) | `id` — also the FK to `auth.users` |
| `profiles_email_key` | unique on `lower(email)` | case-insensitive uniqueness |
| `profiles_role_idx` | btree | fast `is_admin()` lookups used by every RLS policy |

## `addresses`

| Index | Type | Purpose |
|---|---|---|
| `addresses_user_idx` | btree | "my addresses" |
| `addresses_one_default_per_user` | **partial unique** `where is_default` | at most one default address per user |

## `categories`

| Index | Type | Purpose |
|---|---|---|
| `categories_name_key` | unique | FK target + display |
| `categories_slug_key` | unique | URL routing |
| `categories_sort_order_idx` | btree | menu ordering |

## `products`

| Index | Type | Purpose |
|---|---|---|
| `products_slug_key` | unique | URL routing |
| `products_code_key` | unique | legacy menu ids (`dim-001`) |
| `products_category_idx` | btree | filter menu by category |
| `products_featured_idx` | **partial** `where featured` | homepage signature picks — only indexes the few rows that matter |
| `products_in_stock_idx` | btree | hide sold-out dishes |
| `products_price_idx` | btree | sort by price (low/high) |
| `products_popular_idx` | btree `(rating desc, reviews_count desc)` | "most popular" sort, served straight from the index |
| `products_search_idx` | **GIN on `search_vector`** | full-text search (`?q=…`) |

The old Mongo text index becomes a generated `tsvector` column:

```sql
search_vector tsvector generated always as (
  to_tsvector('english',
    coalesce(name,'') || ' ' || coalesce(chinese_name,'') || ' ' || coalesce(description,''))
) stored
```

Queried from the client with:

```ts
supabase.from("products").textSearch("search_vector", q, { type: "websearch" })
```

## `orders`

| Index | Type | Purpose |
|---|---|---|
| `orders_order_number_key` | unique | `KH-2026-1042` lookup, public tracking |
| `orders_user_recent_idx` | btree `(user_id, created_at desc)` | "my orders", newest first |
| `orders_status_idx` | btree | admin dashboard filters |
| `orders_payment_status_idx` | btree | revenue / unpaid reporting |
| `orders_razorpay_order_idx` | btree | reconcile a Razorpay callback |
| `orders_stripe_intent_idx` | btree | reconcile a Stripe webhook |

## `order_items`

| Index | Type | Purpose |
|---|---|---|
| `order_items_order_idx` | btree | embed items when selecting an order |
| `order_items_product_idx` | btree | "how often is this dish ordered?" |

## `order_tracking`

| Index | Type | Purpose |
|---|---|---|
| `order_tracking_order_idx` | btree `(order_id, created_at)` | timeline in chronological order |

## `reviews`

| Index | Type | Purpose |
|---|---|---|
| `reviews_user_product_key` | **unique** `(user_id, product_id)` | one review per diner per dish |
| `reviews_product_recent_idx` | btree `(product_id, created_at desc)` | reviews under a dish |
| `reviews_user_idx` | btree | "my reviews" |

## `favourites`

| Index | Type | Purpose |
|---|---|---|
| `favourites_pkey` | unique `(user_id, product_id)` | the join itself |
| `favourites_product_idx` | btree | "most favourited dishes" |

---

## Why indexes matter more under RLS

Every RLS policy is a `WHERE` clause bolted onto your query. Policies such as

```sql
using (user_id = auth.uid() or public.is_admin())
```

run on **every row considered**, so the supporting column (`user_id`,
`order_id`, `role`) must be indexed — otherwise Postgres sequential-scans the
table and evaluates the policy row by row. That is why
`orders_user_recent_idx` and `profiles_role_idx` exist.
