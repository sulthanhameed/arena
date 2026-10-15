-- Khang on Supabase
-- PostgreSQL schema, RLS rules, triggers, and server-only RPCs.

begin;

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- Domain types
-- ─────────────────────────────────────────────────────────────
do $$
begin
  create type public.app_role as enum ('user', 'admin');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.order_status as enum (
    'received',
    'preparing',
    'out_for_delivery',
    'delivered',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_method as enum ('upi', 'card', 'wallet', 'cod', 'stripe', 'razorpay');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_gateway as enum ('razorpay', 'stripe', 'cod', 'none');
exception
  when duplicate_object then null;
end $$;

-- ─────────────────────────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  role public.app_role not null default 'user',
  avatar_url text,
  addresses jsonb not null default '[]'::jsonb check (jsonb_typeof(addresses) = 'array'),
  favourites text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  slug text primary key,
  name text not null unique,
  icon text,
  description text,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  -- Text IDs intentionally match the frontend menu IDs (for example dim-001).
  id text primary key,
  slug text not null unique,
  category_slug text not null references public.categories(slug) on update cascade,
  name text not null check (char_length(btrim(name)) > 0),
  chinese_name text,
  price numeric(12, 2) not null check (price >= 0),
  description text not null,
  ingredients text[] not null default '{}'::text[],
  image text not null,
  images text[] not null default '{}'::text[],
  rating numeric(2, 1) not null default 4.5 check (rating >= 0 and rating <= 5),
  reviews_count integer not null default 0 check (reviews_count >= 0),
  spicy smallint not null default 0 check (spicy between 0 and 3),
  veg boolean not null default true,
  featured boolean not null default false,
  prep_time text not null default '15 min',
  in_stock boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  user_id uuid not null references auth.users(id) on delete restrict,
  customer_name text not null,
  customer_phone text,
  customer_email text,
  address jsonb not null default '{}'::jsonb check (jsonb_typeof(address) = 'object'),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  tax numeric(12, 2) not null check (tax >= 0),
  delivery numeric(12, 2) not null default 0 check (delivery >= 0),
  discount numeric(12, 2) not null default 0 check (discount >= 0),
  total numeric(12, 2) not null check (total >= 0),
  payment_method public.payment_method not null,
  payment_gateway public.payment_gateway not null default 'none',
  payment_status public.payment_status not null default 'pending',
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  razorpay_signature text,
  stripe_payment_intent_id text unique,
  paid_at timestamptz,
  status public.order_status not null default 'received',
  estimated_delivery timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null references public.products(id) on delete restrict,
  name text not null,
  chinese_name text,
  image text,
  price numeric(12, 2) not null check (price >= 0),
  qty integer not null check (qty > 0 and qty <= 99),
  unique (order_id, product_id)
);

create table if not exists public.order_tracking (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  stage public.order_status not null,
  note text,
  at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  text text not null check (char_length(btrim(text)) between 1 and 1000),
  user_name text not null,
  location text,
  verified boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);

-- ─────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────
create index if not exists categories_sort_order_idx on public.categories (sort_order);
create index if not exists products_category_slug_idx on public.products (category_slug);
create index if not exists products_featured_idx on public.products (featured) where featured;
create index if not exists products_name_search_idx on public.products using gin (
  to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(chinese_name, '') || ' ' || coalesce(description, ''))
);
create index if not exists orders_user_created_at_idx on public.orders (user_id, created_at desc);
create index if not exists orders_status_idx on public.orders (status, created_at desc);
create index if not exists orders_payment_status_idx on public.orders (payment_status, created_at desc);
create index if not exists order_tracking_order_at_idx on public.order_tracking (order_id, at);
create index if not exists reviews_product_created_at_idx on public.reviews (product_id, created_at desc);

-- ─────────────────────────────────────────────────────────────
-- Common timestamps and Auth profile bootstrap
-- ─────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, phone)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Khang Guest'
    ),
    nullif(btrim(new.raw_user_meta_data ->> 'phone'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute procedure public.set_updated_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute procedure public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute procedure public.set_updated_at();

drop trigger if exists reviews_set_updated_at on public.reviews;
create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute procedure public.set_updated_at();

-- A review updates the already-published rating/count incrementally. This
-- preserves the initial editorial ratings included in the menu seed.
create or replace function public.apply_review_rating_delta()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.products
      set rating = round(((rating * reviews_count) + new.rating) / (reviews_count + 1), 1),
          reviews_count = reviews_count + 1
      where id = new.product_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.products
      set rating = case
            when reviews_count <= 1 then 4.5
            else round(((rating * reviews_count) - old.rating) / (reviews_count - 1), 1)
          end,
          reviews_count = greatest(reviews_count - 1, 0)
      where id = old.product_id;
    return old;
  end if;

  if new.product_id = old.product_id and new.rating is distinct from old.rating then
    update public.products
      set rating = round(((rating * reviews_count) - old.rating + new.rating) / greatest(reviews_count, 1), 1)
      where id = new.product_id;
  end if;
  return new;
end;
$$;

drop trigger if exists reviews_apply_rating_delta on public.reviews;
create trigger reviews_apply_rating_delta
  after insert or update of rating or delete on public.reviews
  for each row execute procedure public.apply_review_rating_delta();

-- ─────────────────────────────────────────────────────────────
-- Server-only helpers. The Edge Function calls these with service_role;
-- browser roles are explicitly denied execution below.
-- ─────────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create sequence if not exists public.order_number_seq start with 1000;

create or replace function public.create_restaurant_order(
  p_user_id uuid,
  p_items jsonb,
  p_customer_name text,
  p_customer_phone text,
  p_address jsonb,
  p_payment_method public.payment_method
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid;
  v_order_code text;
  v_subtotal numeric(12, 2) := 0;
  v_tax numeric(12, 2);
  v_delivery numeric(12, 2);
  v_total numeric(12, 2);
  v_gateway public.payment_gateway;
  v_email text;
  v_product public.products%rowtype;
  v_item record;
  v_item_count integer := 0;
begin
  if p_user_id is null or not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'Authenticated user is required';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;

  if nullif(btrim(p_customer_name), '') is null then
    raise exception 'Customer name is required';
  end if;

  if p_address is null
    or jsonb_typeof(p_address) <> 'object'
    or nullif(btrim(p_address ->> 'line1'), '') is null then
    raise exception 'Delivery address is required';
  end if;

  if p_payment_method is null then
    raise exception 'Payment method is required';
  end if;

  for v_item in
    select
      nullif(btrim(item ->> 'product'), '') as product_id,
      sum((item ->> 'qty')::integer)::integer as qty
    from jsonb_array_elements(p_items) as item
    group by nullif(btrim(item ->> 'product'), '')
  loop
    if v_item.product_id is null or v_item.qty is null or v_item.qty < 1 or v_item.qty > 99 then
      raise exception 'Every cart item needs a valid product and quantity';
    end if;

    select *
      into v_product
      from public.products
      where id = v_item.product_id and in_stock = true
      for share;

    if not found then
      raise exception 'Product % is unavailable', v_item.product_id;
    end if;

    v_subtotal := v_subtotal + (v_product.price * v_item.qty);
    v_item_count := v_item_count + 1;
  end loop;

  if v_item_count = 0 then
    raise exception 'Cart is empty';
  end if;

  v_tax := round(v_subtotal * 0.05, 2);
  v_delivery := case when v_subtotal > 500 then 0 else 40 end;
  v_total := v_subtotal + v_tax + v_delivery;
  v_gateway := case
    when p_payment_method = 'cod' then 'cod'::public.payment_gateway
    else 'razorpay'::public.payment_gateway
  end;

  select email into v_email from auth.users where id = p_user_id;
  v_order_code := 'KH-' || to_char(current_date, 'YYYY') || '-' || lpad(nextval('public.order_number_seq')::text, 6, '0');

  insert into public.orders (
    order_code,
    user_id,
    customer_name,
    customer_phone,
    customer_email,
    address,
    subtotal,
    tax,
    delivery,
    total,
    payment_method,
    payment_gateway,
    payment_status,
    status,
    estimated_delivery
  )
  values (
    v_order_code,
    p_user_id,
    btrim(p_customer_name),
    nullif(btrim(p_customer_phone), ''),
    v_email,
    p_address,
    v_subtotal,
    v_tax,
    v_delivery,
    v_total,
    p_payment_method,
    v_gateway,
    'pending',
    'received',
    now() + interval '35 minutes'
  )
  returning id into v_order_id;

  for v_item in
    select
      nullif(btrim(item ->> 'product'), '') as product_id,
      sum((item ->> 'qty')::integer)::integer as qty
    from jsonb_array_elements(p_items) as item
    group by nullif(btrim(item ->> 'product'), '')
  loop
    select * into v_product from public.products where id = v_item.product_id;

    insert into public.order_items (
      order_id,
      product_id,
      name,
      chinese_name,
      image,
      price,
      qty
    )
    values (
      v_order_id,
      v_product.id,
      v_product.name,
      v_product.chinese_name,
      v_product.image,
      v_product.price,
      v_item.qty
    );
  end loop;

  insert into public.order_tracking (order_id, stage, note)
  values (v_order_id, 'received', 'Order received');

  return v_order_id;
end;
$$;

create or replace function public.update_restaurant_order_status(
  p_order_id uuid,
  p_status public.order_status,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
    set status = p_status,
        delivered_at = case
          when p_status = 'delivered' then coalesce(delivered_at, now())
          else delivered_at
        end
    where id = p_order_id;

  if not found then
    raise exception 'Order not found';
  end if;

  insert into public.order_tracking (order_id, stage, note)
  values (p_order_id, p_status, nullif(btrim(p_note), ''));
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Row Level Security. Browser users can read only public menu/reviews and
-- their own profile. All writes, orders, payment mutations, and admin work
-- pass through the Edge Function using the service role.
-- ─────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_tracking enable row level security;
alter table public.reviews enable row level security;

create policy "Public can read categories"
  on public.categories for select
  to anon, authenticated
  using (true);

create policy "Public can read in-stock menu products"
  on public.products for select
  to anon, authenticated
  using (in_stock = true);

create policy "Public can read reviews"
  on public.reviews for select
  to anon, authenticated
  using (true);

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

-- Make the intended browser surface explicit even if a project has permissive
-- defaults from an older setup.
revoke all on table public.profiles, public.categories, public.products, public.orders,
  public.order_items, public.order_tracking, public.reviews from anon, authenticated;
grant select on table public.categories, public.products, public.reviews to anon, authenticated;
grant select on table public.profiles to authenticated;

revoke all on function public.create_restaurant_order(uuid, jsonb, text, text, jsonb, public.payment_method)
  from public, anon, authenticated;
grant execute on function public.create_restaurant_order(uuid, jsonb, text, text, jsonb, public.payment_method)
  to service_role;

revoke all on function public.update_restaurant_order_status(uuid, public.order_status, text)
  from public, anon, authenticated;
grant execute on function public.update_restaurant_order_status(uuid, public.order_status, text)
  to service_role;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

commit;
