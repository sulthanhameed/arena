-- ════════════════════════════════════════════════════════════════════════
--  Migration 004 · Row Level Security
--
--  This is the replacement for `middleware/auth.js` (protect / adminOnly).
--  Authorisation is enforced by the database itself, so it applies to every
--  client — the web app, a mobile app, curl, anything.
-- ════════════════════════════════════════════════════════════════════════

-- ─── Table grants (PostgREST needs these before RLS even matters) ───
grant usage on schema public to anon, authenticated, service_role;

grant select on public.categories, public.products to anon, authenticated;
grant select on public.reviews to anon, authenticated;
grant select, insert, update, delete on public.reviews to authenticated;
grant select, insert, update, delete on public.addresses, public.favourites to authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.orders, public.order_items, public.order_tracking to authenticated;
grant update on public.orders to authenticated;         -- narrowed by RLS to admins
grant insert, update, delete on public.categories, public.products to authenticated; -- admin-only via RLS
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ─── Enable RLS everywhere ───
alter table public.profiles        enable row level security;
alter table public.addresses       enable row level security;
alter table public.categories      enable row level security;
alter table public.products        enable row level security;
alter table public.orders          enable row level security;
alter table public.order_items     enable row level security;
alter table public.order_tracking  enable row level security;
alter table public.reviews         enable row level security;
alter table public.favourites      enable row level security;

-- ════════════════════════════════════════════════════════════
-- profiles
-- ════════════════════════════════════════════════════════════
drop policy if exists "profiles: read own or admin" on public.profiles;
create policy "profiles: read own or admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Block privilege escalation: only an admin may change the `role` column.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- auth.uid() is null for service_role / SQL-console calls, which are trusted
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only an admin can change a user role' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_role on public.profiles;
create trigger guard_profile_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- ════════════════════════════════════════════════════════════
-- addresses — strictly owner-scoped
-- ════════════════════════════════════════════════════════════
drop policy if exists "addresses: owner full access" on public.addresses;
create policy "addresses: owner full access" on public.addresses
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ════════════════════════════════════════════════════════════
-- categories & products — world readable, admin writable
-- (this is what makes the menu load without any API server)
-- ════════════════════════════════════════════════════════════
drop policy if exists "categories: public read" on public.categories;
create policy "categories: public read" on public.categories
  for select to anon, authenticated using (true);

drop policy if exists "categories: admin write" on public.categories;
create policy "categories: admin write" on public.categories
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products: public read" on public.products;
create policy "products: public read" on public.products
  for select to anon, authenticated using (true);

drop policy if exists "products: admin write" on public.products;
create policy "products: admin write" on public.products
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ════════════════════════════════════════════════════════════
-- orders
--   • read  → owner or admin
--   • write → admin only (and create_order(), which is SECURITY DEFINER)
--   There is deliberately NO insert policy: clients cannot invent an order
--   with their own prices.
-- ════════════════════════════════════════════════════════════
drop policy if exists "orders: read own or admin" on public.orders;
create policy "orders: read own or admin" on public.orders
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "orders: admin update" on public.orders;
create policy "orders: admin update" on public.orders
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ── order_items ──
drop policy if exists "order_items: read via parent order" on public.order_items;
create policy "order_items: read via parent order" on public.order_items
  for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and (o.user_id = auth.uid() or public.is_admin())
  ));

-- ── order_tracking ──
drop policy if exists "order_tracking: read via parent order" on public.order_tracking;
create policy "order_tracking: read via parent order" on public.order_tracking
  for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_tracking.order_id
      and (o.user_id = auth.uid() or public.is_admin())
  ));

-- ════════════════════════════════════════════════════════════
-- reviews — public read, authenticated write-own
-- ════════════════════════════════════════════════════════════
drop policy if exists "reviews: public read" on public.reviews;
create policy "reviews: public read" on public.reviews
  for select to anon, authenticated using (true);

drop policy if exists "reviews: insert own" on public.reviews;
create policy "reviews: insert own" on public.reviews
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "reviews: update own" on public.reviews;
create policy "reviews: update own" on public.reviews
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "reviews: delete own or admin" on public.reviews;
create policy "reviews: delete own or admin" on public.reviews
  for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ════════════════════════════════════════════════════════════
-- favourites — owner only
-- ════════════════════════════════════════════════════════════
drop policy if exists "favourites: owner full access" on public.favourites;
create policy "favourites: owner full access" on public.favourites
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ─── Realtime: let the app subscribe to live order updates ───
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.orders;
    alter publication supabase_realtime add table public.order_tracking;
  end if;
exception when duplicate_object then null;
end $$;
