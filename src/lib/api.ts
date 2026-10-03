/**
 * Typed data layer for the Khang app — Supabase edition.
 *
 * Everything that used to be a REST call to the Express server is now either
 * a PostgREST query, a Postgres RPC, or a Supabase Edge Function:
 *
 *   OLD (Express/Mongo on Render)        NEW (Supabase)
 *   ─────────────────────────────────    ─────────────────────────────────────
 *   POST /api/auth/signup                supabase.auth.signUp()
 *   POST /api/auth/login                 supabase.auth.signInWithPassword()
 *   GET  /api/auth/me                    supabase.auth.getUser() + profiles
 *   GET  /api/products                   from('products').select()
 *   GET  /api/products/:slug             from('products').select().eq('slug')
 *   POST /api/orders                     rpc('create_order')
 *   GET  /api/orders/me                  from('orders').select()   [RLS]
 *   GET  /api/orders/track/:id           rpc('track_order')
 *   PUT  /api/orders/:id/status          rpc('set_order_status')   [admin]
 *   POST /api/reviews                    rpc('submit_review')
 *   POST /api/payments/*                 functions.invoke('razorpay-*' | 'stripe-*')
 */
import { errorMessage, supabase } from "./supabase";
import type {
  Json,
  OrderStatus,
  PaymentGateway,
  PaymentMethod,
  PaymentStatus,
  UserRole,
} from "../types/database.types";
import type { Category, FoodItem } from "../data/menu";

// ─── Types ────────────────────────────────────────────────────

export interface KhangProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
}

export interface KhangProduct {
  id: string;
  code: string | null;
  slug: string;
  name: string;
  chinese_name: string | null;
  category: string;
  price: number;
  rating: number;
  reviews_count: number;
  description: string;
  ingredients: string[];
  image: string;
  spicy: number;
  veg: boolean;
  featured: boolean;
  prep_time: string;
  in_stock: boolean;
}

export interface KhangReview {
  id: string;
  rating: number;
  text: string;
  user_name: string | null;
  location: string | null;
  verified: boolean;
  created_at: string;
}

export interface KhangOrderItem {
  id?: string;
  product_id: string | null;
  name: string;
  chinese_name?: string | null;
  image?: string | null;
  price: number;
  qty: number;
  line_total?: number;
}

export interface KhangTrackingEvent {
  stage: OrderStatus;
  note: string | null;
  at: string;
}

export interface KhangOrder {
  id: string;
  order_number: string;
  user_id?: string;
  customer: { name?: string | null; phone?: string | null; email?: string | null };
  address: Record<string, string>;
  subtotal: number;
  tax: number;
  delivery: number;
  discount: number;
  total: number;
  status: OrderStatus;
  payment: {
    method: PaymentMethod;
    gateway: PaymentGateway;
    status: PaymentStatus;
    paid_at: string | null;
  };
  estimated_delivery: string | null;
  delivered_at: string | null;
  created_at: string;
  items: KhangOrderItem[];
  tracking: KhangTrackingEvent[];
}

export interface KhangTracking {
  order_number: string;
  status: OrderStatus;
  total: number;
  customer_name: string | null;
  estimated_delivery: string | null;
  delivered_at: string | null;
  created_at: string;
  payment_status: PaymentStatus;
  tracking: KhangTrackingEvent[];
}

export interface CreateOrderBody {
  items: Array<{ product: string; qty: number }>;
  customer: { name: string; phone: string };
  address: { line1: string; line2?: string; city?: string; state?: string; pincode?: string };
  paymentMethod: "upi" | "card" | "wallet" | "cod";
}

/** Row shape returned by the product select below (category is embedded). */
interface ProductRow {
  id: string;
  code: string | null;
  slug: string;
  name: string;
  chinese_name: string | null;
  price: number | string;
  description: string;
  ingredients: string[] | null;
  image: string;
  rating: number | string;
  reviews_count: number;
  spicy: number;
  veg: boolean;
  featured: boolean;
  prep_time: string;
  in_stock: boolean;
  categories: { name: string; slug: string; icon: string | null } | null;
}

// `categories!inner` makes it an INNER JOIN, which is what lets
// `.eq("categories.name", …)` filter the products themselves rather than just
// blanking out the embedded object. `category_id` is NOT NULL, so the join
// never drops a row.
const PRODUCT_SELECT =
  "id, code, slug, name, chinese_name, price, description, ingredients, image, " +
  "rating, reviews_count, spicy, veg, featured, prep_time, in_stock, " +
  "categories!inner ( name, slug, icon )";

function mapProduct(row: ProductRow): KhangProduct {
  return {
    id: row.id,
    code: row.code,
    slug: row.slug,
    name: row.name,
    chinese_name: row.chinese_name,
    category: row.categories?.name ?? "",
    price: Number(row.price),
    rating: Number(row.rating),
    reviews_count: row.reviews_count,
    description: row.description,
    ingredients: row.ingredients ?? [],
    image: row.image,
    spicy: row.spicy,
    veg: row.veg,
    featured: row.featured,
    prep_time: row.prep_time,
    in_stock: row.in_stock,
  };
}

/** Adapts a database product to the shape the UI components already use. */
export function toFoodItem(p: KhangProduct): FoodItem {
  return {
    id: p.code ?? p.slug,
    name: p.name,
    chineseName: p.chinese_name ?? "",
    category: p.category as Category,
    price: p.price,
    rating: p.rating,
    reviews: p.reviews_count,
    description: p.description,
    ingredients: p.ingredients,
    image: p.image,
    spicy: p.spicy,
    veg: p.veg,
    featured: p.featured,
    prepTime: p.prep_time,
  };
}

function unwrap<T>(data: T | null, error: unknown, fallback: string): T {
  if (error) throw new Error(errorMessage(error, fallback));
  if (data === null || data === undefined) throw new Error(fallback);
  return data;
}

// ─── Auth ─────────────────────────────────────────────────────
export const authApi = {
  async signup(body: { name: string; email: string; password: string; phone?: string }) {
    const { data, error } = await supabase.auth.signUp({
      email: body.email,
      password: body.password,
      options: { data: { name: body.name, phone: body.phone ?? null } },
    });
    if (error) throw new Error(errorMessage(error, "Sign-up failed"));
    return data;
  },

  async login(body: { email: string; password: string }) {
    const { data, error } = await supabase.auth.signInWithPassword(body);
    if (error) throw new Error(errorMessage(error, "Invalid credentials"));
    return data;
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(errorMessage(error, "Sign-out failed"));
  },

  async session() {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  /** The signed-in user's row from `public.profiles` (null when logged out). */
  async profile(): Promise<KhangProfile | null> {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email, phone, role, avatar_url")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (error) throw new Error(errorMessage(error, "Could not load profile"));
    return (data as KhangProfile | null) ?? null;
  },

  async updateProfile(patch: { name?: string; phone?: string; avatar_url?: string }) {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Not signed in");

    const { data, error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", auth.user.id)
      .select("id, name, email, phone, role, avatar_url")
      .single();

    return unwrap(data as KhangProfile, error, "Could not update profile");
  },

  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(errorMessage(error, "Could not send reset email"));
  },
};

// ─── Menu ─────────────────────────────────────────────────────
export const productsApi = {
  async categories() {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, slug, icon, sort_order")
      .order("sort_order");
    return unwrap(data, error, "Could not load categories");
  },

  async list(params?: {
    category?: string;
    q?: string;
    featured?: boolean;
    sort?: "popular" | "low" | "high" | "new";
  }): Promise<KhangProduct[]> {
    let query = supabase.from("products").select(PRODUCT_SELECT);

    if (params?.category && params.category !== "All") {
      query = query.eq("categories.name", params.category);
    }
    if (params?.featured) query = query.eq("featured", true);
    // Full-text search over the generated `search_vector` column
    if (params?.q) query = query.textSearch("search_vector", params.q, { type: "websearch" });

    if (params?.sort === "popular") {
      query = query.order("rating", { ascending: false }).order("reviews_count", { ascending: false });
    } else if (params?.sort === "low") {
      query = query.order("price", { ascending: true });
    } else if (params?.sort === "high") {
      query = query.order("price", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query;
    return unwrap(data as unknown as ProductRow[], error, "Could not load the menu").map(mapProduct);
  },

  async get(slug: string): Promise<{ product: KhangProduct; reviews: KhangReview[] }> {
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("slug", slug)
      .maybeSingle();

    const row = unwrap(data as unknown as ProductRow, error, "Dish not found");
    const reviews = await reviewsApi.list(row.id);
    return { product: mapProduct(row), reviews };
  },
};

// ─── Reviews ──────────────────────────────────────────────────
export const reviewsApi = {
  async list(productId?: string, limit = 20): Promise<KhangReview[]> {
    let query = supabase
      .from("reviews")
      .select("id, rating, text, user_name, location, verified, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (productId) query = query.eq("product_id", productId);

    const { data, error } = await query;
    return unwrap(data as KhangReview[], error, "Could not load reviews");
  },

  /** `product` can be a uuid, a slug, or a legacy menu code like 'dim-001'. */
  async create(body: { product: string; rating: number; text: string; location?: string }) {
    const { data, error } = await supabase.rpc("submit_review", {
      p_product: body.product,
      p_rating: body.rating,
      p_text: body.text,
      p_location: body.location ?? undefined,
    });
    return unwrap(data, error, "Could not submit review");
  },

  async remove(id: string) {
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) throw new Error(errorMessage(error, "Could not delete review"));
  },
};

// ─── Orders ───────────────────────────────────────────────────
export const ordersApi = {
  /**
   * Creates an order. Totals are recalculated inside Postgres from the
   * products table, so a tampered cart simply cannot change the price.
   */
  async create(body: CreateOrderBody): Promise<KhangOrder> {
    const { data, error } = await supabase.rpc("create_order", {
      p_items: body.items as unknown as Json,
      p_address: body.address as unknown as Json,
      p_customer: body.customer as unknown as Json,
      p_payment_method: body.paymentMethod,
    });
    return unwrap(data as unknown as KhangOrder, error, "Could not place the order");
  },

  /** The signed-in user's order history (RLS limits rows to their own). */
  async mine(): Promise<KhangOrder[]> {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "*, order_items ( id, product_id, name, chinese_name, image, price, qty, line_total ), " +
          "order_tracking ( stage, note, created_at )",
      )
      .order("created_at", { ascending: false });

    const rows = unwrap(data as unknown as RawOrderRow[], error, "Could not load your orders");
    return rows.map(mapOrderRow);
  },

  async get(orderNumber: string): Promise<KhangOrder> {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "*, order_items ( id, product_id, name, chinese_name, image, price, qty, line_total ), " +
          "order_tracking ( stage, note, created_at )",
      )
      .eq("order_number", orderNumber)
      .maybeSingle();

    return mapOrderRow(unwrap(data as unknown as RawOrderRow, error, "Order not found"));
  },

  /** Public delivery tracking — works without signing in. */
  async track(orderNumber: string): Promise<KhangTracking> {
    const { data, error } = await supabase.rpc("track_order", {
      p_order_number: orderNumber,
    });
    return unwrap(data as unknown as KhangTracking, error, "Order not found");
  },

  /** Live order updates over Supabase Realtime. Returns an unsubscribe fn. */
  subscribe(orderId: string, onChange: (order: Partial<KhangOrder>) => void) {
    const channel = supabase
      .channel(`order:${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        (payload) => onChange(payload.new as unknown as Partial<KhangOrder>),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  },
};

// ─── Admin ────────────────────────────────────────────────────
export const adminApi = {
  /** RLS already restricts this to admins — no extra endpoint needed. */
  async orders(status?: OrderStatus): Promise<KhangOrder[]> {
    let query = supabase
      .from("orders")
      .select(
        "*, order_items ( id, product_id, name, chinese_name, image, price, qty, line_total ), " +
          "order_tracking ( stage, note, created_at )",
      )
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    return unwrap(data as unknown as RawOrderRow[], error, "Could not load orders").map(mapOrderRow);
  },

  async stats(): Promise<{
    total_orders: number;
    revenue: number;
    pending: number;
    delivered: number;
  }> {
    const { data, error } = await supabase.rpc("admin_order_stats");
    return unwrap(data as never, error, "Could not load stats");
  },

  async setStatus(orderId: string, status: OrderStatus, note?: string): Promise<KhangOrder> {
    const { data, error } = await supabase.rpc("set_order_status", {
      p_order_id: orderId,
      p_status: status,
      p_note: note,
    });
    return unwrap(data as unknown as KhangOrder, error, "Could not update the order");
  },

  async refund(orderNumber: string) {
    const { data, error } = await supabase.functions.invoke("refund-order", {
      body: { order_number: orderNumber },
    });
    if (error) throw new Error(errorMessage(error, "Refund failed"));
    return data;
  },
};

// ─── Payments (Edge Functions) ────────────────────────────────
export interface RazorpayInit {
  key: string;
  razorpay_order_id: string;
  amount: number;
  currency: string;
  order_number: string;
  customer: { name?: string | null; email?: string | null; phone?: string | null };
}

export interface StripeInit {
  client_secret: string;
  publishable_key: string | null;
  order_number: string;
  amount: number;
}

export interface RazorpayVerifyBody {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  order_number: string;
}

async function invoke<T>(name: string, body: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) {
    // Edge Functions return { message } on failure — surface that, not "non-2xx".
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const parsed = await ctx.json();
        if (parsed?.message) throw new Error(parsed.message);
      } catch (inner) {
        if (inner instanceof Error && inner.message && !/json/i.test(inner.message)) throw inner;
      }
    }
    throw new Error(errorMessage(error, `${name} failed`));
  }
  return data as T;
}

export const paymentsApi = {
  createRazorpayOrder: (orderNumber: string) =>
    invoke<RazorpayInit>("razorpay-create-order", { order_number: orderNumber }),

  verifyRazorpay: (body: RazorpayVerifyBody) =>
    invoke<{ message: string; order: KhangOrder }>("razorpay-verify", body),

  createStripeIntent: (orderNumber: string) =>
    invoke<StripeInit>("stripe-create-intent", { order_number: orderNumber }),

  notify: (orderNumber: string) =>
    invoke<{ message: string }>("notify-order", { order_number: orderNumber }),
};

// ─── Internals ────────────────────────────────────────────────
interface RawOrderRow {
  id: string;
  order_number: string;
  user_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  address: Record<string, string> | null;
  subtotal: number | string;
  tax: number | string;
  delivery: number | string;
  discount: number | string;
  total: number | string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_gateway: PaymentGateway;
  payment_status: PaymentStatus;
  paid_at: string | null;
  estimated_delivery: string | null;
  delivered_at: string | null;
  created_at: string;
  order_items?: Array<{
    id: string;
    product_id: string | null;
    name: string;
    chinese_name: string | null;
    image: string | null;
    price: number | string;
    qty: number;
    line_total: number | string;
  }>;
  order_tracking?: Array<{ stage: OrderStatus; note: string | null; created_at: string }>;
}

/** Flattens a PostgREST row (+ embedded children) into the KhangOrder shape. */
function mapOrderRow(row: RawOrderRow): KhangOrder {
  return {
    id: row.id,
    order_number: row.order_number,
    user_id: row.user_id,
    customer: {
      name: row.customer_name,
      phone: row.customer_phone,
      email: row.customer_email,
    },
    address: row.address ?? {},
    subtotal: Number(row.subtotal),
    tax: Number(row.tax),
    delivery: Number(row.delivery),
    discount: Number(row.discount),
    total: Number(row.total),
    status: row.status,
    payment: {
      method: row.payment_method,
      gateway: row.payment_gateway,
      status: row.payment_status,
      paid_at: row.paid_at,
    },
    estimated_delivery: row.estimated_delivery,
    delivered_at: row.delivered_at,
    created_at: row.created_at,
    items: (row.order_items ?? []).map((i) => ({
      id: i.id,
      product_id: i.product_id,
      name: i.name,
      chinese_name: i.chinese_name,
      image: i.image,
      price: Number(i.price),
      qty: i.qty,
      line_total: Number(i.line_total),
    })),
    tracking: (row.order_tracking ?? [])
      .map((t) => ({ stage: t.stage, note: t.note, at: t.created_at }))
      .sort((a, b) => +new Date(a.at) - +new Date(b.at)),
  };
}
