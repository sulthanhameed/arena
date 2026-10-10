-- ════════════════════════════════════════════════════════════════════════
--  Migration 002 · functions & triggers
--  Everything the Express/Mongoose middleware used to do now lives in
--  Postgres, so it cannot be bypassed by any client.
-- ════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- updated_at maintenance (was Mongoose `{ timestamps: true }`)
-- ─────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.addresses;
create trigger set_updated_at before update on public.addresses
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.categories;
create trigger set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.products;
create trigger set_updated_at before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.orders;
create trigger set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.reviews;
create trigger set_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- handle_new_user() — replaces POST /api/auth/signup
-- Supabase Auth inserts into auth.users; we mirror it into profiles.
-- ─────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, email, phone, role, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      initcap(replace(split_part(new.email, '@', 1), '.', ' ')),
      'Guest'
    ),
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', new.phone)), ''),
    case
      when coalesce(new.raw_user_meta_data ->> 'role', '') = 'admin' and
           coalesce(new.raw_app_meta_data ->> 'role', '') = 'admin'
        then 'admin'::public.user_role
      else 'user'::public.user_role
    end,
    nullif(trim(new.raw_user_meta_data ->> 'avatar_url'), '')
  )
  on conflict (id) do update
    set email = excluded.email,
        name  = coalesce(nullif(public.profiles.name, 'Guest'), excluded.name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profile email in sync when the user changes it in Supabase Auth
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- ─────────────────────────────────────────────────────────────
-- is_admin() — the RLS equivalent of the `adminOnly` middleware
-- ─────────────────────────────────────────────────────────────
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role = 'admin'
  );
$$;

grant execute on function public.is_admin(uuid) to authenticated, anon, service_role;

-- ─────────────────────────────────────────────────────────────
-- generate_order_number() — replaces utils/generateOrderId.js
-- Produces KH-2026-1042 (sequence-backed, so never collides)
-- ─────────────────────────────────────────────────────────────
create or replace function public.generate_order_number()
returns text
language sql
volatile
set search_path = ''
as $$
  select 'KH-' || to_char(now(), 'YYYY') || '-' ||
         lpad((nextval('public.order_number_seq') % 10000)::text, 4, '0');
$$;

-- ─────────────────────────────────────────────────────────────
-- First tracking event on insert (was the Mongoose pre-save hook)
-- ─────────────────────────────────────────────────────────────
create or replace function public.add_initial_tracking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.order_tracking (order_id, stage, note)
  values (new.id, 'received', 'Order received');
  return new;
end;
$$;

drop trigger if exists on_order_created on public.orders;
create trigger on_order_created
  after insert on public.orders
  for each row execute function public.add_initial_tracking();

-- ─────────────────────────────────────────────────────────────
-- Log a tracking row whenever the order status changes
-- ─────────────────────────────────────────────────────────────
create or replace function public.log_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    insert into public.order_tracking (order_id, stage, note)
    values (new.id, new.status, 'Status updated to ' || replace(new.status::text, '_', ' '));

    if new.status = 'delivered' and new.delivered_at is null then
      new.delivered_at := now();
    end if;
  end if;
  return new;
end;
$$;

-- BEFORE trigger so delivered_at can be set on the row itself
drop trigger if exists on_order_status_changed on public.orders;
create trigger on_order_status_changed
  before update of status on public.orders
  for each row execute function public.log_status_change();

-- ─────────────────────────────────────────────────────────────
-- Recalculate product rating / reviews_count
-- (replaces the $group aggregation in reviewController.js)
-- ─────────────────────────────────────────────────────────────
create or replace function public.refresh_product_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid := coalesce(new.product_id, old.product_id);
begin
  update public.products p
  set rating = coalesce(round(stats.avg_rating::numeric, 1), 4.5),
      reviews_count = coalesce(stats.total, 0)
  from (
    select avg(r.rating) as avg_rating, count(*) as total
    from public.reviews r
    where r.product_id = target
  ) as stats
  where p.id = target;

  return coalesce(new, old);
end;
$$;

drop trigger if exists on_review_changed on public.reviews;
create trigger on_review_changed
  after insert or update or delete on public.reviews
  for each row execute function public.refresh_product_rating();
