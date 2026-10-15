import { createClient, type AuthUser, type SupabaseClient } from "npm:@supabase/supabase-js@2";

/**
 * Khang's Supabase Edge API.
 *
 * Auth is handled by Supabase Auth in the browser. This function keeps every
 * privileged operation (totals, payments, status changes, and admin work)
 * server-side and uses the service role only after validating the caller JWT.
 */

type Row = Record<string, any>;
type ApiContext = {
  user: AuthUser;
  profile: Row;
  token: string;
};

const ORDER_SELECT = "*, order_items(*), order_tracking(*)";
const PAYMENT_METHODS = new Set(["upi", "card", "wallet", "cod", "stripe", "razorpay"]);
const ORDER_STATUSES = new Set([
  "received",
  "preparing",
  "out_for_delivery",
  "delivered",
  "cancelled",
]);
const encoder = new TextEncoder();

let adminClient: SupabaseClient<any> | null = null;

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function getEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new HttpError(500, `Missing Supabase function secret: ${name}`);
  return value;
}

function db() {
  if (!adminClient) {
    adminClient = createClient<any>(
      getEnv("SUPABASE_URL"),
      getEnv("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );
  }
  return adminClient;
}

function corsHeaders(req: Request): HeadersInit {
  const configured = (Deno.env.get("ALLOWED_ORIGINS") || "*")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const origin = req.headers.get("origin");
  const allowOrigin = configured.includes("*")
    ? origin || "*"
    : origin && configured.includes(origin)
      ? origin
      : configured[0] || "null";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(req: Request, data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(req),
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function asText(value: unknown, maxLength = 1000): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function asNumber(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || Array.isArray(value) || typeof value !== "object") return {};
  return value as Record<string, unknown>;
}

function asStringArray(value: unknown, maxItems = 30): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim().slice(0, 300))
    .filter(Boolean)
    .slice(0, maxItems);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 100);
}

function databaseError(error: { code?: string; message?: string } | null, fallbackStatus = 500): never {
  const message = error?.message || "Database request failed";
  console.error("Database error", error);
  if (error?.code === "23505") throw new HttpError(409, "That record already exists");
  if (error?.code === "23503") throw new HttpError(409, "This record is still in use");
  if (error?.code === "PGRST116") throw new HttpError(404, "Record not found");
  throw new HttpError(fallbackStatus, message);
}

async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    if (!body || Array.isArray(body) || typeof body !== "object") {
      throw new HttpError(400, "A JSON object is required");
    }
    return body as Record<string, unknown>;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "Invalid JSON body");
  }
}

function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header?.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim() || null;
}

async function requireAuth(req: Request): Promise<ApiContext> {
  const token = bearerToken(req);
  if (!token) throw new HttpError(401, "Not authorised — sign in first");

  const { data: userResult, error: userError } = await db().auth.getUser(token);
  if (userError || !userResult.user) {
    throw new HttpError(401, "Your session has expired. Please sign in again.");
  }

  const { data: profile, error: profileError } = await db()
    .from("profiles")
    .select("id, name, phone, role, avatar_url, created_at")
    .eq("id", userResult.user.id)
    .maybeSingle();
  if (profileError) databaseError(profileError);
  if (!profile) throw new HttpError(403, "Your account profile is not ready yet");

  return { user: userResult.user, profile, token };
}

function requireAdmin(context: ApiContext): void {
  if (context.profile.role !== "admin") {
    throw new HttpError(403, "Admin access required");
  }
}

function toUser(user: AuthUser, profile: Row) {
  return {
    _id: user.id,
    name: profile.name,
    email: user.email || "",
    phone: profile.phone || undefined,
    role: profile.role === "admin" ? "admin" : "user",
    avatarUrl: profile.avatar_url || undefined,
    createdAt: profile.created_at || user.created_at,
  };
}

function toProduct(row: Row, categoryName?: string) {
  return {
    _id: row.id,
    id: row.id,
    slug: row.slug,
    name: row.name,
    chineseName: row.chinese_name || "",
    category: categoryName || row.category_name || row.category_slug,
    categorySlug: row.category_slug,
    price: asNumber(row.price),
    description: row.description,
    ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
    image: row.image,
    images: Array.isArray(row.images) ? row.images : [],
    rating: asNumber(row.rating, 4.5),
    reviewsCount: Number(row.reviews_count || 0),
    spicy: Number(row.spicy || 0),
    veg: Boolean(row.veg),
    featured: Boolean(row.featured),
    prepTime: row.prep_time || "15 min",
    inStock: Boolean(row.in_stock),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toReview(row: Row) {
  return {
    _id: row.id,
    product: row.product_id,
    rating: Number(row.rating),
    text: row.text,
    userName: row.user_name,
    location: row.location || undefined,
    verified: Boolean(row.verified),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toOrder(row: Row) {
  const items = Array.isArray(row.order_items) ? [...row.order_items] : [];
  const tracking = Array.isArray(row.order_tracking) ? [...row.order_tracking] : [];
  items.sort((left: Row, right: Row) => Number(left.id) - Number(right.id));
  tracking.sort(
    (left: Row, right: Row) =>
      new Date(left.at).getTime() - new Date(right.at).getTime(),
  );

  return {
    _id: row.id,
    orderId: row.order_code,
    user: row.user_id,
    items: items.map((item: Row) => ({
      product: item.product_id,
      name: item.name,
      chineseName: item.chinese_name || undefined,
      image: item.image || undefined,
      price: asNumber(item.price),
      qty: Number(item.qty),
    })),
    customer: {
      name: row.customer_name || undefined,
      phone: row.customer_phone || undefined,
      email: row.customer_email || undefined,
    },
    address: row.address || {},
    subtotal: asNumber(row.subtotal),
    tax: asNumber(row.tax),
    delivery: asNumber(row.delivery),
    discount: asNumber(row.discount),
    total: asNumber(row.total),
    payment: {
      method: row.payment_method,
      gateway: row.payment_gateway,
      status: row.payment_status,
      razorpayOrderId: row.razorpay_order_id || undefined,
      razorpayPaymentId: row.razorpay_payment_id || undefined,
      stripePaymentIntentId: row.stripe_payment_intent_id || undefined,
      paidAt: row.paid_at || undefined,
    },
    status: row.status,
    tracking: tracking.map((event: Row) => ({
      stage: event.stage,
      note: event.note || undefined,
      at: event.at,
    })),
    estimatedDelivery: row.estimated_delivery || undefined,
    deliveredAt: row.delivered_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getCategoryMap(): Promise<Map<string, string>> {
  const { data, error } = await db().from("categories").select("slug, name");
  if (error) databaseError(error);
  return new Map((data || []).map((category: Row) => [category.slug, category.name]));
}

async function findCategory(input: string): Promise<Row> {
  const { data, error } = await db()
    .from("categories")
    .select("slug, name")
    .order("sort_order");
  if (error) databaseError(error);
  const normalized = input.trim().toLowerCase();
  const category = (data || []).find(
    (candidate: Row) =>
      candidate.slug.toLowerCase() === normalized ||
      candidate.name.toLowerCase() === normalized,
  );
  if (!category) throw new HttpError(400, "Unknown category");
  return category;
}

async function getOrderById(id: string): Promise<Row> {
  const { data, error } = await db()
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) databaseError(error);
  if (!data) throw new HttpError(404, "Order not found");
  return data;
}

async function getOrderByCode(orderCode: string): Promise<Row> {
  const { data, error } = await db()
    .from("orders")
    .select(ORDER_SELECT)
    .eq("order_code", orderCode)
    .maybeSingle();
  if (error) databaseError(error);
  if (!data) throw new HttpError(404, "Order not found");
  return data;
}

function ensureOrderAccess(context: ApiContext, order: Row): void {
  if (context.profile.role !== "admin" && order.user_id !== context.user.id) {
    throw new HttpError(403, "You cannot access this order");
  }
}

function parsePath(url: URL): string {
  const marker = "/functions/v1/api";
  const position = url.pathname.indexOf(marker);
  if (position >= 0) return url.pathname.slice(position + marker.length) || "/";
  return url.pathname || "/";
}

function parseLimit(value: string | null, fallback = 20, maximum = 100): number {
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1) return fallback;
  return Math.min(limit, maximum);
}

function validateOrderItems(value: unknown): Array<{ product: string; qty: number }> {
  if (!Array.isArray(value) || value.length === 0 || value.length > 30) {
    throw new HttpError(400, "Cart must contain between 1 and 30 items");
  }

  return value.map((item) => {
    const line = asRecord(item);
    const product = asText(line.product, 80);
    const qty = Number(line.qty);
    if (!product || !Number.isInteger(qty) || qty < 1 || qty > 99) {
      throw new HttpError(400, "Each cart item needs a valid product and quantity");
    }
    return { product, qty };
  });
}

function validateAddress(value: unknown): Record<string, string> {
  const address = asRecord(value);
  const line1 = asText(address.line1, 300);
  if (!line1) throw new HttpError(400, "Delivery address is required");

  const result: Record<string, string> = { line1 };
  for (const field of ["line2", "city", "state", "pincode"]) {
    const content = asText(address[field], 150);
    if (content) result[field] = content;
  }
  return result;
}

async function listProducts(req: Request, url: URL): Promise<Response> {
  const { data, error } = await db().from("products").select("*");
  if (error) databaseError(error);

  const categoryMap = await getCategoryMap();
  const requestedCategory = asText(url.searchParams.get("category"), 100).toLowerCase();
  const query = asText(url.searchParams.get("q"), 150).toLowerCase();
  const featured = url.searchParams.get("featured") === "true";
  const sort = url.searchParams.get("sort") || "new";

  let rows = (data || []).filter((row: Row) => {
    if (!row.in_stock) return false;
    const categoryName = (categoryMap.get(row.category_slug) || "").toLowerCase();
    if (
      requestedCategory &&
      requestedCategory !== "all" &&
      requestedCategory !== row.category_slug.toLowerCase() &&
      requestedCategory !== categoryName
    ) {
      return false;
    }
    if (featured && !row.featured) return false;
    if (!query) return true;
    const haystack = [row.name, row.chinese_name, row.description, categoryName]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });

  rows = [...rows].sort((left: Row, right: Row) => {
    if (sort === "popular") {
      return asNumber(right.rating) - asNumber(left.rating) ||
        Number(right.reviews_count) - Number(left.reviews_count);
    }
    if (sort === "low") return asNumber(left.price) - asNumber(right.price);
    if (sort === "high") return asNumber(right.price) - asNumber(left.price);
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
  });

  return json(req, {
    count: rows.length,
    items: rows.map((row: Row) => toProduct(row, categoryMap.get(row.category_slug))),
  });
}

async function getProduct(req: Request, slug: string): Promise<Response> {
  const { data: product, error: productError } = await db()
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("in_stock", true)
    .maybeSingle();
  if (productError) databaseError(productError);
  if (!product) throw new HttpError(404, "Product not found");

  const [{ data: category, error: categoryError }, { data: reviews, error: reviewError }] =
    await Promise.all([
      db().from("categories").select("name").eq("slug", product.category_slug).maybeSingle(),
      db()
        .from("reviews")
        .select("*")
        .eq("product_id", product.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
  if (categoryError) databaseError(categoryError);
  if (reviewError) databaseError(reviewError);

  return json(req, {
    product: toProduct(product, category?.name),
    reviews: (reviews || []).map(toReview),
  });
}

function productPayload(body: Record<string, unknown>, current?: Row): Row {
  const name = asText(body.name ?? current?.name, 200);
  const slug = slugify(asText(body.slug ?? current?.slug ?? name, 200));
  const id = asText(body.id ?? current?.id ?? slug, 80);
  const category = asText(body.categorySlug ?? body.category ?? current?.category_slug, 100);
  const price = asNumber(body.price ?? current?.price, -1);
  const description = asText(body.description ?? current?.description, 3000);
  const image = asText(body.image ?? current?.image, 2000);

  if (!id || !name || !slug || !category || price < 0 || !description || !image) {
    throw new HttpError(400, "id, name, category, price, description, and image are required");
  }

  const value: Row = {
    id,
    slug,
    name,
    category_input: category,
    price,
    description,
    image,
    chinese_name: asText(body.chineseName ?? current?.chinese_name, 200) || null,
    ingredients: body.ingredients === undefined
      ? current?.ingredients || []
      : asStringArray(body.ingredients),
    images: body.images === undefined ? current?.images || [] : asStringArray(body.images),
    rating: Math.max(0, Math.min(5, asNumber(body.rating ?? current?.rating, 4.5))),
    reviews_count: Math.max(0, Math.floor(asNumber(body.reviewsCount ?? current?.reviews_count, 0))),
    spicy: Math.max(0, Math.min(3, Math.floor(asNumber(body.spicy ?? current?.spicy, 0)))),
    veg: body.veg === undefined ? Boolean(current?.veg ?? true) : Boolean(body.veg),
    featured: body.featured === undefined
      ? Boolean(current?.featured ?? false)
      : Boolean(body.featured),
    prep_time: asText(body.prepTime ?? current?.prep_time, 60) || "15 min",
    in_stock: body.inStock === undefined
      ? Boolean(current?.in_stock ?? true)
      : Boolean(body.inStock),
  };
  return value;
}

async function createProduct(req: Request, context: ApiContext): Promise<Response> {
  requireAdmin(context);
  const body = await readJson(req);
  const payload = productPayload(body);
  const category = await findCategory(payload.category_input);
  delete payload.category_input;
  payload.category_slug = category.slug;

  const { data, error } = await db().from("products").insert(payload).select("*").single();
  if (error) databaseError(error, 400);
  return json(req, { product: toProduct(data, category.name) }, 201);
}

async function updateProduct(req: Request, context: ApiContext, id: string): Promise<Response> {
  requireAdmin(context);
  const { data: current, error: currentError } = await db()
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (currentError) databaseError(currentError);
  if (!current) throw new HttpError(404, "Product not found");

  const body = await readJson(req);
  const payload = productPayload(body, current);
  const category = await findCategory(payload.category_input);
  delete payload.category_input;
  delete payload.id;
  payload.category_slug = category.slug;

  const { data, error } = await db()
    .from("products")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();
  if (error) databaseError(error, 400);
  return json(req, { product: toProduct(data, category.name) });
}

async function deleteProduct(req: Request, context: ApiContext, id: string): Promise<Response> {
  requireAdmin(context);
  const { error, count } = await db()
    .from("products")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error) databaseError(error, 400);
  if (!count) throw new HttpError(404, "Product not found");
  return json(req, { message: "Product deleted" });
}

async function listReviews(req: Request, url: URL): Promise<Response> {
  const slug = asText(url.searchParams.get("product"), 100);
  const limit = parseLimit(url.searchParams.get("limit"));
  let productId: string | null = null;

  if (slug) {
    const { data: product, error: productError } = await db()
      .from("products")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (productError) databaseError(productError);
    if (!product) throw new HttpError(404, "Product not found");
    productId = product.id;
  }

  let query = db().from("reviews").select("*").order("created_at", { ascending: false }).limit(limit);
  if (productId) query = query.eq("product_id", productId);
  const { data, error } = await query;
  if (error) databaseError(error);
  return json(req, { count: (data || []).length, reviews: (data || []).map(toReview) });
}

async function createReview(req: Request, context: ApiContext): Promise<Response> {
  const body = await readJson(req);
  const productSlug = asText(body.productSlug, 100);
  const rating = Number(body.rating);
  const text = asText(body.text, 1000);
  const location = asText(body.location, 100) || null;

  if (!productSlug) throw new HttpError(400, "Product is required");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new HttpError(400, "Rating must be 1-5");
  }
  if (!text) throw new HttpError(400, "Review text is required");

  const { data: product, error: productError } = await db()
    .from("products")
    .select("id")
    .eq("slug", productSlug)
    .maybeSingle();
  if (productError) databaseError(productError);
  if (!product) throw new HttpError(404, "Product not found");

  const { data, error } = await db()
    .from("reviews")
    .insert({
      user_id: context.user.id,
      product_id: product.id,
      rating,
      text,
      user_name: context.profile.name,
      location,
      verified: true,
    })
    .select("*")
    .single();
  if (error) databaseError(error, 400);
  return json(req, { review: toReview(data) }, 201);
}

async function deleteReview(req: Request, context: ApiContext, id: string): Promise<Response> {
  const { data: review, error: reviewError } = await db()
    .from("reviews")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();
  if (reviewError) databaseError(reviewError);
  if (!review) throw new HttpError(404, "Review not found");
  if (review.user_id !== context.user.id && context.profile.role !== "admin") {
    throw new HttpError(403, "Not allowed");
  }

  const { error } = await db().from("reviews").delete().eq("id", id);
  if (error) databaseError(error, 400);
  return json(req, { message: "Review deleted" });
}

async function createOrder(req: Request, context: ApiContext): Promise<Response> {
  const body = await readJson(req);
  const items = validateOrderItems(body.items);
  const customer = asRecord(body.customer);
  const paymentMethod = asText(body.paymentMethod, 20).toLowerCase();
  const customerName = asText(customer.name, 120) || asText(context.profile.name, 120);
  const customerPhone = asText(customer.phone, 50) || asText(context.profile.phone, 50);
  const address = validateAddress(body.address);

  if (!PAYMENT_METHODS.has(paymentMethod)) {
    throw new HttpError(400, "Unsupported payment method");
  }
  if (!customerName) throw new HttpError(400, "Customer name is required");

  const { data: orderId, error } = await db().rpc("create_restaurant_order", {
    p_user_id: context.user.id,
    p_items: items,
    p_customer_name: customerName,
    p_customer_phone: customerPhone,
    p_address: address,
    p_payment_method: paymentMethod,
  });
  if (error) databaseError(error, 400);

  const order = await getOrderById(String(orderId));
  return json(req, { order: toOrder(order) }, 201);
}

async function getMyOrders(req: Request, context: ApiContext): Promise<Response> {
  const { data, error } = await db()
    .from("orders")
    .select(ORDER_SELECT)
    .eq("user_id", context.user.id)
    .order("created_at", { ascending: false });
  if (error) databaseError(error);
  return json(req, { count: (data || []).length, orders: (data || []).map(toOrder) });
}

async function getOrder(req: Request, context: ApiContext, orderCode: string): Promise<Response> {
  const order = await getOrderByCode(orderCode);
  ensureOrderAccess(context, order);
  return json(req, { order: toOrder(order) });
}

async function trackOrder(req: Request, orderCode: string): Promise<Response> {
  const { data: order, error } = await db()
    .from("orders")
    .select("order_code, status, total, estimated_delivery, delivered_at, customer_name, order_tracking(stage, note, at)")
    .eq("order_code", orderCode)
    .maybeSingle();
  if (error) databaseError(error);
  if (!order) throw new HttpError(404, "Order not found");

  const tracking = Array.isArray(order.order_tracking) ? order.order_tracking : [];
  tracking.sort(
    (left: Row, right: Row) => new Date(left.at).getTime() - new Date(right.at).getTime(),
  );
  return json(req, {
    order: {
      orderId: order.order_code,
      status: order.status,
      total: asNumber(order.total),
      customer: { name: order.customer_name },
      tracking: tracking.map((event: Row) => ({
        stage: event.stage,
        note: event.note || undefined,
        at: event.at,
      })),
      estimatedDelivery: order.estimated_delivery || undefined,
      deliveredAt: order.delivered_at || undefined,
    },
  });
}

async function listAllOrders(req: Request, context: ApiContext, url: URL): Promise<Response> {
  requireAdmin(context);
  const status = asText(url.searchParams.get("status"), 30);
  if (status && !ORDER_STATUSES.has(status)) throw new HttpError(400, "Invalid order status");

  let query = db().from("orders").select(ORDER_SELECT).order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) databaseError(error);
  return json(req, { count: (data || []).length, orders: (data || []).map(toOrder) });
}

async function updateOrderStatus(
  req: Request,
  context: ApiContext,
  id: string,
): Promise<Response> {
  requireAdmin(context);
  const body = await readJson(req);
  const status = asText(body.status, 30);
  const note = asText(body.note, 500) || null;
  if (!ORDER_STATUSES.has(status)) throw new HttpError(400, "Invalid order status");

  const { error } = await db().rpc("update_restaurant_order_status", {
    p_order_id: id,
    p_status: status,
    p_note: note,
  });
  if (error) databaseError(error, 400);
  const order = await getOrderById(id);
  return json(req, { order: toOrder(order) });
}

async function hmacSha256(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function secureEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

function minorUnits(total: unknown): number {
  return Math.round(asNumber(total) * 100);
}

async function razorpayRequest(path: string, init: RequestInit): Promise<Row> {
  const keyId = getEnv("RAZORPAY_KEY_ID");
  const secret = getEnv("RAZORPAY_KEY_SECRET");
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${btoa(`${keyId}:${secret}`)}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const raw = await response.text();
  let data: Row = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    // Preserve a safe generic gateway message below.
  }
  if (!response.ok) {
    console.error("Razorpay error", response.status, data || raw);
    throw new HttpError(502, data?.error?.description || "Razorpay request failed");
  }
  return data;
}

async function createRazorpayOrder(req: Request, context: ApiContext): Promise<Response> {
  const body = await readJson(req);
  const orderCode = asText(body.orderId, 80);
  if (!orderCode) throw new HttpError(400, "Order ID is required");

  const order = await getOrderByCode(orderCode);
  ensureOrderAccess(context, order);
  if (order.payment_status === "paid") throw new HttpError(409, "This order is already paid");
  if (order.payment_method === "cod") throw new HttpError(400, "Cash orders do not need online payment");

  const gatewayOrder = await razorpayRequest("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount: minorUnits(order.total),
      currency: "INR",
      receipt: order.order_code,
      notes: { khangOrderId: order.order_code, userId: order.user_id },
    }),
  });

  const { error } = await db()
    .from("orders")
    .update({ razorpay_order_id: gatewayOrder.id, payment_gateway: "razorpay" })
    .eq("id", order.id);
  if (error) databaseError(error, 400);

  return json(req, {
    key: getEnv("RAZORPAY_KEY_ID"),
    razorpayOrderId: gatewayOrder.id,
    amount: Number(gatewayOrder.amount),
    currency: gatewayOrder.currency,
    orderId: order.order_code,
    customer: {
      name: order.customer_name,
      phone: order.customer_phone,
      email: order.customer_email,
    },
  });
}

async function verifyRazorpayPayment(req: Request, context: ApiContext): Promise<Response> {
  const body = await readJson(req);
  const orderCode = asText(body.orderId, 80);
  const razorpayOrderId = asText(body.razorpay_order_id, 150);
  const paymentId = asText(body.razorpay_payment_id, 150);
  const signature = asText(body.razorpay_signature, 200);
  if (!orderCode || !razorpayOrderId || !paymentId || !signature) {
    throw new HttpError(400, "Incomplete Razorpay payment response");
  }

  const order = await getOrderByCode(orderCode);
  ensureOrderAccess(context, order);
  if (order.razorpay_order_id !== razorpayOrderId) {
    throw new HttpError(400, "Razorpay order does not match this order");
  }

  const expected = await hmacSha256(
    getEnv("RAZORPAY_KEY_SECRET"),
    `${razorpayOrderId}|${paymentId}`,
  );
  if (!secureEqual(expected, signature)) {
    throw new HttpError(400, "Invalid payment signature");
  }

  const { error } = await db()
    .from("orders")
    .update({
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      payment_status: "paid",
      payment_gateway: "razorpay",
      paid_at: new Date().toISOString(),
    })
    .eq("id", order.id);
  if (error) databaseError(error, 400);

  return json(req, {
    message: "Payment verified",
    order: { orderId: order.order_code, status: order.status, total: asNumber(order.total) },
  });
}

async function razorpayWebhook(req: Request): Promise<Response> {
  const secret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
  if (!secret) throw new HttpError(503, "Razorpay webhook secret is not configured");

  const payloadText = await req.text();
  const signature = req.headers.get("x-razorpay-signature") || "";
  const expected = await hmacSha256(secret, payloadText);
  if (!signature || !secureEqual(expected, signature)) {
    throw new HttpError(401, "Invalid Razorpay webhook signature");
  }

  let event: Row;
  try {
    event = JSON.parse(payloadText);
  } catch {
    throw new HttpError(400, "Invalid Razorpay webhook payload");
  }

  const payment = event?.payload?.payment?.entity;
  const razorpayOrderId = asText(payment?.order_id, 150);
  if (!razorpayOrderId) return json(req, { received: true });

  if (event.event === "payment.captured") {
    const { error } = await db()
      .from("orders")
      .update({
        razorpay_payment_id: asText(payment.id, 150) || null,
        payment_status: "paid",
        payment_gateway: "razorpay",
        paid_at: new Date().toISOString(),
      })
      .eq("razorpay_order_id", razorpayOrderId);
    if (error) databaseError(error);
  } else if (event.event === "payment.failed") {
    const { error } = await db()
      .from("orders")
      .update({ payment_status: "failed", payment_gateway: "razorpay" })
      .eq("razorpay_order_id", razorpayOrderId);
    if (error) databaseError(error);
  }

  return json(req, { received: true });
}

async function stripeRequest(path: string, form: URLSearchParams): Promise<Row> {
  const secret = getEnv("STRIPE_SECRET_KEY");
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });
  const raw = await response.text();
  let data: Row = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    // Preserve a safe generic gateway message below.
  }
  if (!response.ok) {
    console.error("Stripe error", response.status, data || raw);
    throw new HttpError(502, data?.error?.message || "Stripe request failed");
  }
  return data;
}

async function createStripeIntent(req: Request, context: ApiContext): Promise<Response> {
  const body = await readJson(req);
  const orderCode = asText(body.orderId, 80);
  if (!orderCode) throw new HttpError(400, "Order ID is required");

  const order = await getOrderByCode(orderCode);
  ensureOrderAccess(context, order);
  if (order.payment_status === "paid") throw new HttpError(409, "This order is already paid");

  const form = new URLSearchParams({
    amount: String(minorUnits(order.total)),
    currency: "inr",
    "automatic_payment_methods[enabled]": "true",
    "metadata[khangOrderId]": order.order_code,
    "metadata[userId]": order.user_id,
  });
  if (order.customer_email) form.set("receipt_email", order.customer_email);
  const intent = await stripeRequest("/payment_intents", form);

  const { error } = await db()
    .from("orders")
    .update({ stripe_payment_intent_id: intent.id, payment_gateway: "stripe" })
    .eq("id", order.id);
  if (error) databaseError(error, 400);

  return json(req, {
    clientSecret: intent.client_secret,
    publishableKey: getEnv("STRIPE_PUBLISHABLE_KEY"),
    orderId: order.order_code,
    amount: Number(intent.amount),
  });
}

function verifyStripeSignature(header: string | null, payload: string): Promise<boolean> {
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!secret || !header) return Promise.resolve(false);

  const parts = header.split(",").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const candidates = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3));
  if (!timestamp || !candidates.length || !/^\d+$/.test(timestamp)) return Promise.resolve(false);
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return Promise.resolve(false);

  return hmacSha256(secret, `${timestamp}.${payload}`).then((expected) =>
    candidates.some((candidate) => secureEqual(expected, candidate)),
  );
}

async function stripeWebhook(req: Request): Promise<Response> {
  if (!Deno.env.get("STRIPE_WEBHOOK_SECRET")) {
    throw new HttpError(503, "Stripe webhook secret is not configured");
  }

  const payloadText = await req.text();
  const valid = await verifyStripeSignature(req.headers.get("stripe-signature"), payloadText);
  if (!valid) throw new HttpError(401, "Invalid Stripe webhook signature");

  let event: Row;
  try {
    event = JSON.parse(payloadText);
  } catch {
    throw new HttpError(400, "Invalid Stripe webhook payload");
  }

  const intent = event?.data?.object;
  const orderCode = asText(intent?.metadata?.khangOrderId, 80);
  if (!orderCode) return json(req, { received: true });

  if (event.type === "payment_intent.succeeded") {
    const { error } = await db()
      .from("orders")
      .update({
        payment_status: "paid",
        payment_gateway: "stripe",
        stripe_payment_intent_id: asText(intent.id, 150) || null,
        paid_at: new Date().toISOString(),
      })
      .eq("order_code", orderCode);
    if (error) databaseError(error);
  } else if (event.type === "payment_intent.payment_failed") {
    const { error } = await db()
      .from("orders")
      .update({ payment_status: "failed", payment_gateway: "stripe" })
      .eq("order_code", orderCode);
    if (error) databaseError(error);
  }

  return json(req, { received: true });
}

async function refundOrder(req: Request, context: ApiContext): Promise<Response> {
  requireAdmin(context);
  const body = await readJson(req);
  const orderCode = asText(body.orderId, 80);
  if (!orderCode) throw new HttpError(400, "Order ID is required");

  const order = await getOrderByCode(orderCode);
  if (order.payment_status !== "paid") throw new HttpError(400, "Order is not paid");

  if (order.payment_gateway === "razorpay") {
    if (!order.razorpay_payment_id) throw new HttpError(400, "Missing Razorpay payment ID");
    await razorpayRequest(`/payments/${order.razorpay_payment_id}/refund`, {
      method: "POST",
      body: JSON.stringify({ amount: minorUnits(order.total) }),
    });
  } else if (order.payment_gateway === "stripe") {
    if (!order.stripe_payment_intent_id) throw new HttpError(400, "Missing Stripe payment intent");
    await stripeRequest(
      "/refunds",
      new URLSearchParams({ payment_intent: order.stripe_payment_intent_id }),
    );
  } else {
    throw new HttpError(400, "This payment gateway cannot be refunded automatically");
  }

  const { error: statusError } = await db().rpc("update_restaurant_order_status", {
    p_order_id: order.id,
    p_status: "cancelled",
    p_note: "Order refunded",
  });
  if (statusError) databaseError(statusError, 400);

  const { error: paymentError } = await db()
    .from("orders")
    .update({ payment_status: "refunded" })
    .eq("id", order.id);
  if (paymentError) databaseError(paymentError, 400);

  const updated = await getOrderById(order.id);
  return json(req, { message: "Refund processed", order: toOrder(updated) });
}

async function updateMyProfile(req: Request, context: ApiContext): Promise<Response> {
  const body = await readJson(req);
  const updates: Row = {};

  if (body.name !== undefined) {
    const name = asText(body.name, 120);
    if (!name) throw new HttpError(400, "Name cannot be empty");
    updates.name = name;
  }
  if (body.phone !== undefined) updates.phone = asText(body.phone, 50) || null;
  if (body.avatarUrl !== undefined) updates.avatar_url = asText(body.avatarUrl, 2000) || null;

  if (!Object.keys(updates).length) return json(req, { user: toUser(context.user, context.profile) });

  const { data, error } = await db()
    .from("profiles")
    .update(updates)
    .eq("id", context.user.id)
    .select("id, name, phone, role, avatar_url, created_at")
    .single();
  if (error) databaseError(error, 400);
  return json(req, { user: toUser(context.user, data) });
}

async function route(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = parsePath(url);
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
  const method = req.method.toUpperCase();

  if (method === "GET" && path === "/") {
    return json(req, {
      name: "Khang Supabase Edge API",
      version: "2.0.0",
      auth: "Supabase Auth",
      endpoints: ["products", "reviews", "orders", "payments"],
    });
  }
  if (method === "GET" && path === "/health") {
    return json(req, { status: "ok", platform: "supabase-edge" });
  }

  // Gateway webhooks intentionally authenticate with their own provider signatures.
  if (method === "POST" && path === "/payments/razorpay/webhook") return razorpayWebhook(req);
  if (method === "POST" && path === "/payments/stripe/webhook") return stripeWebhook(req);

  if (method === "GET" && path === "/products") return listProducts(req, url);
  if (method === "GET" && parts[0] === "products" && parts.length === 2) {
    return getProduct(req, parts[1]);
  }
  if (method === "POST" && path === "/products") {
    return createProduct(req, await requireAuth(req));
  }
  if (method === "PUT" && parts[0] === "products" && parts.length === 2) {
    return updateProduct(req, await requireAuth(req), parts[1]);
  }
  if (method === "DELETE" && parts[0] === "products" && parts.length === 2) {
    return deleteProduct(req, await requireAuth(req), parts[1]);
  }

  if (method === "GET" && path === "/reviews") return listReviews(req, url);
  if (method === "POST" && path === "/reviews") {
    return createReview(req, await requireAuth(req));
  }
  if (method === "DELETE" && parts[0] === "reviews" && parts.length === 2) {
    return deleteReview(req, await requireAuth(req), parts[1]);
  }

  if (method === "GET" && path === "/auth/me") {
    const context = await requireAuth(req);
    return json(req, { user: toUser(context.user, context.profile) });
  }
  if (method === "PUT" && path === "/auth/me") {
    return updateMyProfile(req, await requireAuth(req));
  }
  if (method === "POST" && path === "/auth/logout") {
    return json(req, { message: "Logged out" });
  }

  if (method === "GET" && parts[0] === "orders" && parts[1] === "track" && parts.length === 3) {
    return trackOrder(req, parts[2]);
  }
  if (method === "POST" && path === "/orders") {
    return createOrder(req, await requireAuth(req));
  }
  if (method === "GET" && path === "/orders/me") {
    return getMyOrders(req, await requireAuth(req));
  }
  if (method === "GET" && path === "/orders") {
    return listAllOrders(req, await requireAuth(req), url);
  }
  if (method === "PUT" && parts[0] === "orders" && parts[2] === "status" && parts.length === 3) {
    return updateOrderStatus(req, await requireAuth(req), parts[1]);
  }
  if (method === "GET" && parts[0] === "orders" && parts.length === 2) {
    return getOrder(req, await requireAuth(req), parts[1]);
  }

  if (method === "POST" && path === "/payments/razorpay/create-order") {
    return createRazorpayOrder(req, await requireAuth(req));
  }
  if (method === "POST" && path === "/payments/razorpay/verify") {
    return verifyRazorpayPayment(req, await requireAuth(req));
  }
  if (method === "POST" && path === "/payments/stripe/create-intent") {
    return createStripeIntent(req, await requireAuth(req));
  }
  if (method === "POST" && path === "/payments/refund") {
    return refundOrder(req, await requireAuth(req));
  }

  throw new HttpError(404, `Route not found: ${method} ${path}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  try {
    return await route(req);
  } catch (error) {
    if (error instanceof HttpError) {
      return json(req, { message: error.message }, error.status);
    }
    console.error("Unhandled edge API error", error);
    return json(req, { message: "Internal server error" }, 500);
  }
});
