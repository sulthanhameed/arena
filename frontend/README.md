# 🎨 Khang Frontend

> React 19 · TypeScript · Vite · Tailwind CSS v4 — single-page food-ordering UI for Khang Chinese Restaurant.

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
    │   ├── AuthModal.tsx           # Sign in + Sign up
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
    │   ├── AuthContext.tsx         # JWT + localStorage + role
    │   └── CartContext.tsx         # Items + auto-calc totals
    │
    ├── lib/                 # ★ Backend integration
    │   ├── api.ts                  # Typed REST client
    │   ├── razorpay.ts             # Razorpay SDK loader
    │   └── payments.ts             # Payment orchestrator
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
VITE_API_URL=http://localhost:5000/api   # backend URL
```

If `VITE_API_URL` is unset or the backend is offline, the app gracefully
falls back to offline demo mode (simulated auth, generated order IDs).

## 🎨 Tech Stack

| Layer | Tech |
|---|---|
| Framework | **React 19** + TypeScript 5.9 |
| Build | **Vite 7** + `vite-plugin-singlefile` |
| Styling | **Tailwind CSS v4** with `@theme` tokens |
| State | React Context (no Redux needed) |
| Animations | Custom CSS + IntersectionObserver (no Framer Motion) |
| Payments | Razorpay JS SDK + Stripe Elements (via backend) |
| Fonts | Playfair Display · Outfit · Manrope · Space Grotesk · Ma Shan Zheng |

## 💳 Payment Integration (Frontend)

| File | Role |
|---|---|
| `src/lib/api.ts` | Typed fetch wrapper for all 20+ backend endpoints. JWT attached automatically from `localStorage`. |
| `src/lib/razorpay.ts` | Lazy-loads `checkout.razorpay.com/v1/checkout.js` and opens the Razorpay popup with theme + prefilled customer info. |
| `src/lib/payments.ts` | High-level `runCheckout()` orchestrator: creates the backend order → opens gateway → verifies signature → returns success. |
| `src/components/CheckoutModal.tsx` | UI with form, payment method picker, processing state, error display, success screen. |

### Frontend payment flow

```
User clicks "Pay ₹450 Securely →"
    ↓
runCheckout()  in src/lib/payments.ts
    ↓
ordersApi.create()       → POST /api/orders          → pending order
    ↓
paymentsApi.createRazorpayOrder()  → POST /api/payments/razorpay/create-order
    ↓
openRazorpayCheckout()   → loads Razorpay popup
    ↓
User pays (test card: 4111 1111 1111 1111, OTP: 1234)
    ↓
handler({ razorpay_payment_id, signature })
    ↓
paymentsApi.verifyRazorpay()  → POST /api/payments/razorpay/verify
    ↓
✅ success → show Order ID + clear cart
```

## 📦 Deploy

```bash
# Vercel (auto-detects Vite config)
vercel --prod

# Or any static host — the build outputs a single self-contained
# dist/index.html (~100 KB gzipped, CSS + JS inlined)
```

See `../vercel.json` for production headers.
