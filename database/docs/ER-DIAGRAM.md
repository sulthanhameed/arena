# Entity Relationships

```
┌──────────────────────────────────────────────────────────────┐
│                          USERS                               │
├──────────────────────────────────────────────────────────────┤
│ _id              ObjectId                       (PK)         │
│ name             String                                      │
│ email            String      uniq, lowercase                 │
│ phone            String                                      │
│ password         String      bcrypt hashed                   │
│ role             "user"│"admin"                              │
│ addresses        Address[]   embedded                        │
│ favourites       ObjectId[]  → Products                      │
│ avatarUrl        String                                      │
└──────────────────────────────────────────────────────────────┘
        │                                            ▲
        │ (1)                                  (M)   │
        │ owns                                       │
        ▼                                            │
┌──────────────────────────────────────────────────────────────┐
│                         ORDERS                               │
├──────────────────────────────────────────────────────────────┤
│ _id                  ObjectId                   (PK)         │
│ orderId              String     "KH-YYYY-XXXX"  uniq         │
│ user                 ObjectId   → Users         (FK)         │
│ items                OrderItem[] (embedded)                  │
│   ├─ product         ObjectId   → Products      (FK)         │
│   ├─ name            String     (snapshot)                   │
│   ├─ price           Number     (snapshot)                   │
│   └─ qty             Number                                  │
│ customer             { name, phone, email }                  │
│ address              { line1, city, state, pincode }         │
│ subtotal             Number                                  │
│ tax                  Number     (5% of subtotal)             │
│ delivery             Number     (free > ₹500)                │
│ total                Number                                  │
│ payment              {                                       │
│   method             "upi"│"card"│"wallet"│"cod"             │
│   gateway            "razorpay"│"stripe"│"cod"               │
│   status             "pending"│"paid"│"failed"│"refunded"    │
│   razorpayOrderId    String                                  │
│   razorpayPaymentId  String                                  │
│   razorpaySignature  String     (HMAC verified)              │
│   stripePaymentIntentId  String                              │
│   paidAt             Date                                    │
│ }                                                            │
│ status               "received"│"preparing"│                 │
│                      "out_for_delivery"│"delivered"          │
│ tracking             { stage, note, at }[]                   │
└──────────────────────────────────────────────────────────────┘
                       │
                       │ (M)
                       │ references
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                        PRODUCTS                              │
├──────────────────────────────────────────────────────────────┤
│ _id              ObjectId                       (PK)         │
│ slug             String        URL-friendly uniq             │
│ name             String                                      │
│ chineseName      String        中文                          │
│ category         String        denorm. for fast filtering    │
│ price            Number        ₹                             │
│ description      String                                      │
│ ingredients      String[]                                    │
│ image            String        Pexels/CDN URL                │
│ rating           Number        avg from reviews              │
│ reviewsCount     Number        auto-updated                  │
│ spicy            0│1│2│3                                     │
│ veg              Boolean                                     │
│ featured         Boolean       hero showcase                 │
│ prepTime         String        "15 min"                      │
└──────────────────────────────────────────────────────────────┘
        ▲                                            ▲
        │                                            │
        │ (M)                                        │ (M)
        │                                            │
┌──────────────────┐                       ┌──────────────────┐
│   CATEGORIES     │                       │     REVIEWS      │
├──────────────────┤                       ├──────────────────┤
│ _id              │                       │ _id              │
│ name      uniq   │                       │ user      → User │
│ slug      uniq   │                       │ product   → Prod │
│ icon      emoji  │                       │ rating    1–5    │
│ sortOrder        │                       │ text             │
└──────────────────┘                       │ userName         │
                                           │ location         │
                                           │ verified         │
                                           │                  │
                                           │ Unique:          │
                                           │ (user, product)  │
                                           └──────────────────┘
```

## Cardinality

| Relationship | Type | Notes |
|---|---|---|
| User → Orders | 1 : M | A user can have many orders |
| Order → Products | M : N | Through embedded `items[]` |
| Category → Products | 1 : M | Denormalised by name string |
| User → Reviews | 1 : M | One per product max |
| Product → Reviews | 1 : M | Aggregated into `rating` + `reviewsCount` |

## Denormalisation choices

1. **Order items snapshot** name + price at order time, so historical orders
 stay readable even if a product changes price or is deleted.
2. **Products store `category` as a string** (not an FK) for fast filter
 queries. Categories are small and stable enough that a join isn't needed.
3. **Product rating + reviewsCount** are pre-computed aggregates updated
 by the review controller after each new review.
