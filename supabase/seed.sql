-- ════════════════════════════════════════════════════════════════════════
--  Khang — seed data
--
--  Runs automatically on `supabase db reset` (local) and can be replayed
--  against a hosted project with:
--      psql "$SUPABASE_DB_URL" -f supabase/seed.sql
--
--  Idempotent: every statement upserts on a natural key.
-- ════════════════════════════════════════════════════════════════════════

-- ─── Categories ─────────────────────────────────────────────
insert into public.categories (name, slug, icon, sort_order) values
  ('Dim Sum', 'dim-sum', '🥟', 1),
  ('Noodles & Soups', 'noodles-soups', '🍜', 2),
  ('Rice & Curry', 'rice-curry', '🍛', 3),
  ('Snacks', 'snacks', '🍟', 4),
  ('Drinks', 'drinks', '🥤', 5)
on conflict (slug) do update
  set name = excluded.name,
      icon = excluded.icon,
      sort_order = excluded.sort_order;

-- ─── Products (17 dishes) ───────────────────────────────────
-- `code` keeps parity with the offline menu ids in src/data/menu.ts
insert into public.products
  (code, name, chinese_name, slug, category_id, price, description, ingredients, image,
   rating, reviews_count, spicy, veg, featured, prep_time)
values
  ('dim-001', 'Khang Special Veg Momo', '康式素饺', 'khang-special-veg-momo',
   (select id from public.categories where name = 'Dim Sum'),
   180, 'Hand-folded steamed dumplings stuffed with cabbage, carrot, bell pepper and a hint of ginger-garlic. Served with our signature schezwan dip.',
   array['Refined flour', 'Cabbage', 'Carrot', 'Spring onion', 'Ginger', 'Garlic', 'Sesame oil'],
   'https://images.pexels.com/photos/35144940/pexels-photo-35144940.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=600',
   4.8, 412, 1, true, true, '15 min'),
  ('dim-002', 'Chicken Dimsum Basket', '鸡肉点心', 'chicken-dimsum-basket',
   (select id from public.categories where name = 'Dim Sum'),
   240, 'Delicate translucent wrappers cradling minced chicken seasoned with soy, sesame, and a touch of white pepper. Steamed in bamboo baskets.',
   array['Chicken mince', 'Wheat starch', 'Soy', 'Sesame', 'Coriander', 'White pepper'],
   'https://images.pexels.com/photos/32393812/pexels-photo-32393812.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=600',
   4.9, 587, 1, false, true, '18 min'),
  ('dim-003', 'Pan-Fried Chicken Momo', '煎鸡饺', 'pan-fried-chicken-momo',
   (select id from public.categories where name = 'Dim Sum'),
   260, 'Steamed first, then pan-seared to golden perfection. Crisp base, juicy chicken filling, served with chilli-garlic oil.',
   array['Chicken', 'Garlic', 'Soy', 'Chilli oil', 'Spring onion'],
   'https://images.pexels.com/photos/14457519/pexels-photo-14457519.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600',
   4.7, 318, 2, false, true, '20 min'),
  ('dim-004', 'Crystal Prawn Hargao', '虾饺', 'crystal-prawn-hargao',
   (select id from public.categories where name = 'Dim Sum'),
   320, 'Cantonese classic — succulent prawn wrapped in glass-thin wheat starch skins. Each piece pleated by hand.',
   array['Prawn', 'Bamboo shoot', 'Wheat starch', 'Tapioca', 'Sesame oil'],
   'https://images.pexels.com/photos/27039841/pexels-photo-27039841.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=600',
   4.9, 246, 0, false, true, '22 min'),
  ('noo-001', 'Hakka Chow Mein', '客家炒面', 'hakka-chow-mein',
   (select id from public.categories where name = 'Noodles & Soups'),
   220, 'Smoky wok-tossed noodles with crunchy julienned vegetables in a savoury soy & sesame glaze. The wok-hei is real.',
   array['Hakka noodles', 'Cabbage', 'Capsicum', 'Carrot', 'Soy', 'Sesame'],
   'https://images.pexels.com/photos/14853728/pexels-photo-14853728.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600',
   4.6, 521, 1, true, true, '12 min'),
  ('noo-002', 'Schezwan Chicken Noodles', '川味鸡肉面', 'schezwan-chicken-noodles',
   (select id from public.categories where name = 'Noodles & Soups'),
   280, 'Fiery Schezwan-style noodles tossed with shredded chicken, bell peppers and our house chilli-bean paste.',
   array['Noodles', 'Chicken', 'Schezwan sauce', 'Capsicum', 'Garlic'],
   'https://images.pexels.com/photos/12737657/pexels-photo-12737657.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600',
   4.7, 389, 3, false, false, '14 min'),
  ('noo-003', 'Hot & Sour Soup', '酸辣汤', 'hot-sour-soup',
   (select id from public.categories where name = 'Noodles & Soups'),
   160, 'The original — black pepper, vinegar, mushrooms, tofu and silken egg ribbons in a velvety broth.',
   array['Vegetable stock', 'Tofu', 'Mushroom', 'Egg', 'Vinegar', 'Pepper'],
   'https://images.pexels.com/photos/18698263/pexels-photo-18698263.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600',
   4.5, 284, 2, true, false, '10 min'),
  ('noo-004', 'Sweet Corn Chicken Soup', '玉米鸡汤', 'sweet-corn-chicken-soup',
   (select id from public.categories where name = 'Noodles & Soups'),
   170, 'Comfort in a bowl — silky corn soup with shredded chicken and a swirl of egg.',
   array['Sweet corn', 'Chicken', 'Egg', 'Cornflour', 'Pepper'],
   'https://images.pexels.com/photos/10966377/pexels-photo-10966377.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600',
   4.4, 192, 0, false, false, '10 min'),
  ('ric-001', 'Veg Triple Schezwan Rice', '三重川味饭', 'veg-triple-schezwan-rice',
   (select id from public.categories where name = 'Rice & Curry'),
   260, 'Layered tower of fried rice, hakka noodles and Schezwan gravy crowned with crispy veggies. A meal in itself.',
   array['Basmati rice', 'Noodles', 'Schezwan gravy', 'Mixed veg'],
   'https://images.pexels.com/photos/24334865/pexels-photo-24334865.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600',
   4.7, 433, 2, true, true, '16 min'),
  ('ric-002', 'Chicken Fried Rice', '鸡肉炒饭', 'chicken-fried-rice',
   (select id from public.categories where name = 'Rice & Curry'),
   240, 'Long-grain rice tossed with chicken, egg, spring onion and a kiss of dark soy. Simple, smoky, perfect.',
   array['Basmati rice', 'Chicken', 'Egg', 'Spring onion', 'Soy'],
   'https://images.pexels.com/photos/343871/pexels-photo-343871.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600',
   4.6, 367, 1, false, false, '12 min'),
  ('ric-003', 'Chilli Chicken Gravy', '辣子鸡', 'chilli-chicken-gravy',
   (select id from public.categories where name = 'Rice & Curry'),
   290, 'Crispy chicken bites in a glossy, fiery sauce of green chilli, garlic and soy. Best with steamed rice.',
   array['Chicken', 'Green chilli', 'Garlic', 'Soy', 'Vinegar', 'Capsicum'],
   'https://images.pexels.com/photos/29631426/pexels-photo-29631426.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600',
   4.8, 511, 3, false, true, '15 min'),
  ('ric-004', 'Veg Manchurian Dry', '素满洲', 'veg-manchurian-dry',
   (select id from public.categories where name = 'Rice & Curry'),
   220, 'Golden-fried vegetable balls tossed in a tangy Indo-Chinese sauce with ginger, garlic and spring onion.',
   array['Mixed vegetables', 'Cornflour', 'Soy', 'Ginger', 'Garlic'],
   'https://images.pexels.com/photos/28674543/pexels-photo-28674543.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600',
   4.6, 298, 2, true, false, '14 min'),
  ('sna-001', 'Crispy Veg Spring Rolls', '春卷', 'crispy-veg-spring-rolls',
   (select id from public.categories where name = 'Snacks'),
   160, 'Paper-thin wrappers around a julienne of cabbage, carrot and noodles — fried until shatter-crisp.',
   array['Spring roll sheets', 'Cabbage', 'Carrot', 'Noodles', 'Soy'],
   'https://images.pexels.com/photos/37106473/pexels-photo-37106473.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600',
   4.5, 276, 1, true, false, '10 min'),
  ('sna-002', 'Chilli Paneer Dry', '辣椒奶酪', 'chilli-paneer-dry',
   (select id from public.categories where name = 'Snacks'),
   250, 'Cubes of soft paneer wok-tossed with bell peppers, soy, and green chilli — a vegetarian crowd-pleaser.',
   array['Paneer', 'Bell pepper', 'Soy', 'Green chilli', 'Garlic'],
   'https://images.pexels.com/photos/29631468/pexels-photo-29631468.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600',
   4.7, 341, 2, true, false, '12 min'),
  ('sna-003', 'Honey Chilli Potato', '蜜辣土豆', 'honey-chilli-potato',
   (select id from public.categories where name = 'Snacks'),
   180, 'Twice-fried potato strips glazed in honey, chilli and sesame. Sticky, sweet, spicy — all at once.',
   array['Potato', 'Honey', 'Red chilli', 'Sesame seeds', 'Soy'],
   'https://images.pexels.com/photos/30709506/pexels-photo-30709506.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600',
   4.6, 412, 2, true, false, '12 min'),
  ('dri-001', 'Jasmine Green Tea', '茉莉绿茶', 'jasmine-green-tea',
   (select id from public.categories where name = 'Drinks'),
   90, 'Hand-rolled jasmine pearls steeped to release a floral, calming aroma. The traditional accompaniment to dim sum.',
   array['Jasmine green tea leaves', 'Hot water'],
   'https://images.pexels.com/photos/36299339/pexels-photo-36299339.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=600',
   4.6, 156, 0, true, false, '5 min'),
  ('dri-002', 'Lychee Iced Cooler', '荔枝冰饮', 'lychee-iced-cooler',
   (select id from public.categories where name = 'Drinks'),
   140, 'Sweet lychee pulp shaken with lime, mint and crushed ice. A summer favourite.',
   array['Lychee', 'Lime', 'Mint', 'Sugar syrup', 'Ice'],
   'https://images.pexels.com/photos/37659704/pexels-photo-37659704.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=600',
   4.5, 198, 0, true, false, '5 min')
on conflict (slug) do update
  set code          = excluded.code,
      name          = excluded.name,
      chinese_name  = excluded.chinese_name,
      category_id   = excluded.category_id,
      price         = excluded.price,
      description   = excluded.description,
      ingredients   = excluded.ingredients,
      image         = excluded.image,
      spicy         = excluded.spicy,
      veg           = excluded.veg,
      featured      = excluded.featured,
      prep_time     = excluded.prep_time;

-- ════════════════════════════════════════════════════════════
--  Admin bootstrap — admin@khang.com / admin123
--
--  Creates a real Supabase Auth user (not a row in some `users`
--  collection) so you can sign in through the normal login form.
--  ⚠ CHANGE THE PASSWORD BEFORE GOING LIVE.
--
--  On a hosted project you can instead create the user in
--  Dashboard → Authentication → Users, then run:
--      update public.profiles set role = 'admin' where email = 'you@example.com';
-- ════════════════════════════════════════════════════════════
do $$
declare
  v_uid      uuid;
  v_email    text := 'admin@khang.com';
  v_password text := 'admin123';
begin
  if to_regclass('auth.users') is null then
    raise notice 'auth schema not found — skipping admin bootstrap';
    return;
  end if;

  select id into v_uid from auth.users where email = v_email;

  if v_uid is null then
    v_uid := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_uid, 'authenticated', 'authenticated', v_email,
      extensions.crypt(v_password, extensions.gen_salt('bf')),
      now(),
      jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', 'admin'),
      jsonb_build_object('name', 'Admin', 'role', 'admin'),
      now(), now()
    );

    begin
      insert into auth.identities (
        id, user_id, provider_id, identity_data, provider,
        last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(), v_uid, v_uid::text,
        jsonb_build_object('sub', v_uid::text, 'email', v_email, 'email_verified', true),
        'email', now(), now(), now()
      );
    exception when undefined_column then
      insert into auth.identities (
        id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(), v_uid,
        jsonb_build_object('sub', v_uid::text, 'email', v_email),
        'email', now(), now(), now()
      );
    end;

    raise notice 'Created admin auth user % / %', v_email, v_password;
  end if;

  -- handle_new_user() already made the profile; make sure it is an admin
  insert into public.profiles (id, name, email, role)
  values (v_uid, 'Admin', v_email, 'admin')
  on conflict (id) do update set role = 'admin', name = 'Admin';
end $$;

-- ─── Summary ────────────────────────────────────────────────
do $$
declare
  c_cat int; c_prod int;
begin
  select count(*) into c_cat  from public.categories;
  select count(*) into c_prod from public.products;
  raise notice '🌱 Seed complete — % categories, % products', c_cat, c_prod;
end $$;
