-- ════════════════════════════════════════════════════════════════════════
--  Migration 003 · RPC API
--
--  These functions replace the Express controllers. The frontend calls them
--  with supabase.rpc('…'), so there is no Node server to host anywhere.
--
--    POST /api/orders           → create_order()
--    GET  /api/orders/track/:id → track_order()
--    PUT  /api/orders/:id/status→ set_order_status()
--    POST /api/reviews          → submit_review()
--    GET  /api/orders (admin)   → RLS-protected select + admin_order_stats()
-- ════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- resolve_product() — accepts a uuid, a slug, or a legacy menu code
-- so the offline menu ids ('dim-001') keep working.
-- ─────────────────────────────────────────────────────────────
create or replace function public.resolve_product(p_ref text)
returns public.products
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  found public.products;
  as_uuid uuid;
begin
  begin
    as_uuid := p_ref::uuid;
  exception when others then
    as_uuid := null;
  end;

  select * into found
  from public.products p
  where (as_uuid is not null and p.id = as_uuid)
     or p.slug = p_ref
     or p.code = p_ref
  limit 1;

  return found;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- order_to_json() — one consistent order shape for every endpoint
-- ─────────────────────────────────────────────────────────────
create or replace function public.order_to_json(o public.orders)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id',                 o.id,
    'order_number',       o.order_number,
    'user_id',            o.user_id,
    'customer',           jsonb_build_object(
                            'name',  o.customer_name,
                            'phone', o.customer_phone,
                            'email', o.customer_email
                          ),
    'address',            o.address,
    'subtotal',           o.subtotal,
    'tax',                o.tax,
    'delivery',           o.delivery,
    'discount',           o.discount,
    'total',              o.total,
    'status',             o.status,
    'payment',            jsonb_build_object(
                            'method',  o.payment_method,
                            'gateway', o.payment_gateway,
                            'status',  o.payment_status,
                            'paid_at', o.paid_at
                          ),
    'estimated_delivery', o.estimated_delivery,
    'delivered_at',       o.delivered_at,
    'created_at',         o.created_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',           i.id,
        'product_id',   i.product_id,
        'name',         i.name,
        'chinese_name', i.chinese_name,
        'image',        i.image,
        'price',        i.price,
        'qty',          i.qty,
        'line_total',   i.line_total
      ) order by i.created_at)
      from public.order_items i where i.order_id = o.id
    ), '[]'::jsonb),
    'tracking', coalesce((
      select jsonb_agg(jsonb_build_object(
        'stage', t.stage,
        'note',  t.note,
        'at',    t.created_at
      ) order by t.created_at)
      from public.order_tracking t where t.order_id = o.id
    ), '[]'::jsonb)
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- create_order() — POST /api/orders
--
-- SECURITY DEFINER + no INSERT policy on `orders` means this is the ONLY
-- way an order can be created. Prices are read from the products table,
-- never from the client payload.
-- ─────────────────────────────────────────────────────────────
create or replace function public.create_order(
  p_items          jsonb,
  p_address        jsonb,
  p_customer       jsonb default '{}'::jsonb,
  p_payment_method text default 'cod'
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := auth.uid();
  v_profile   public.profiles;
  v_item      jsonb;
  v_product   public.products;
  v_qty       integer;
  v_subtotal  numeric(10,2) := 0;
  v_tax       numeric(10,2);
  v_delivery  numeric(10,2);
  v_total     numeric(10,2);
  v_method    public.payment_method;
  v_gateway   public.payment_gateway;
  v_order     public.orders;
  v_lines     jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'Not authorised — please sign in' using errcode = '42501';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty' using errcode = '22023';
  end if;

  if coalesce(trim(p_address ->> 'line1'), '') = '' then
    raise exception 'Delivery address is required' using errcode = '22023';
  end if;

  select * into v_profile from public.profiles where id = v_uid;

  begin
    v_method := p_payment_method::public.payment_method;
  exception when others then
    raise exception 'Unsupported payment method: %', p_payment_method using errcode = '22023';
  end;

  v_gateway := case
                 when v_method = 'cod' then 'cod'::public.payment_gateway
                 when v_method = 'card' then 'stripe'::public.payment_gateway
                 else 'razorpay'::public.payment_gateway
               end;

  -- ── Price the cart from the database ───────────────────────
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := greatest(coalesce((v_item ->> 'qty')::int, 1), 1);
    v_product := public.resolve_product(coalesce(v_item ->> 'product', v_item ->> 'product_id', v_item ->> 'id'));

    if v_product.id is null then
      raise exception 'Product not found: %', coalesce(v_item ->> 'product', '(missing)') using errcode = '22023';
    end if;
    if not v_product.in_stock then
      raise exception 'Sold out: %', v_product.name using errcode = '22023';
    end if;

    v_subtotal := v_subtotal + (v_product.price * v_qty);
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'product_id',   v_product.id,
      'name',         v_product.name,
      'chinese_name', v_product.chinese_name,
      'image',        v_product.image,
      'price',        v_product.price,
      'qty',          v_qty
    ));
  end loop;

  v_tax      := round(v_subtotal * 0.05, 2);                 -- 5% GST
  v_delivery := case when v_subtotal > 500 then 0 else 40 end; -- free over ₹500
  v_total    := v_subtotal + v_tax + v_delivery;

  -- ── Insert the order ───────────────────────────────────────
  insert into public.orders (
    order_number, user_id,
    customer_name, customer_phone, customer_email,
    address, subtotal, tax, delivery, total,
    payment_method, payment_gateway, payment_status,
    estimated_delivery
  ) values (
    public.generate_order_number(),
    v_uid,
    coalesce(nullif(trim(p_customer ->> 'name'), ''), v_profile.name),
    coalesce(nullif(trim(p_customer ->> 'phone'), ''), v_profile.phone),
    coalesce(nullif(trim(p_customer ->> 'email'), ''), v_profile.email),
    p_address,
    v_subtotal, v_tax, v_delivery, v_total,
    v_method, v_gateway, 'pending',
    now() + interval '35 minutes'
  )
  returning * into v_order;

  insert into public.order_items (order_id, product_id, name, chinese_name, image, price, qty)
  select v_order.id,
         (l ->> 'product_id')::uuid,
         l ->> 'name',
         l ->> 'chinese_name',
         l ->> 'image',
         (l ->> 'price')::numeric,
         (l ->> 'qty')::int
  from jsonb_array_elements(v_lines) as l;

  return public.order_to_json(v_order);
end;
$$;

grant execute on function public.create_order(jsonb, jsonb, jsonb, text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- track_order() — GET /api/orders/track/:orderId  (public, no auth)
-- Returns only the fields a delivery-tracking page needs.
-- ─────────────────────────────────────────────────────────────
create or replace function public.track_order(p_order_number text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  select * into v_order
  from public.orders
  where upper(order_number) = upper(trim(p_order_number));

  if v_order.id is null then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'order_number',       v_order.order_number,
    'status',             v_order.status,
    'total',              v_order.total,
    'customer_name',      v_order.customer_name,
    'estimated_delivery', v_order.estimated_delivery,
    'delivered_at',       v_order.delivered_at,
    'created_at',         v_order.created_at,
    'payment_status',     v_order.payment_status,
    'tracking', coalesce((
      select jsonb_agg(jsonb_build_object('stage', t.stage, 'note', t.note, 'at', t.created_at)
                       order by t.created_at)
      from public.order_tracking t where t.order_id = v_order.id
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.track_order(text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- set_order_status() — PUT /api/orders/:id/status  (admin only)
-- ─────────────────────────────────────────────────────────────
create or replace function public.set_order_status(
  p_order_id uuid,
  p_status   text,
  p_note     text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  update public.orders
  set status = p_status::public.order_status
  where id = p_order_id
  returning * into v_order;

  if v_order.id is null then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  if p_note is not null then
    update public.order_tracking
    set note = p_note
    where id = (select id from public.order_tracking
                where order_id = v_order.id order by created_at desc limit 1);
  end if;

  return public.order_to_json(v_order);
end;
$$;

grant execute on function public.set_order_status(uuid, text, text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- mark_order_paid() — called by the payment Edge Functions
-- (service_role only; webhooks and signature checks live in Deno)
-- ─────────────────────────────────────────────────────────────
create or replace function public.mark_order_paid(
  p_order_number text,
  p_gateway      text,
  p_payment_id   text default null,
  p_signature    text default null,
  p_status       text default 'paid'
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  update public.orders o
  set payment_status      = p_status::public.payment_status,
      payment_gateway     = p_gateway::public.payment_gateway,
      razorpay_payment_id = case when p_gateway = 'razorpay' then coalesce(p_payment_id, o.razorpay_payment_id) else o.razorpay_payment_id end,
      razorpay_signature  = case when p_gateway = 'razorpay' then coalesce(p_signature, o.razorpay_signature) else o.razorpay_signature end,
      paid_at             = case when p_status = 'paid' then coalesce(o.paid_at, now()) else o.paid_at end,
      status              = case when p_status = 'refunded' then 'cancelled'::public.order_status else o.status end
  where o.order_number = p_order_number
  returning * into v_order;

  if v_order.id is null then
    raise exception 'Order not found: %', p_order_number using errcode = 'P0002';
  end if;

  return public.order_to_json(v_order);
end;
$$;

revoke execute on function public.mark_order_paid(text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.mark_order_paid(text, text, text, text, text) to service_role;

-- ─────────────────────────────────────────────────────────────
-- submit_review() — POST /api/reviews
-- ─────────────────────────────────────────────────────────────
create or replace function public.submit_review(
  p_product   text,
  p_rating    integer,
  p_text      text,
  p_location  text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_product public.products;
  v_profile public.profiles;
  v_review  public.reviews;
begin
  if v_uid is null then
    raise exception 'Not authorised — please sign in' using errcode = '42501';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be 1-5' using errcode = '22023';
  end if;
  if coalesce(trim(p_text), '') = '' then
    raise exception 'Review text required' using errcode = '22023';
  end if;

  v_product := public.resolve_product(p_product);
  if v_product.id is null then
    raise exception 'Product not found' using errcode = 'P0002';
  end if;

  select * into v_profile from public.profiles where id = v_uid;

  insert into public.reviews (user_id, product_id, rating, text, user_name, location)
  values (v_uid, v_product.id, p_rating, trim(p_text), v_profile.name, p_location)
  on conflict (user_id, product_id) do update
    set rating = excluded.rating,
        text   = excluded.text,
        location = excluded.location
  returning * into v_review;

  return to_jsonb(v_review);
end;
$$;

grant execute on function public.submit_review(text, integer, text, text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- toggle_favourite()
-- ─────────────────────────────────────────────────────────────
create or replace function public.toggle_favourite(p_product uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_exists boolean;
begin
  if v_uid is null then
    raise exception 'Not authorised' using errcode = '42501';
  end if;

  select exists(select 1 from public.favourites where user_id = v_uid and product_id = p_product)
  into v_exists;

  if v_exists then
    delete from public.favourites where user_id = v_uid and product_id = p_product;
    return false;
  else
    insert into public.favourites (user_id, product_id) values (v_uid, p_product);
    return true;
  end if;
end;
$$;

grant execute on function public.toggle_favourite(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- admin_order_stats() — powers the admin dashboard header
-- ─────────────────────────────────────────────────────────────
create or replace function public.admin_order_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  return (
    select jsonb_build_object(
      'total_orders', count(*),
      'revenue',      coalesce(sum(total) filter (where payment_status = 'paid'), 0),
      'pending',      count(*) filter (where status not in ('delivered', 'cancelled')),
      'delivered',    count(*) filter (where status = 'delivered')
    )
    from public.orders
  );
end;
$$;

grant execute on function public.admin_order_stats() to authenticated;
