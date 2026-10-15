-- Khang menu seed for Supabase.
-- Product IDs deliberately match src/data/menu.ts so checkout requests are valid.

insert into public.categories (slug, name, icon, description, sort_order)
values
  ('dim-sum', 'Dim Sum', '🥟', null, 1),
  ('noodles-soups', 'Noodles & Soups', '🍜', null, 2),
  ('rice-curry', 'Rice & Curry', '🍛', null, 3),
  ('snacks', 'Snacks', '🍟', null, 4),
  ('drinks', 'Drinks', '🥤', null, 5)
on conflict (slug) do update set
  name = excluded.name,
  icon = excluded.icon,
  description = excluded.description,
  sort_order = excluded.sort_order;

insert into public.products (
  id, slug, category_slug, name, chinese_name, price, description, ingredients, image, images,
  rating, reviews_count, spicy, veg, featured, prep_time, in_stock
values
  ('dim-001', 'khang-special-veg-momo', 'dim-sum', 'Khang Special Veg Momo', '康式素饺', 180, 'Hand-folded steamed dumplings stuffed with cabbage, carrot, bell pepper and a hint of ginger-garlic. Served with our signature schezwan dip.', ARRAY['Refined flour', 'Cabbage', 'Carrot', 'Spring onion', 'Ginger', 'Garlic', 'Sesame oil']::text[], 'https://images.pexels.com/photos/35144940/pexels-photo-35144940.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=600', '{}'::text[], 4.8, 412, 1, true, true, '15 min', true),
  ('dim-002', 'chicken-dimsum-basket', 'dim-sum', 'Chicken Dimsum Basket', '鸡肉点心', 240, 'Delicate translucent wrappers cradling minced chicken seasoned with soy, sesame, and a touch of white pepper. Steamed in bamboo baskets.', ARRAY['Chicken mince', 'Wheat starch', 'Soy', 'Sesame', 'Coriander', 'White pepper']::text[], 'https://images.pexels.com/photos/32393812/pexels-photo-32393812.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=600', '{}'::text[], 4.9, 587, 1, false, true, '18 min', true),
  ('dim-003', 'pan-fried-chicken-momo', 'dim-sum', 'Pan-Fried Chicken Momo', '煎鸡饺', 260, 'Steamed first, then pan-seared to golden perfection. Crisp base, juicy chicken filling, served with chilli-garlic oil.', ARRAY['Chicken', 'Garlic', 'Soy', 'Chilli oil', 'Spring onion']::text[], 'https://images.pexels.com/photos/14457519/pexels-photo-14457519.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600', '{}'::text[], 4.7, 318, 2, false, true, '20 min', true),
  ('dim-004', 'crystal-prawn-hargao', 'dim-sum', 'Crystal Prawn Hargao', '虾饺', 320, 'Cantonese classic — succulent prawn wrapped in glass-thin wheat starch skins. Each piece pleated by hand.', ARRAY['Prawn', 'Bamboo shoot', 'Wheat starch', 'Tapioca', 'Sesame oil']::text[], 'https://images.pexels.com/photos/27039841/pexels-photo-27039841.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=600', '{}'::text[], 4.9, 246, 0, false, true, '22 min', true),
  ('noo-001', 'hakka-chow-mein', 'noodles-soups', 'Hakka Chow Mein', '客家炒面', 220, 'Smoky wok-tossed noodles with crunchy julienned vegetables in a savoury soy & sesame glaze. The wok-hei is real.', ARRAY['Hakka noodles', 'Cabbage', 'Capsicum', 'Carrot', 'Soy', 'Sesame']::text[], 'https://images.pexels.com/photos/14853728/pexels-photo-14853728.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600', '{}'::text[], 4.6, 521, 1, true, true, '12 min', true),
  ('noo-002', 'schezwan-chicken-noodles', 'noodles-soups', 'Schezwan Chicken Noodles', '川味鸡肉面', 280, 'Fiery Schezwan-style noodles tossed with shredded chicken, bell peppers and our house chilli-bean paste.', ARRAY['Noodles', 'Chicken', 'Schezwan sauce', 'Capsicum', 'Garlic']::text[], 'https://images.pexels.com/photos/12737657/pexels-photo-12737657.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600', '{}'::text[], 4.7, 389, 3, false, false, '14 min', true),
  ('noo-003', 'hot-sour-soup', 'noodles-soups', 'Hot & Sour Soup', '酸辣汤', 160, 'The original — black pepper, vinegar, mushrooms, tofu and silken egg ribbons in a velvety broth.', ARRAY['Vegetable stock', 'Tofu', 'Mushroom', 'Egg', 'Vinegar', 'Pepper']::text[], 'https://images.pexels.com/photos/18698263/pexels-photo-18698263.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600', '{}'::text[], 4.5, 284, 2, true, false, '10 min', true),
  ('noo-004', 'sweet-corn-chicken-soup', 'noodles-soups', 'Sweet Corn Chicken Soup', '玉米鸡汤', 170, 'Comfort in a bowl — silky corn soup with shredded chicken and a swirl of egg.', ARRAY['Sweet corn', 'Chicken', 'Egg', 'Cornflour', 'Pepper']::text[], 'https://images.pexels.com/photos/10966377/pexels-photo-10966377.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600', '{}'::text[], 4.4, 192, 0, false, false, '10 min', true),
  ('ric-001', 'veg-triple-schezwan-rice', 'rice-curry', 'Veg Triple Schezwan Rice', '三重川味饭', 260, 'Layered tower of fried rice, hakka noodles and Schezwan gravy crowned with crispy veggies. A meal in itself.', ARRAY['Basmati rice', 'Noodles', 'Schezwan gravy', 'Mixed veg']::text[], 'https://images.pexels.com/photos/24334865/pexels-photo-24334865.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600', '{}'::text[], 4.7, 433, 2, true, true, '16 min', true),
  ('ric-002', 'chicken-fried-rice', 'rice-curry', 'Chicken Fried Rice', '鸡肉炒饭', 240, 'Long-grain rice tossed with chicken, egg, spring onion and a kiss of dark soy. Simple, smoky, perfect.', ARRAY['Basmati rice', 'Chicken', 'Egg', 'Spring onion', 'Soy']::text[], 'https://images.pexels.com/photos/343871/pexels-photo-343871.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600', '{}'::text[], 4.6, 367, 1, false, false, '12 min', true),
  ('ric-003', 'chilli-chicken-gravy', 'rice-curry', 'Chilli Chicken Gravy', '辣子鸡', 290, 'Crispy chicken bites in a glossy, fiery sauce of green chilli, garlic and soy. Best with steamed rice.', ARRAY['Chicken', 'Green chilli', 'Garlic', 'Soy', 'Vinegar', 'Capsicum']::text[], 'https://images.pexels.com/photos/29631426/pexels-photo-29631426.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600', '{}'::text[], 4.8, 511, 3, false, true, '15 min', true),
  ('ric-004', 'veg-manchurian-dry', 'rice-curry', 'Veg Manchurian Dry', '素满洲', 220, 'Golden-fried vegetable balls tossed in a tangy Indo-Chinese sauce with ginger, garlic and spring onion.', ARRAY['Mixed vegetables', 'Cornflour', 'Soy', 'Ginger', 'Garlic']::text[], 'https://images.pexels.com/photos/28674543/pexels-photo-28674543.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600', '{}'::text[], 4.6, 298, 2, true, false, '14 min', true),
  ('sna-001', 'crispy-veg-spring-rolls', 'snacks', 'Crispy Veg Spring Rolls', '春卷', 160, 'Paper-thin wrappers around a julienne of cabbage, carrot and noodles — fried until shatter-crisp.', ARRAY['Spring roll sheets', 'Cabbage', 'Carrot', 'Noodles', 'Soy']::text[], 'https://images.pexels.com/photos/37106473/pexels-photo-37106473.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600', '{}'::text[], 4.5, 276, 1, true, false, '10 min', true),
  ('sna-002', 'chilli-paneer-dry', 'snacks', 'Chilli Paneer Dry', '辣椒奶酪', 250, 'Cubes of soft paneer wok-tossed with bell peppers, soy, and green chilli — a vegetarian crowd-pleaser.', ARRAY['Paneer', 'Bell pepper', 'Soy', 'Green chilli', 'Garlic']::text[], 'https://images.pexels.com/photos/29631468/pexels-photo-29631468.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600', '{}'::text[], 4.7, 341, 2, true, false, '12 min', true),
  ('sna-003', 'honey-chilli-potato', 'snacks', 'Honey Chilli Potato', '蜜辣土豆', 180, 'Twice-fried potato strips glazed in honey, chilli and sesame. Sticky, sweet, spicy — all at once.', ARRAY['Potato', 'Honey', 'Red chilli', 'Sesame seeds', 'Soy']::text[], 'https://images.pexels.com/photos/30709506/pexels-photo-30709506.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600', '{}'::text[], 4.6, 412, 2, true, false, '12 min', true),
  ('dri-001', 'jasmine-green-tea', 'drinks', 'Jasmine Green Tea', '茉莉绿茶', 90, 'Hand-rolled jasmine pearls steeped to release a floral, calming aroma. The traditional accompaniment to dim sum.', ARRAY['Jasmine green tea leaves', 'Hot water']::text[], 'https://images.pexels.com/photos/36299339/pexels-photo-36299339.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=600', '{}'::text[], 4.6, 156, 0, true, false, '5 min', true),
  ('dri-002', 'lychee-iced-cooler', 'drinks', 'Lychee Iced Cooler', '荔枝冰饮', 140, 'Sweet lychee pulp shaken with lime, mint and crushed ice. A summer favourite.', ARRAY['Lychee', 'Lime', 'Mint', 'Sugar syrup', 'Ice']::text[], 'https://images.pexels.com/photos/37659704/pexels-photo-37659704.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=600', '{}'::text[], 4.5, 198, 0, true, false, '5 min', true)
on conflict (id) do update set
  slug = excluded.slug,
  category_slug = excluded.category_slug,
  name = excluded.name,
  chinese_name = excluded.chinese_name,
  price = excluded.price,
  description = excluded.description,
  ingredients = excluded.ingredients,
  image = excluded.image,
  images = excluded.images,
  rating = excluded.rating,
  reviews_count = excluded.reviews_count,
  spicy = excluded.spicy,
  veg = excluded.veg,
  featured = excluded.featured,
  prep_time = excluded.prep_time,
  in_stock = excluded.in_stock;
