# Khang Supabase backend

This directory is the complete backend for Khang:

- **Supabase Postgres** — menu, profiles, orders, order items, tracking, and reviews
- **Supabase Auth** — email/password sessions and JWTs
- **Row Level Security** — public reads are limited to menu/reviews; browser writes are blocked
- **`api` Edge Function** — protected orders, payment verification, admin actions, and webhooks

There is no separate application server to deploy.

## Files

```text
supabase/
├── config.toml                         # local CLI/Auth/Edge Function settings
├── migrations/
│   ├── 20261015000000_initial_schema.sql
│   └── 20261015000001_seed_menu.sql    # applied by `supabase db push`
├── seed.sql                            # repeatable local menu upsert
├── .env.example                        # Edge Function secret template
└── functions/
    └── api/
        └── index.ts                    # Supabase Edge API
```

The product IDs in `seed.sql` deliberately match the IDs in `src/data/menu.ts`.
That makes the existing cart send valid product IDs while the server still
recalculates every order total from Postgres prices.

## Deploy to a Supabase project

1. Create a project in [Supabase](https://supabase.com/dashboard), then install
   or run the CLI with `npx supabase`.
2. Authenticate and link this checkout:

   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```

3. Apply the schema and seeded menu:

   ```bash
   npx supabase db push
   ```

   For a local database instead, run `npx supabase start` followed by
   `npx supabase db reset`.

4. Set function secrets. Do **not** add service-role or gateway secrets to the
   Vite `.env` file:

   ```bash
   npx supabase secrets set \
     ALLOWED_ORIGINS=https://your-frontend.example \
     RAZORPAY_KEY_ID=rzp_test_xxx \
     RAZORPAY_KEY_SECRET=your_razorpay_secret \
     RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
   ```

   Add the Stripe values too only if you use the Stripe intent endpoint:

   ```bash
   npx supabase secrets set \
     STRIPE_SECRET_KEY=sk_test_xxx \
     STRIPE_PUBLISHABLE_KEY=pk_test_xxx \
     STRIPE_WEBHOOK_SECRET=whsec_xxx
   ```

5. Deploy the secure API function:

   ```bash
   npx supabase functions deploy api --no-verify-jwt
   ```

JWT verification is intentionally handled inside `api`: public menu and
signed gateway webhooks must reach it without a customer JWT, while each
protected route calls Supabase Auth to validate the bearer token.

### Edge API surface

The function preserves the storefront's REST-style interface at
`/functions/v1/api`:

| Area | Routes | Access |
| --- | --- | --- |
| Profile | `GET` / `PUT /auth/me` | signed-in user |
| Menu | `GET /products`, `GET /products/:slug`; product mutations | public read / admin write |
| Reviews | `GET /reviews`, `POST /reviews`, `DELETE /reviews/:id` | public read / owner or admin write |
| Orders | create, mine, single, public tracking, status update, all orders | customer/admin as appropriate |
| Payments | Razorpay create/verify/webhook, Stripe intent/webhook, refund | signed-in/admin/webhook signature |

6. Set these **public** frontend variables in your web host, then redeploy the
   Vite frontend:

   ```env
   VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

   Find both in **Supabase Dashboard → Project Settings → API**. The anon key
   is designed for browser use; the service-role key is not.

## First admin

For safety, no known admin password is seeded. Create or sign in with the
intended account, then run this once in **Supabase SQL Editor**:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'owner@example.com');
```

The Edge Function checks this database role before it returns all orders,
changes an order status, edits menu data, or processes a refund.

## Payments and webhooks

The browser never receives `RAZORPAY_KEY_SECRET`, Stripe secret keys, or the
Supabase service role. Razorpay order creation and HMAC verification occur in
the Edge Function.

After deployment, use these HTTPS endpoints in gateway dashboards:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/api/payments/razorpay/webhook
https://YOUR_PROJECT_REF.supabase.co/functions/v1/api/payments/stripe/webhook
```

Configure the matching webhook secrets with `supabase secrets set`. Razorpay
checkout currently powers UPI, wallet, and the card option in the storefront;
the Stripe intent route remains available for a Stripe Elements integration.

## Local development

```bash
# Terminal 1: Supabase's local stack (Docker required)
npx supabase start
npx supabase db reset

# Terminal 2: Edge Function
cp supabase/.env.example supabase/.env
# Fill any payment test values you want to use.
npx supabase functions serve api --env-file supabase/.env

# Terminal 3: frontend
cp .env.example .env.local
# Use the local URL/key printed by `supabase start`.
npm install
npm run dev
```

For local email/password testing, `config.toml` disables email confirmation.
Enable confirmation and configure production redirect URLs/templates in the
Supabase dashboard before launch.

## Security model

| Resource | Browser access | Mutation path |
| --- | --- | --- |
| Categories, in-stock products, reviews | public read | admin Edge Function |
| Profile | owner read | authenticated Edge Function |
| Orders, items, tracking | no direct table access | authenticated Edge Function |
| Payment metadata | no direct table access | authenticated/admin Edge Function or signed webhook |

`create_restaurant_order` and `update_restaurant_order_status` are
server-only Postgres RPCs. This keeps an order, its item snapshots, computed
totals, and first tracking event atomic in one transaction.
