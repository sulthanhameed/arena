# 🏮 Khang Backend API

Express + MongoDB + Razorpay/Stripe payment integration for the Khang restaurant frontend.

## Quick Start

```bash
cd backend
cp .env.example .env       # fill in your secrets
npm install
npm run seed               # populate menu + create admin user
npm run dev                # start on http://localhost:5000
```

## Endpoints

### Auth (`/api/auth`)
| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/signup` | — | `{ name, email, password, phone? }` |
| POST | `/login` | — | `{ email, password }` |
| GET | `/me` | ✓ | — |
| PUT | `/me` | ✓ | `{ name, phone, avatarUrl }` |

### Products (`/api/products`)
| Method | Path | Auth |
|---|---|---|
| GET | `/?category=&q=&featured=&sort=` | — |
| GET | `/:slug` | — |
| POST | `/` | admin |
| PUT | `/:id` | admin |
| DELETE | `/:id` | admin |

### Orders (`/api/orders`)
| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/` | ✓ | `{ items, address, customer, paymentMethod }` |
| GET | `/me` | ✓ | — |
| GET | `/:orderId` | ✓ | — |
| GET | `/track/:orderId` | — | (public tracking) |
| PUT | `/:id/status` | admin | `{ status, note }` |
| GET | `/` | admin | — |

### Payments (`/api/payments`)
| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/razorpay/create-order` | ✓ | `{ orderId }` → returns `{ key, razorpayOrderId, amount }` |
| POST | `/razorpay/verify` | ✓ | `{ razorpay_*, orderId }` → verifies HMAC, marks paid |
| POST | `/stripe/create-intent` | ✓ | `{ orderId }` → returns `{ clientSecret }` |
| POST | `/stripe/webhook` | webhook | (raw body) |
| POST | `/refund` | admin | `{ orderId }` |

## Razorpay Setup

1. Sign up at https://razorpay.com → Dashboard → API Keys → Generate Test Key
2. Copy the **Key ID** and **Key Secret** into `.env`:
 ```
 RAZORPAY_KEY_ID=rzp_test_xxx
 RAZORPAY_KEY_SECRET=xxx
 ```
3. The frontend loads the Razorpay Checkout SDK on demand from
 `https://checkout.razorpay.com/v1/checkout.js`. No frontend config needed.
4. Test cards: `4111 1111 1111 1111` / any future expiry / any CVV / OTP `1234`

## Stripe Setup

1. Sign up at https://stripe.com → Developers → API Keys
2. Copy the **Secret Key** and **Publishable Key** into `.env`:
 ```
 STRIPE_SECRET_KEY=sk_test_xxx
 STRIPE_PUBLISHABLE_KEY=pk_test_xxx
 ```
3. For local webhook testing, install the Stripe CLI:
 ```
 stripe listen --forward-to localhost:5000/api/payments/stripe/webhook
 ```
 Copy the printed `whsec_xxx` into `STRIPE_WEBHOOK_SECRET`.
4. Test cards: `4242 4242 4242 4242`

## Folder Structure

```
backend/
├── src/
│   ├── server.js                  # Express bootstrap
│   ├── config/db.js               # MongoDB connection
│   ├── models/                    # Mongoose schemas
│   │   ├── User.js                # Users + addresses + favourites
│   │   ├── Category.js
│   │   ├── Product.js
│   │   ├── Order.js               # Orders + payment + tracking events
│   │   └── Review.js
│   ├── controllers/
│   │   ├── authController.js      # signup, login, me
│   │   ├── productController.js
│   │   ├── orderController.js
│   │   └── paymentController.js   # ★ Razorpay + Stripe ★
│   ├── routes/                    # Express routers
│   ├── middleware/
│   │   ├── auth.js                # JWT protect + adminOnly
│   │   └── errorHandler.js
│   ├── utils/
│   │   ├── generateToken.js       # JWT signing
│   │   ├── generateOrderId.js     # KH-YYYY-XXXX
│   │   └── notifications.js       # Nodemailer + Twilio
│   └── scripts/seed.js            # Seed menu + admin user
├── .env.example
└── package.json
```

## Tech

- **Node.js 18+** with ES modules
- **Express 4** — REST API
- **Mongoose 8** — MongoDB ODM
- **bcryptjs** — password hashing
- **jsonwebtoken** — JWT auth
- **Razorpay SDK + Stripe SDK** — real payment integration
- **Nodemailer + Twilio** — email & SMS confirmations
- **Helmet · CORS · express-rate-limit · Morgan** — security & logging

## Deployment

| Platform | How |
|---|---|
| **Render** | Connect GitHub repo → set env vars → auto-deploy |
| **Railway** | `railway up` → set env vars in dashboard |
| **Fly.io** | `fly launch` → `fly secrets set ...` |
| **Heroku** | `heroku create khang-api` → `git push heroku main` |

For MongoDB hosting use **MongoDB Atlas** (free M0 tier is enough for demos).
