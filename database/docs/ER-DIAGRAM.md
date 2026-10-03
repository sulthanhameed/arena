# Entity Relationships — PostgreSQL (Supabase)

Source of truth: [`supabase/migrations/`](../../supabase/migrations/).

The old MongoDB document model was denormalised (arrays embedded inside
`users` and `orders`). In Postgres those arrays become real tables with
foreign keys, so the database can enforce integrity for us.

| Mongo (old) | Postgres (new) |
|---|---|
| `users` collection | `auth.users` (managed by Supabase Auth) + `public.profiles` |
| `users.addresses[]` | `public.addresses` |
| `users.favourites[]` | `public.favourites` (join table) |
| `orders.items[]` | `public.order_items` |
| `orders.tracking[]` | `public.order_tracking` |
| `products.category` (string) | `products.category_id` → `categories.id` |
| text index on products | `products.search_vector` (`tsvector`, GIN) |

## Diagram

```
                    ┌───────────────────────────┐
                    │        auth.users         │  ← Supabase Auth owns this
                    │  id · email · password    │    (bcrypt, MFA, OAuth…)
                    └─────────────┬─────────────┘
                                  │ 1:1  (on insert → handle_new_user trigger)
                                  ▼
┌──────────────────────────────────────────────────────────────┐
│                      public.profiles                         │
├──────────────────────────────────────────────────────────────┤
│ id            uuid         PK → auth.users(id) ON DELETE CASC│
│ name          text         not null                          │
│ email         text         unique (lower)                    │
│ phone         text                                           │
│ role          user_role    'user' | 'admin'                  │
│ avatar_url    text                                           │
│ created_at / updated_at    timestamptz                       │
└───┬───────────────┬────────────────┬─────────────────┬───────┘
    │ 1:M           │ 1:M            │ 1:M             │ 1:M
    ▼               ▼                ▼                 ▼
┌─────────┐   ┌───────────┐   ┌─────────────┐   ┌─────────────┐
│addresses│   │  orders   │   │   reviews   │   │ favourites  │
└─────────┘   └─────┬─────┘   └──────┬──────┘   └──────┬──────┘
                    │                │                 │
       ┌────────────┴────────────┐   │                 │
       ▼                         ▼   ▼                 ▼
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│ order_items  │        │order_tracking│        │   products   │
└──────┬───────┘        └──────────────┘        └──────┬───────┘
       │ M:1                                           │ M:1
       └───────────────────────────────────────────────┤
                                                       ▼
                                              ┌──────────────┐
                                              │  categories  │
                                              └──────────────┘
```

## Tables

### `profiles`
Mirror of `auth.users`, created automatically by the `handle_new_user()`
trigger. **There is no password column** — Supabase Auth stores credentials
in `auth.users`, so the application database never touches them.

### `categories`
| column | type | notes |
|---|---|---|
| `id` | `uuid` | PK |
| `name` | `text` | unique |
| `slug` | `text` | unique, URL key |
| `icon` | `text` | emoji |
| `sort_order` | `integer` | menu ordering |

### `products`
| column | type | notes |
|---|---|---|
| `id` | `uuid` | PK |
| `code` | `text` | unique — legacy menu id (`dim-001`) so the offline menu keeps working |
| `slug` | `text` | unique |
| `category_id` | `uuid` | FK → `categories.id` `ON DELETE RESTRICT` |
| `price` | `numeric(10,2)` | `check (price >= 0)` |
| `ingredients` | `text[]` | native array, no join table needed |
| `rating` / `reviews_count` | `numeric` / `int` | maintained by the `refresh_product_rating()` trigger |
| `search_vector` | `tsvector` | **generated column**, GIN indexed |

### `orders`
| column | type | notes |
|---|---|---|
| `id` | `uuid` | PK |
| `order_number` | `text` | unique, `KH-2026-1042`, from `generate_order_number()` |
| `user_id` | `uuid` | FK → `profiles.id` |
| `customer_name/phone/email` | `text` | snapshot at order time |
| `address` | `jsonb` | snapshot at order time |
| `subtotal`,`tax`,`delivery`,`discount`,`total` | `numeric(10,2)` | **computed in `create_order()`**, never sent by the client |
| `payment_method` | `payment_method` enum | `upi · card · wallet · cod · stripe · razorpay` |
| `payment_gateway` | `payment_gateway` enum | `razorpay · stripe · cod · none` |
| `payment_status` | `payment_status` enum | `pending · paid · failed · refunded` |
| `status` | `order_status` enum | `received · preparing · out_for_delivery · delivered · cancelled` |

### `order_items`
One row per cart line. `line_total` is a **generated column** (`price * qty`),
so a line total can never disagree with its inputs.

### `order_tracking`
Append-only audit trail. Rows are written by triggers
(`add_initial_tracking`, `log_status_change`) — not by the client.

### `reviews`
`unique (user_id, product_id)` replaces the Mongo compound unique index:
one review per diner per dish.

### `favourites`
Composite primary key `(user_id, product_id)` — the relational form of the
old `users.favourites[]` array.

## Enumerated types

```sql
user_role       = 'user' | 'admin'
order_status    = 'received' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled'
payment_status  = 'pending' | 'paid' | 'failed' | 'refunded'
payment_method  = 'upi' | 'card' | 'wallet' | 'cod' | 'stripe' | 'razorpay'
payment_gateway = 'razorpay' | 'stripe' | 'cod' | 'none'
```

These replace the Mongoose `enum:` validators — now the *database* rejects a
bad value, not just the application layer.

## Referential actions

| Relationship | On delete |
|---|---|
| `profiles.id` → `auth.users.id` | `CASCADE` — deleting the auth user removes everything |
| `addresses.user_id` → `profiles.id` | `CASCADE` |
| `orders.user_id` → `profiles.id` | `CASCADE` |
| `order_items.order_id` → `orders.id` | `CASCADE` |
| `order_items.product_id` → `products.id` | `SET NULL` — keep history if a dish is delisted |
| `order_tracking.order_id` → `orders.id` | `CASCADE` |
| `reviews.*` | `CASCADE` |
| `products.category_id` → `categories.id` | `RESTRICT` — can't delete a category still in use |
