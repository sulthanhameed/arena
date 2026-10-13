/**
 * Lightweight typed API client for the Khang backend.
 *
 * Reads VITE_API_URL from env (defaults to http://localhost:5000/api).
 * Automatically attaches the JWT from localStorage.
 */

const BASE_URL =
  (import.meta as ImportMeta & { env: Record<string, string> }).env
    .VITE_API_URL || "http://localhost:5000/api";
const TOKEN_KEY = "khang_token";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  auth?: boolean;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((opts.headers as Record<string, string>) || {}),
  };
  const token = getToken();
  if (token && opts.auth !== false) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data as T;
}

// ─── Auth ─────────────────────────────────
export const authApi = {
  signup: (body: { name: string; email: string; password: string; phone?: string }) =>
    request<{ token: string; user: KhangUser }>("/auth/signup", { method: "POST", body }),
  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: KhangUser }>("/auth/login", { method: "POST", body }),
  me: () => request<{ user: KhangUser }>("/auth/me"),
};

// ─── Products ─────────────────────────────
export const productsApi = {
  list: (params?: { category?: string; q?: string; featured?: boolean; sort?: string }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set("category", params.category);
    if (params?.q) qs.set("q", params.q);
    if (params?.featured) qs.set("featured", "true");
    if (params?.sort) qs.set("sort", params.sort);
    const qsStr = qs.toString();
    return request<{ count: number; items: KhangProduct[] }>(
      `/products${qsStr ? `?${qsStr}` : ""}`,
      { auth: false },
    );
  },
  get: (slug: string) =>
    request<{ product: KhangProduct; reviews: KhangReview[] }>(
      `/products/${slug}`,
      { auth: false },
    ),
};

// ─── Orders ───────────────────────────────
export const ordersApi = {
  create: (body: CreateOrderBody) =>
    request<{ order: KhangOrder }>("/orders", { method: "POST", body }),
  myOrders: () =>
    request<{ count: number; orders: KhangOrder[] }>("/orders/me"),
  get: (orderId: string) =>
    request<{ order: KhangOrder }>(`/orders/${orderId}`),
  track: (orderId: string) =>
    request<{ order: KhangOrder }>(`/orders/track/${orderId}`, { auth: false }),
};

// ─── Payments ─────────────────────────────
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
};

// ─── Types ────────────────────────────────
export interface KhangUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: "user" | "admin";
}

export interface KhangProduct {
  _id: string;
  slug: string;
  name: string;
  chineseName: string;
  category: string;
  price: number;
  rating: number;
  reviewsCount: number;
  description: string;
  ingredients: string[];
  image: string;
  spicy?: number;
  veg: boolean;
  featured?: boolean;
  prepTime: string;
}

export interface KhangReview {
  _id: string;
  rating: number;
  text: string;
  userName: string;
  location?: string;
  createdAt: string;
}

export interface KhangOrder {
  _id: string;
  orderId: string;
  items: Array<{ product: string; name: string; price: number; qty: number; image?: string; chineseName?: string }>;
  customer: { name?: string; phone?: string; email?: string };
  address: Record<string, string>;
  subtotal: number;
  tax: number;
  delivery: number;
  total: number;
  payment: {
    method: string;
    gateway: string;
    status: "pending" | "paid" | "failed" | "refunded";
  };
  status: "received" | "preparing" | "out_for_delivery" | "delivered" | "cancelled";
  tracking: Array<{ stage: string; note?: string; at: string }>;
  estimatedDelivery?: string;
  createdAt: string;
}

export interface CreateOrderBody {
  items: Array<{ product: string; qty: number }>;
  customer: { name: string; phone: string };
  address: { line1: string; city?: string; state?: string; pincode?: string };
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
