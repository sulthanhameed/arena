# 🎨 Khang Frontend

> React 19 · TypeScript · Vite · Tailwind CSS v4 · Supabase Auth + Edge API

The actual Vite source lives at the repository root (`/src`, `/index.html`,
`/package.json`). This folder documents that logical frontend boundary.

## Backend connection

The app does **not** call a standalone server. It uses:

- `src/lib/supabase.ts` for Supabase Auth and session storage
- `src/lib/api.ts` for `https://<project>.supabase.co/functions/v1/api`
- `supabase/functions/api/index.ts` for orders, payments, reviews, and admin actions

Create `.env.local` from the repository root's `.env.example`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Both values are public browser values from **Supabase Dashboard → Project
Settings → API**. Never put a service-role key or payment secret in this file.

## Run

```bash
# from the repository root
npm install
npm run dev
npm run build
```

Without the public Supabase variables, the page remains available as a visual
demo. Once variables are present, authentication and checkout use the real
Supabase project and errors are shown instead of silently creating demo orders.

## Key integration files

| File | Responsibility |
| --- | --- |
| `src/context/AuthContext.tsx` | Restores Supabase sessions; calls Supabase Auth for sign-in/sign-up/sign-out. |
| `src/lib/supabase.ts` | Lazy, browser-safe Supabase client. |
| `src/lib/api.ts` | Typed client for the `api` Edge Function; passes current Supabase access JWT. |
| `src/lib/payments.ts` | Creates orders and verifies Razorpay via the Edge Function. |
| `src/components/AdminDashboard.tsx` | Lists and updates orders through role-protected Edge routes. |
| `src/components/CheckoutModal.tsx` | Requires a real session for configured Supabase checkout. |

## Deployment

Deploy the Vite build to any static host. Set `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` in its build settings, then add the final site URL to:

1. **Supabase Auth → URL Configuration** (`site_url` and redirect URLs)
2. The Edge Function `ALLOWED_ORIGINS` secret

For database migrations, Edge Function deployment, admin bootstrap, and payment
webhook setup, use [`../supabase/README.md`](../supabase/README.md).
