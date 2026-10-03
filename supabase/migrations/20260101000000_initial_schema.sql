-- ════════════════════════════════════════════════════════════════════════
--  Khang Chinese Restaurant — Supabase / PostgreSQL schema
--  Migration 001 · initial schema (tables, enums, indexes)
--
--  Replaces the former MongoDB collections:
--    users       → auth.users + public.profiles
--    categories  → public.categories
--    products    → public.products
--    orders      → public.orders + order_items + order_tracking
--    reviews     → public.reviews
-- ════════════════════════════════════════════════════════════════════════

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- ─────────────────────────────────────────────────────────────
-- Enumerated types (replace the Mongoose `enum:` validators)
-- ─────────────────────────────────────────────────────────────
do $$ begin
  create type public.user_role as enum ('user', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum (
    'received', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('upi', 'card', 'wallet', 'cod', 'stripe', 'razorpay');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_gateway as enum ('razorpay', 'stripe', 'cod', 'none');
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────
-- profiles — public mirror of auth.users
-- Supabase Auth owns credentials (email/password, OAuth, magic links),
-- so there is no `password` column here. Ever.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default 'Guest',
  email       text,
  phone       text,
  role        public.user_role not null default 'user',
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists profiles_email_key on public.profiles (lower(email));
create index if not exists profiles_role_idx on public.profiles (role);

comment on table public.profiles is 'User profile data. 1:1 with auth.users — created automatically by the handle_new_user() trigger.';

-- ─────────────────────────────────────────────────────────────
-- addresses — was the embedded `addresses[]` sub-document
-- ─────────────────────────────────────────────────────────────
create table if not exists public.addresses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  label       text not null default 'Home',
  line1       text not null,
  line2       text,
  city        text,
  state       text,
  pincode     text,
  is_default  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists addresses_user_idx on public.addresses (user_id);
create unique index if not exists addresses_one_default_per_user
  on public.addresses (user_id) where is_default;

-- ─────────────────────────────────────────────────────────────
-- categories
-- ─────────────────────────────────────────────────────────────
create table if not exists public.categories (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  slug         text not null unique,
  icon         text,
  description  text,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists categories_sort_order_idx on public.categories (sort_order);

-- ─────────────────────────────────────────────────────────────
-- products
-- ─────────────────────────────────────────────────────────────
create table if not exists public.products (
  id             uuid primary key default gen_random_uuid(),
  code           text unique,                     -- legacy menu id (e.g. 'dim-001')
  name           text not null,
  chinese_name   text,
  slug           text not null unique,
  category_id    uuid not null references public.categories (id) on delete restrict,
  price          numeric(10, 2) not null check (price >= 0),
  description    text not null default '',
  ingredients    text[] not null default '{}',
  image          text not null,
  images         text[] not null default '{}',
  rating         numeric(2, 1) not null default 4.5 check (rating >= 0 and rating <= 5),
  reviews_count  integer not null default 0 check (reviews_count >= 0),
  spicy          smallint not null default 0 check (spicy between 0 and 3),
  veg            boolean not null default true,
  featured       boolean not null default false,
  prep_time      text not null default '15 min',
  in_stock       boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  -- Full-text search column (replaces the Mongo text index)
  search_vector  tsvector generated always as (
    to_tsvector(
      'english',
      coalesce(name, '') || ' ' ||
      coalesce(chinese_name, '') || ' ' ||
      coalesce(description, '')
    )
  ) stored
);

create index if not exists products_category_idx     on public.products (category_id);
create index if not exists products_featured_idx     on public.products (featured) where featured;
create index if not exists products_in_stock_idx     on public.products (in_stock);
create index if not exists products_price_idx        on public.products (price);
create index if not exists products_popular_idx      on public.products (rating desc, reviews_count desc);
create index if not exists products_search_idx       on public.products using gin (search_vector);

-- ─────────────────────────────────────────────────────────────
-- orders
-- ─────────────────────────────────────────────────────────────
create sequence if not exists public.order_number_seq start with 1000;

create table if not exists public.orders (
  id                        uuid primary key default gen_random_uuid(),
  order_number              text not null unique,      -- KH-2026-1042
  user_id                   uuid not null references public.profiles (id) on delete cascade,

  -- Customer snapshot at order time
  customer_name             text,
  customer_phone            text,
  customer_email            text,
  address                   jsonb not null default '{}'::jsonb,

  -- Pricing (always recalculated server-side — see create_order())
  subtotal                  numeric(10, 2) not null check (subtotal >= 0),
  tax                       numeric(10, 2) not null default 0 check (tax >= 0),
  delivery                  numeric(10, 2) not null default 0 check (delivery >= 0),
  discount                  numeric(10, 2) not null default 0 check (discount >= 0),
  total                     numeric(10, 2) not null check (total >= 0),

  -- Payment
  payment_method            public.payment_method not null,
  payment_gateway           public.payment_gateway not null default 'none',
  payment_status            public.payment_status not null default 'pending',
  razorpay_order_id         text,
  razorpay_payment_id       text,
  razorpay_signature        text,
  stripe_payment_intent_id  text,
  stripe_client_secret      text,
  paid_at                   timestamptz,

  -- Fulfilment
  status                    public.order_status not null default 'received',
  estimated_delivery        timestamptz,
  delivered_at              timestamptz,

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists orders_user_recent_idx     on public.orders (user_id, created_at desc);
create index if not exists orders_status_idx          on public.orders (status);
create index if not exists orders_payment_status_idx  on public.orders (payment_status);
create index if not exists orders_razorpay_order_idx  on public.orders (razorpay_order_id);
create index if not exists orders_stripe_intent_idx   on public.orders (stripe_payment_intent_id);

-- ─────────────────────────────────────────────────────────────
-- order_items — was the embedded `items[]` array
-- ─────────────────────────────────────────────────────────────
create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  product_id    uuid references public.products (id) on delete set null,
  name          text not null,
  chinese_name  text,
  image         text,
  price         numeric(10, 2) not null check (price >= 0),
  qty           integer not null check (qty > 0),
  line_total    numeric(10, 2) generated always as (price * qty) stored,
  created_at    timestamptz not null default now()
);

create index if not exists order_items_order_idx   on public.order_items (order_id);
create index if not exists order_items_product_idx on public.order_items (product_id);

-- ─────────────────────────────────────────────────────────────
-- order_tracking — was the embedded `tracking[]` array
-- ─────────────────────────────────────────────────────────────
create table if not exists public.order_tracking (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  stage       public.order_status not null,
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists order_tracking_order_idx on public.order_tracking (order_id, created_at);

-- ─────────────────────────────────────────────────────────────
-- reviews
-- ─────────────────────────────────────────────────────────────
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  text        text not null check (char_length(text) between 1 and 1000),
  user_name   text,
  location    text,
  verified    boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- One review per user per dish (was the Mongo compound unique index)
  constraint reviews_user_product_key unique (user_id, product_id)
);

create index if not exists reviews_product_recent_idx on public.reviews (product_id, created_at desc);
create index if not exists reviews_user_idx           on public.reviews (user_id);

-- ─────────────────────────────────────────────────────────────
-- favourites — was the `favourites[]` ObjectId array on users
-- ─────────────────────────────────────────────────────────────
create table if not exists public.favourites (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index if not exists favourites_product_idx on public.favourites (product_id);
