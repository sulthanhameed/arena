# 🎨 Khang Frontend

> React 19 · TypeScript · Vite · Tailwind CSS v4 — single-page food-ordering UI
> for Khang Chinese Restaurant, talking directly to **Supabase**
> (Postgres + RLS, Auth, Realtime, Edge Functions).

## 📁 Folder Layout

> ⚠ **Note**: For Vite to bundle correctly with `vite-plugin-singlefile`, the
> actual frontend source lives at the **project root** (`/src`, `/index.html`,
> `/vite.config.ts`, `/package.json`). This `frontend/` folder mirrors the
> same logical structure for documentation purposes.
>
> The mapping is:
>
> | Logical | Actual path |
> |---|---|
> | `frontend/src/` | `../src/` |
> | `frontend/index.html` | `../index.html` |
> | `frontend/package.json` | `../package.json` |
> | `frontend/vite.config.ts` | `../vite.config.ts` |
> | `frontend/.env.example` | `../.env.example` |
> | `frontend/vercel.json` | `../vercel.json` |

```
frontend/
├── README.md                ← you are here
├── public/                  (optional static assets folder)
└── src/                     (mirrors ../src)
    ├── App.tsx              # Root: providers + section composition
    ├── main.tsx             # React 19 mount
    ├── index.css            # Tailwind v4 @theme tokens + animations
    │
    ├── components/          # 22 UI components
    │   ├── Navbar.tsx
    │   ├── Hero.tsx                # Interactive 5-dish swap
    │   ├── FeaturedCarousel.tsx
    │   ├── MenuSection.tsx
    │   ├── Categories.tsx
    │   ├── FoodCard.tsx
    │   ├── FoodDetailModal.tsx
    │   ├── CartDrawer.tsx
    │   ├── CheckoutModal.tsx       # ★ Real payment flow
    │   ├── AuthModal.tsx           # Sign in + Sign up (Supabase Auth)
    │   ├── UserMenu.tsx            # Profile dropdown
    │   ├── AdminDashboard.tsx      # ★ Order management
    │   ├── SearchModal.tsx
    │   ├── ScrollProgressBar.tsx
    │   ├── SectionHeading.tsx
    │   ├── Reveal.tsx              # Scroll-trigger reveals
    │   ├── RevealText.tsx          # Word-by-word reveal
    │   ├── TopFoods.tsx
    │   ├── PromoVideo.tsx          # About section with video
    │   ├── ChefSurprise.tsx
    │   ├── OrderTracking.tsx
    │   ├── Reviews.tsx
    │   ├── Footer.tsx
    │   ├── Icons.tsx               # Inline SVG icons
    │   └── decor/
    │       ├── Lantern.tsx
    │       └── GoldDivider.tsx
    │
    ├── context/             # Global state via React Context
    │   ├── AuthContext.tsx         # ★ Supabase Auth session + profile + role
    │   └── CartContext.tsx         # Items + auto-calc totals
    │
    ├── lib/                 # ★ Supabase integration
    │   ├── supabase.ts             # The single Supabase client
    │   ├── api.ts                  # Typed data layer (PostgREST · RPC · Functions)
    │   ├── payments.ts             # Checkout orchestrator
    │   └── razorpay.ts             # Razorpay widget loader
    │
    ├── types/
    │   └── database.types.ts       # Generated: npm run db:types
    │
    ├── hooks/
    │   └── useScrollReveal.ts      # IntersectionObserver wrapper
    │
    ├── data/
    │   └── menu.ts                 # Fallback menu (used offline)
    │
    └── utils/
        └── cn.ts                   # className merge helper
```

## 🚀 Run

```bash
# from the repository root (because Vite reads files from there)
cd ..
npm install
npm run dev          # → http://localhost:5173
npm run build        # → produces single-file dist/index.html
```

## 🔧 Environment Variables (`.env`)

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Running the local stack instead? Use the values `supabase start` prints:

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<local anon key>
```

The anon key is **public by design** — every table is protected by Row Level
Security, so on its own it only exposes the menu. Never put the
`service_role` key here; it belongs in Edge Function secrets
(`supabase/.env`).

If both variables are unset, the app gracefully falls back to offline demo
mode (static menu, simulated auth, generated order IDs) — `isSupabaseConfigured`
in `src/lib/supabase.ts` is the switch.

## 🎨 Tech Stack

| Layer | Tech |
|---|---|
| Framework | **React 19** + TypeScript 5.9 |
| Build | **Vite 7** + `vite-plugin-singlefile` |
| Styling | **Tailwind CSS v4** with `@theme` tokens |
| State | React Context (no Redux needed) |
| Backend | **Supabase** — Postgres + RLS, Auth, Realtime, Edge Functions |
| Animations | Custom CSS + IntersectionObserver (no Framer Motion) |
| Payments | Razorpay JS SDK + Stripe (via Supabase Edge Functions) |
| Fonts | Playfair Display · Outfit · Manrope · Space Grotesk · Ma Shan Zheng |

## 🔌 Supabase Integration (Frontend)

| File | Role |
|---|---|
| `src/lib/supabase.ts` | Creates the one `SupabaseClient`. Sessions persist and auto-refresh; `isSupabaseConfigured` drives offline demo mode. |
| `src/lib/api.ts` | Typed data layer: `authApi`, `productsApi`, `reviewsApi`, `ordersApi`, `adminApi`, `paymentsApi`. Maps snake_case rows onto the UI's shapes. |
| `src/context/AuthContext.tsx` | Restores the session on mount, subscribes to `onAuthStateChange`, loads the matching `profiles` row (incl. `role`). |
| `src/lib/razorpay.ts` | Lazy-loads `checkout.razorpay.com/v1/checkout.js` and opens the popup, themed and pre-filled. |
| `src/lib/payments.ts` | High-level `runCheckout()`: `rpc('create_order')` → Edge Function → gateway → verification. |
| `src/components/CheckoutModal.tsx` | Form, payment-method picker, processing state, error display, success screen. |
| `src/components/AdminDashboard.tsx` | Admin order table — reads orders directly (RLS allows admins) and live-updates over Supabase Realtime. |
| `src/components/OrderTracking.tsx` | Public tracking via the `track_order()` RPC — no sign-in required. |

### No REST client, no tokens to juggle

```ts
// menu — straight from Postgres, filtered by RLS
const dishes = await productsApi.list({ category: "Dim Sum", sort: "popular" });

// order history — RLS limits rows to the signed-in user automatically
const mine = await ordersApi.mine();

// full-text search over the generated tsvector column
const results = await productsApi.list({ q: "spicy chicken" });
```

`supabase-js` attaches the access token to every request and refreshes it in
the background, so there is no `localStorage` token handling left in the app.

### Frontend payment flow

```
User clicks "Pay ₹609 Securely →"
    ↓
runCheckout()  in src/lib/payments.ts
    ↓
ordersApi.create()  → supabase.rpc('create_order')
                      ↳ Postgres prices the cart, returns KH-2026-1042
    ↓
paymentsApi.createRazorpayOrder()
                    → functions.invoke('razorpay-create-order')
    ↓
openRazorpayCheckout()   → Razorpay popup
    ↓
User pays (test card: 4111 1111 1111 1111, OTP: 1234)
    ↓
handler({ razorpay_payment_id, signature })
    ↓
paymentsApi.verifyRazorpay()
                    → functions.invoke('razorpay-verify')
                      ↳ HMAC check → mark_order_paid() → email + SMS
    ↓
✅ success → show Order ID + clear cart
```

Cash on delivery skips steps 3-7 and calls `notify-order` instead.

## 📦 Deploy

```bash
# Vercel (auto-detects Vite config)
vercel --prod

# Or any static host — the build outputs a single self-contained
# dist/index.html (CSS + JS inlined)
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the host's
environment settings, and add the deployed origin to
*Supabase → Authentication → URL Configuration* so magic links and email
confirmations redirect back correctly.

See `../vercel.json` for production headers.
