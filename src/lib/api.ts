/**
 * Supabase-backed API client.
 *
 * Supabase Auth owns browser sessions; secure business operations are routed to
 * `supabase/functions/api` so prices, payment secrets, and admin permissions
 * never live in the browser.
 */
import { getSupabase, isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./supabase";

const TOKEN_KEY = "khang_supabase_access_token";
const EDGE_BASE_URL = supabaseUrl ? `${supabaseUrl}/functions/v1/api` : "";

export { isSupabaseConfigured };

// These small helpers retain a local mirror for existing UI state. Supabase JS
// remains the source of truth and request() always asks it for the newest token.
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Set false only for endpoints that do not require a signed-in user. */
  auth?: boolean;
}

async function currentAccessToken(): Promise<string | null> {
  const { data } = await getSupabase().auth.getSession();
  return data.session?.access_token || getToken();
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!isSupabaseConfigured || !EDGE_BASE_URL) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }

  const token = await currentAccessToken();
  if (options.auth !== false && !token) {
    throw new Error("Please sign in to continue.");
  }

  const headers: Record<string, string> = {
    apikey: supabaseAnonKey,
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string> | undefined) || {}),
    // Public requests use the anon key. Protected requests use the current
    // Supabase access token, which the Edge Function validates server-side.
    Authorization: `Bearer ${token || supabaseAnonKey}`,
  };

  const response = await fetch(`${EDGE_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const raw = await response.text();
  let data: Record<string, unknown> = {};
  if (raw) {
    try {
      data = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      data = { message: raw };
    }
  }

  if (!response.ok) {
    throw new Error(String(data.message || `Request failed (${response.status})`));
  }
  return data as T;
}

async function profileForCurrentSession(): Promise<{ token: string; user: KhangUser }> {
  const token = await currentAccessToken();
  if (!token) throw new Error("Supabase did not create a session. Check your email to confirm your account.");
  const result = await request<{ user: KhangUser }>("/auth/me");
  return { token, user: result.user };
}

// ─── Auth (Supabase Auth) ──────────────────────────────────────
export const authApi = {
  signup: async (body: { name: string; email: string; password: string; phone?: string }) => {
    const { data, error } = await getSupabase().auth.signUp({
      email: body.email.trim(),
      password: body.password,
      options: {
        data: { name: body.name.trim(), phone: body.phone?.trim() || undefined },
      },
    });
    if (error) throw new Error(error.message);
    if (!data.session) {
      throw new Error("Account created. Please confirm the email we sent before signing in.");
    }
    const result = await profileForCurrentSession();
    setToken(result.token);
    return result;
  },
  login: async (body: { email: string; password: string }) => {
    const { data, error } = await getSupabase().auth.signInWithPassword({
      email: body.email.trim(),
      password: body.password,
    });
    if (error) throw new Error(error.message);
    if (!data.session) throw new Error("Unable to create a Supabase session.");
    const result = await profileForCurrentSession();
    setToken(result.token);
    return result;
  },
  me: () => request<{ user: KhangUser }>("/auth/me"),
  updateMe: (body: { name?: string; phone?: string; avatarUrl?: string }) =>
    request<{ user: KhangUser }>("/auth/me", { method: "PUT", body }),
  logout: async () => {
    const { error } = await getSupabase().auth.signOut();
    clearToken();
    if (error) throw new Error(error.message);
  },
};

// ─── Products ──────────────────────────────────────────────────
export const productsApi = {
  list: (params?: { category?: string; q?: string; featured?: boolean; sort?: string }) => {
    const query = new URLSearchParams();
    if (params?.category) query.set("category", params.category);
    if (params?.q) query.set("q", params.q);
    if (params?.featured) query.set("featured", "true");
    if (params?.sort) query.set("sort", params.sort);
    const suffix = query.toString();
    return request<{ count: number; items: KhangProduct[] }>(
      `/products${suffix ? `?${suffix}` : ""}`,
      { auth: false },
    );
  },
  get: (slug: string) =>
    request<{ product: KhangProduct; reviews: KhangReview[] }>(
      `/products/${encodeURIComponent(slug)}`,
      { auth: false },
    ),
  create: (body: ProductInput) =>
    request<{ product: KhangProduct }>("/products", { method: "POST", body }),
  update: (id: string, body: Partial<ProductInput>) =>
    request<{ product: KhangProduct }>(`/products/${encodeURIComponent(id)}`, {
      method: "PUT",
      body,
    }),
  remove: (id: string) =>
    request<{ message: string }>(`/products/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
};

// ─── Reviews ───────────────────────────────────────────────────
export const reviewsApi = {
  list: (params?: { product?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.product) query.set("product", params.product);
    if (params?.limit) query.set("limit", String(params.limit));
    const suffix = query.toString();
    return request<{ count: number; reviews: KhangReview[] }>(
      `/reviews${suffix ? `?${suffix}` : ""}`,
      { auth: false },
    );
  },
  create: (body: { productSlug: string; rating: number; text: string; location?: string }) =>
    request<{ review: KhangReview }>("/reviews", { method: "POST", body }),
  remove: (id: string) =>
    request<{ message: string }>(`/reviews/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
};

// ─── Orders ────────────────────────────────────────────────────
export const ordersApi = {
  create: (body: CreateOrderBody) =>
    request<{ order: KhangOrder }>("/orders", { method: "POST", body }),
  myOrders: () => request<{ count: number; orders: KhangOrder[] }>("/orders/me"),
  get: (orderId: string) =>
    request<{ order: KhangOrder }>(`/orders/${encodeURIComponent(orderId)}`),
  track: (orderId: string) =>
    request<{ order: Partial<KhangOrder> }>(
      `/orders/track/${encodeURIComponent(orderId)}`,
      { auth: false },
    ),
  listAll: (status?: KhangOrder["status"]) => {
    const suffix = status ? `?status=${encodeURIComponent(status)}` : "";
    return request<{ count: number; orders: KhangOrder[] }>(`/orders${suffix}`);
  },
  updateStatus: (id: string, status: KhangOrder["status"], note?: string) =>
    request<{ order: KhangOrder }>(`/orders/${encodeURIComponent(id)}/status`, {
      method: "PUT",
      body: { status, note },
    }),
};

// ─── Payments (Supabase Edge Function) ──────────────────────────
export const paymentsApi = {
  createRazorpayOrder: (orderId: string) =>
    request<RazorpayInit>("/payments/razorpay/create-order", {
      method: "POST",
      body: { orderId },
    }),
  verifyRazorpay: (body: RazorpayVerifyBody) =>
    request<{ message: string; order: { orderId: string; status: string; total: number } }>(
      "/payments/razorpay/verify",
      { method: "POST", body },
    ),
  createStripeIntent: (orderId: string) =>
    request<StripeInit>("/payments/stripe/create-intent", {
      method: "POST",
      body: { orderId },
    }),
  refund: (orderId: string) =>
    request<{ message: string; order: KhangOrder }>("/payments/refund", {
      method: "POST",
      body: { orderId },
    }),
};

// ─── API types ─────────────────────────────────────────────────
export interface KhangUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: "user" | "admin";
  avatarUrl?: string;
  createdAt?: string;
}

export interface KhangProduct {
  _id: string;
  id?: string;
  slug: string;
  name: string;
  chineseName: string;
  category: string;
  categorySlug?: string;
  price: number;
  rating: number;
  reviewsCount: number;
  description: string;
  ingredients: string[];
  image: string;
  images?: string[];
  spicy?: number;
  veg: boolean;
  featured?: boolean;
  prepTime: string;
  inStock?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductInput {
  id?: string;
  slug?: string;
  name: string;
  chineseName?: string;
  category: string;
  categorySlug?: string;
  price: number;
  description: string;
  ingredients?: string[];
  image: string;
  images?: string[];
  rating?: number;
  reviewsCount?: number;
  spicy?: number;
  veg?: boolean;
  featured?: boolean;
  prepTime?: string;
  inStock?: boolean;
}

export interface KhangReview {
  _id: string;
  product?: string;
  rating: number;
  text: string;
  userName: string;
  location?: string;
  verified?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface KhangOrder {
  _id: string;
  orderId: string;
  user?: string;
  items: Array<{
    product: string;
    name: string;
    price: number;
    qty: number;
    image?: string;
    chineseName?: string;
  }>;
  customer: { name?: string; phone?: string; email?: string };
  address: Record<string, string>;
  subtotal: number;
  tax: number;
  delivery: number;
  discount?: number;
  total: number;
  payment: {
    method: string;
    gateway: string;
    status: "pending" | "paid" | "failed" | "refunded";
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    stripePaymentIntentId?: string;
    paidAt?: string;
  };
  status: "received" | "preparing" | "out_for_delivery" | "delivered" | "cancelled";
  tracking: Array<{ stage: string; note?: string; at: string }>;
  estimatedDelivery?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateOrderBody {
  items: Array<{ product: string; qty: number }>;
  customer: { name: string; phone: string };
  address: { line1: string; line2?: string; city?: string; state?: string; pincode?: string };
  paymentMethod: "upi" | "card" | "wallet" | "cod";
}

export interface RazorpayInit {
  key: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  orderId: string;
  customer: { name?: string; phone?: string; email?: string };
}

export interface RazorpayVerifyBody {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  orderId: string;
}

export interface StripeInit {
  clientSecret: string;
  publishableKey: string;
  orderId: string;
  amount: number;
}
