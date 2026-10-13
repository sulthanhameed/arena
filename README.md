# 🏮 Khang Chinese Restaurant & Dimsum

> Full-stack food-ordering platform with **React frontend**, **Node.js backend**, **MongoDB database**, and **real Razorpay + Stripe payment integration**.

<div align="center">

`康 · Khang · Chinese · Dimsum`

**Authentic Chinese flavors, crafted fresh.**

[Frontend](#-frontend) · [Backend](#-backend) · [Database](#-database) · [Payments](#-payment-integration) · [Deploy](#-deployment)

</div>

---

## 📁 Project Structure

The repository is organised into **three clearly separated folders**:

```
khang/
│
├── 🎨 frontend/             # React 19 + Vite + Tailwind v4
│   └── README.md            # See for full details
│
├── ⚙️  backend/             # Node.js + Express + Mongoose
│   ├── src/
│   │   ├── server.js                  # Express bootstrap
│   │   ├── config/db.js               # MongoDB connection
│   │   ├── models/                    # 5 Mongoose schemas
│   │   │   ├── User.js
│   │   │   ├── Category.js
│   │   │   ├── Product.js
│   │   │   ├── Order.js
│   │   │   └── Review.js
│   │   ├── controllers/
│   │   │   ├── authController.js      # signup, login, profile
│   │   │   ├── productController.js   # CRUD + search
│   │   │   ├── orderController.js     # Server-side total calc
│   │   │   ├── paymentController.js   # ★ Razorpay HMAC + Stripe
│   │   │   └── reviewController.js
│   │   ├── routes/                    # 5 route files (REST API)
│   │   ├── middleware/
│   │   │   ├── auth.js                # JWT + adminOnly
│   │   │   └── errorHandler.js
│   │   ├── utils/                     # JWT, orderId, email, SMS
│   │   └── scripts/seed.js
│   ├── Dockerfile
│   ├── render.yaml                    # 1-click Render deploy
│   ├── package.json
│   ├── .env.example
│   └── README.md                      # Full API reference
│
├── 🗄  database/            # Schemas, seeds, indexes, ER diagram
│   ├── schema/              # JSON Schema for each collection
│   │   ├── users.schema.json
│   │   ├── categories.schema.json
│   │   ├── products.schema.json
│   │   ├── orders.schema.json
│   │   └── reviews.schema.json
│   ├── seed/                # Initial data
│   │   ├── categories.json  # 5 categories
│   │   ├── products.json    # 18 dishes (full menu)
│   │   └── admin-user.json
│   ├── migrations/
│   │   └── 001-initial.js   # Creates all indexes
│   ├── scripts/
│   │   ├── seed.sh          # Seed via shell
│   │   └── backup.sh        # mongodump → tar.gz
│   ├── docs/
│   │   ├── ER-DIAGRAM.md    # ASCII entity-relationship diagram
│   │   └── INDEXES.md       # All index definitions
│   └── README.md
│
├── 📦 Root build files     # (Vite frontend lives here for build tooling)
│   ├── src/                # → mirrored to frontend/src/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── .env.example
│
├── 🐳 docker-compose.yml    # Full local stack in 1 command
├── ▲  vercel.json           # Frontend deploy config
└── 📖 README.md             # ← you are here
```

---

## 🎨 Frontend

**React 19 · TypeScript · Vite · Tailwind CSS v4**

A single-page application with:

- ✨ **Interactive 5-dish hero swap** — click any dish, it flies to the centre
- 🎬 **Scroll-triggered animations** — text reveals word-by-word, images fade-zoom in
- 🍱 **Editorial menu** — category filter, sort, hairline-bordered cards
- 🛒 **Cart drawer** — auto-calculated subtotal · 5% tax · free delivery > ₹500
- 💳 **Real payment flow** — Razorpay popup, Stripe support
- 👤 **Auth system** — Sign in / Sign up with JWT, persisted via `localStorage`
- 🚚 **Live order tracking** — 4-stage progress with pulsing rings
- 🔍 **Cmd-K search** — searches name, Chinese name, category, description
- ⚡ **Admin dashboard** — order management, revenue stats, status updates

See **[`frontend/README.md`](./frontend/README.md)** for component-level details.

### Quick start (frontend)

```bash
npm install
npm run dev          # → http://localhost:5173
npm run build        # → produces single-file dist/index.html (~100 KB gzipped)
```

---

## ⚙️ Backend

**Node.js (ES Modules) · Express 4 · Mongoose 8**

REST API with **24 endpoints** across auth, products, orders, payments, and reviews.

### Endpoints

| Group | Path | Method | Auth |
|---|---|---|---|
| **Auth** | `/api/auth/signup` `/login` `/me` `/logout` | various | JWT |
| **Products** | `/api/products` `/api/products/:slug` | GET (public), POST/PUT/DELETE (admin) | — / admin |
| **Orders** | `/api/orders` `/api/orders/me` `/api/orders/:id` `/api/orders/track/:id` | various | JWT / public tracking |
| **Payments** | `/api/payments/razorpay/create-order` `/verify` `/stripe/create-intent` `/stripe/webhook` `/refund` | POST | JWT / admin |
| **Reviews** | `/api/reviews` | GET / POST / DELETE | JWT |

See **[`backend/README.md`](./backend/README.md)** for the full endpoint reference.

### Quick start (backend)

```bash
cd backend
cp .env.example .env       # add MONGO_URI + payment keys
npm install
npm run seed               # populate menu + create admin user
npm run dev                # → http://localhost:5000
```

### Tech

- **Express 4** — REST API
- **Mongoose 8** — MongoDB ODM
- **bcryptjs** — password hashing (10 rounds)
- **jsonwebtoken** — JWT auth (HS256, 7d expiry)
- **Razorpay SDK + Stripe SDK** — real payment integration
- **Nodemailer + Twilio** — email & SMS confirmations
- **Helmet · CORS · express-rate-limit · Morgan** — security & logging

---

## 🗄 Database

**MongoDB** (local via Docker, or hosted on MongoDB Atlas)

Five collections (`users`, `categories`, `products`, `orders`, `reviews`)
with full JSON Schema documentation, seed data, indexes, and ER diagram in
**[`database/`](./database/README.md)**.

### Quick start (database)

```bash
# Option 1: Local Mongo via Docker
docker run -d --name khang-mongo -p 27017:27017 mongo:7

# Option 2: MongoDB Atlas — get free M0 cluster at mongodb.com/atlas

# Then seed:
./database/scripts/seed.sh "mongodb://localhost:27017/khang"
```

### Seed data

- **5 categories**: Dim Sum · Noodles & Soups · Rice & Curry · Snacks · Drinks
- **18 products** (full Khang menu with prices, ratings, Chinese names, ingredients)
- **1 admin user**: `admin@khang.com` / `admin123`

See **[`database/docs/ER-DIAGRAM.md`](./database/docs/ER-DIAGRAM.md)** for
the full entity-relationship diagram and **[`database/docs/INDEXES.md`](./database/docs/INDEXES.md)**
for the complete index definitions.

---

## 💳 Payment Integration

**Real payment gateways** — not simulated.

### Supported methods

| Method | Gateway | Use Case |
|---|---|---|
| 📱 **UPI** | Razorpay | GPay, PhonePe, Paytm, BHIM |
| 💳 **Cards** | Razorpay / Stripe | Visa, Mastercard, RuPay, Amex |
| 👛 **Wallets** | Razorpay | Paytm, Mobikwik, Freecharge |
| 💵 **COD** | — | Cash on Delivery |

### End-to-end flow (Razorpay example)

```
1. User clicks "Pay ₹450 Securely →" in Checkout modal
2. Frontend → POST /api/orders  (creates pending order, recalculates totals server-side)
3. Frontend → POST /api/payments/razorpay/create-order
   ← backend returns { razorpayOrderId, amount, key, customer }
4. Frontend loads https://checkout.razorpay.com/v1/checkout.js
5. Razorpay popup opens (pre-filled with customer info, themed green)
6. User pays with test card 4111 1111 1111 1111 (OTP: 1234)
7. Razorpay returns { razorpay_payment_id, signature } to handler
8. Frontend → POST /api/payments/razorpay/verify
9. Backend recomputes HMAC-SHA256 of (order_id|payment_id), compares signature
10. ✅ Order marked "paid" → email + SMS dispatched
11. Frontend shows success screen with Order ID
12. Admin sees the order in dashboard with "PAID" badge
```

### Razorpay setup

1. Sign up at [razorpay.com](https://razorpay.com) (free)
2. Dashboard → **API Keys → Generate Test Key**
3. Add to `backend/.env`:
 ```env
 RAZORPAY_KEY_ID=rzp_test_xxx
 RAZORPAY_KEY_SECRET=your_secret
 ```
4. Test card: `4111 1111 1111 1111` · any future expiry · CVV `123` · OTP `1234`

### Stripe setup

1. Sign up at [stripe.com](https://stripe.com)
2. Dashboard → **Developers → API Keys**
3. Add to `backend/.env`:
 ```env
 STRIPE_SECRET_KEY=sk_test_xxx
 STRIPE_PUBLISHABLE_KEY=pk_test_xxx
 ```
4. For local webhook testing:
 ```bash
 stripe listen --forward-to localhost:5000/api/payments/stripe/webhook
 ```
 Copy the printed `whsec_xxx` into `STRIPE_WEBHOOK_SECRET`
5. Test card: `4242 4242 4242 4242`

### Security

- **HMAC-SHA256 signature verification** on every Razorpay payment (server-side)
- **Stripe webhook signatures** verified via `stripe.webhooks.constructEvent`
- **Server-side total recalculation** — never trusts client-sent prices
- **Idempotent** — duplicate webhook events are safe to receive
- **Refund support** — admin can refund any paid order via `POST /api/payments/refund`

---

## 🚀 Quick Start (Full Stack)

### Prerequisites

- Node.js 18+
- Docker (or MongoDB Atlas)
- Razorpay or Stripe test account (optional — site works in offline demo mode without)

### One-command full stack with Docker

```bash
# (Optional) Create backend/.env with your payment keys first
docker compose up

# In another terminal:
npm install
npm run dev          # → http://localhost:5173
```

That spins up:
- MongoDB on `:27017`
- Backend API on `:5000` (auto-seeded with menu + admin user)
- Frontend on `:5173`

### Manual setup

```bash
# Terminal 1 — Database (or use Atlas)
docker run -d --name khang-mongo -p 27017:27017 mongo:7

# Terminal 2 — Backend
cd backend
cp .env.example .env       # fill in MONGO_URI + payment keys
npm install
npm run seed
npm run dev

# Terminal 3 — Frontend
cp .env.example .env       # adjust VITE_API_URL if needed
npm install
npm run dev
```

Open `http://localhost:5173`. Sign in with `admin@khang.com` / `admin123`
to see the admin dashboard.

---

## 🌐 Deployment

| Layer | Platform | Config |
|---|---|---|
| **Frontend** | Vercel / Netlify / GitHub Pages | `vercel.json` (built-in) |
| **Backend** | Render / Railway / Fly.io / Heroku | `backend/render.yaml` (1-click) |
| **Database** | MongoDB Atlas (free M0 tier) | — |

### Frontend → Vercel

```bash
vercel --prod        # auto-detects Vite config
```

Set env var `VITE_API_URL` to your deployed backend URL.

### Backend → Render

1. Push to GitHub
2. Render dashboard → **New → Blueprint** → select repo
3. Fill in env vars (`MONGO_URI`, `RAZORPAY_*`, `STRIPE_*`)
4. Auto-deploys on every push

### Database → MongoDB Atlas

1. Create a free M0 cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Network Access → Allow from anywhere (`0.0.0.0/0`)
3. Copy connection string → `MONGO_URI` env var
4. Seed: `./database/scripts/seed.sh "<your-atlas-uri>"`

---

## 🔒 Security Summary

- Passwords hashed with **bcrypt** (10 rounds)
- JWT signed with **HS256**, 7-day expiry, stored client-side
- **Razorpay HMAC-SHA256 signature** verified server-side on every payment
- **Stripe webhook signatures** verified via `constructEvent`
- **Server-side total recalculation** prevents price tampering
- **Helmet** sets sane HTTP security headers
- **CORS** restricted to `CLIENT_URL`
- **Rate limit** of 300 req / 15min per IP
- **Sensitive fields** stripped from JSON responses (`password`)
- **Role-based access** (`user` / `admin`) on protected routes

---

## 📜 License

MIT — free to use as a starting point for your own restaurant.

## 🙏 Credits

- **Imagery & video** — [Pexels](https://www.pexels.com)
- **Fonts** — [Google Fonts](https://fonts.google.com): Playfair Display, Outfit, Manrope, Space Grotesk, Ma Shan Zheng
- **Payments** — [Razorpay](https://razorpay.com) · [Stripe](https://stripe.com)
- **Inspired by** Khang Restaurant ([@khang.resto](https://www.instagram.com/khang.resto))

---

<div align="center">

`康` · *Food made with patience tastes of love.* · `福`

</div>
