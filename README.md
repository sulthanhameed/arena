# 🏮 Khang Chinese Restaurant & Dimsum

A React food-ordering storefront backed entirely by **Supabase** — Postgres,
Auth, Row Level Security, and Edge Functions.

`康 · Khang · Chinese · Dimsum`

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Authentication | Supabase Auth (email/password + JWT session) |
| Database | Supabase Postgres |
| Secure backend | Supabase Edge Function: `api` |
| Data protection | Postgres constraints, RLS, server-only RPCs |
| Payments | Razorpay in the Edge Function; optional Stripe intent/webhook route |
| Hosting | Any static host for Vite + Supabase for backend/database |

## Supabase architecture

- **One hosted backend** — Postgres, Auth, and the Edge Function are deployed together in Supabase.
- **Relational data model** — versioned Postgres migrations and menu seed data live in `supabase/`.
- **Managed sessions** — Supabase Auth creates and refreshes user sessions.
- **No browser payment secrets** — the Edge Function computes totals, creates gateway orders,
  verifies signatures, and enforces admin roles.

## Project layout

```text
.
├── src/                              # React storefront
│   ├── context/AuthContext.tsx        # Supabase-backed session state
│   └── lib/
│       ├── supabase.ts                # browser Supabase client
│       ├── api.ts                     # typed Edge Function client
│       └── payments.ts                # Razorpay checkout flow
├── supabase/
│   ├── migrations/                    # Postgres schema, RLS, RPCs, triggers, initial menu seed
│   ├── seed.sql                       # repeatable local menu seed (5 categories, 17 products)
│   └── functions/api/index.ts         # secure Edge Function API
├── .env.example                       # public Vite values only
└── package.json
```

## Quick start

### 1. Create and deploy Supabase backend

See the complete deployment guide in [`supabase/README.md`](./supabase/README.md).
The shortest production path is:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npx supabase functions deploy api --no-verify-jwt
```

Set your Edge Function secrets before accepting online payments:

```bash
npx supabase secrets set \
  ALLOWED_ORIGINS=https://your-frontend.example \
  RAZORPAY_KEY_ID=rzp_test_xxx \
  RAZORPAY_KEY_SECRET=your_razorpay_secret \
  RAZORPAY_WEBHOOK_SECRET=your_razorpay_webhook_secret
```

### 2. Configure the frontend

```bash
cp .env.example .env.local
```

Fill in the two browser-safe values from **Supabase Dashboard → Project Settings → API**:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Then run the storefront:

```bash
npm install
npm run dev
npm run build
```

Without those two public variables the visual storefront still opens in local
demo mode, but it does not create real accounts, orders, or payments.

### 3. Make an account an admin

Create the account through the site or Supabase Auth, then run this once in
Supabase SQL Editor:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'owner@example.com');
```

There is intentionally no seeded production admin password.

## Database model

The migration creates these Postgres tables:

- `profiles` — one row per `auth.users` account, with a database role
- `categories` and `products` — public menu data
- `orders`, `order_items`, and `order_tracking` — immutable item snapshots and delivery state
- `reviews` — one review per user/product

`create_restaurant_order(...)` runs inside Postgres and recalculates item
prices, tax (5%), delivery (free above ₹500), order code, snapshots, and first
tracking event atomically. Client-submitted totals are never trusted.

## Security

- RLS allows public reads only for in-stock menu products, categories, and reviews.
- Orders, tracking, and payment metadata have no browser table policy.
- The `api` Edge Function validates every authenticated request with Supabase Auth.
- Admin permissions are read from `profiles.role`, never from frontend state.
- Razorpay and Stripe webhook signatures are verified in the Edge Function.
- `SUPABASE_SERVICE_ROLE_KEY`, Razorpay secret, and Stripe secret are only Edge Function secrets.

## Payments

The existing checkout UI uses Razorpay for UPI, wallet, and card checkout:

```text
Browser → Supabase Edge Function creates Postgres order
        → Edge Function creates Razorpay order
        → Razorpay popup
        → Edge Function verifies HMAC
        → Postgres marks payment paid
```

Configure webhook targets after deploying the function:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/api/payments/razorpay/webhook
https://YOUR_PROJECT_REF.supabase.co/functions/v1/api/payments/stripe/webhook
```

## Local Supabase development

Docker is required for Supabase's local stack:

```bash
npx supabase start
npx supabase db reset
cp supabase/.env.example supabase/.env
npx supabase functions serve api --env-file supabase/.env
```

Use the local API URL and anon key printed by `supabase start` in `.env.local`,
then run `npm run dev` in another terminal.

## Deploy the frontend

Deploy the Vite build to Vercel, Netlify, Cloudflare Pages, or another static
host. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in that host's
build environment, set the final site URL in Supabase Auth, and add the exact
site origin to the Edge Function's `ALLOWED_ORIGINS` secret.
