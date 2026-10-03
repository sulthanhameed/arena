import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import User from "../models/User.js";

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const CATEGORIES = [
  { name: "Dim Sum", icon: "🥟", sortOrder: 1 },
  { name: "Noodles & Soups", icon: "🍜", sortOrder: 2 },
  { name: "Rice & Curry", icon: "🍛", sortOrder: 3 },
  { name: "Snacks", icon: "🍟", sortOrder: 4 },
  { name: "Drinks", icon: "🥤", sortOrder: 5 },
].map((c) => ({ ...c, slug: slugify(c.name) }));

const PRODUCTS = [
  // Dim Sum
  { name: "Khang Special Veg Momo", chineseName: "康式素饺", category: "Dim Sum", price: 180, rating: 4.8, reviewsCount: 412, description: "Hand-folded steamed dumplings stuffed with cabbage, carrot, bell pepper and a hint of ginger-garlic. Served with our signature schezwan dip.", ingredients: ["Refined flour", "Cabbage", "Carrot", "Spring onion", "Ginger", "Garlic", "Sesame oil"], image: "https://images.pexels.com/photos/35144940/pexels-photo-35144940.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=600", spicy: 1, veg: true, featured: true, prepTime: "15 min" },
  { name: "Chicken Dimsum Basket", chineseName: "鸡肉点心", category: "Dim Sum", price: 240, rating: 4.9, reviewsCount: 587, description: "Delicate translucent wrappers cradling minced chicken seasoned with soy, sesame, and a touch of white pepper. Steamed in bamboo baskets.", ingredients: ["Chicken mince", "Wheat starch", "Soy", "Sesame", "Coriander", "White pepper"], image: "https://images.pexels.com/photos/32393812/pexels-photo-32393812.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=600", spicy: 1, veg: false, featured: true, prepTime: "18 min" },
  { name: "Pan-Fried Chicken Momo", chineseName: "煎鸡饺", category: "Dim Sum", price: 260, rating: 4.7, reviewsCount: 318, description: "Steamed first, then pan-seared to golden perfection. Crisp base, juicy chicken filling, served with chilli-garlic oil.", ingredients: ["Chicken", "Garlic", "Soy", "Chilli oil", "Spring onion"], image: "https://images.pexels.com/photos/14457519/pexels-photo-14457519.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600", spicy: 2, veg: false, featured: true, prepTime: "20 min" },
  { name: "Crystal Prawn Hargao", chineseName: "虾饺", category: "Dim Sum", price: 320, rating: 4.9, reviewsCount: 246, description: "Cantonese classic — succulent prawn wrapped in glass-thin wheat starch skins. Each piece pleated by hand.", ingredients: ["Prawn", "Bamboo shoot", "Wheat starch", "Tapioca", "Sesame oil"], image: "https://images.pexels.com/photos/27039841/pexels-photo-27039841.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=600", spicy: 0, veg: false, featured: true, prepTime: "22 min" },

  // Noodles & Soups
  { name: "Hakka Chow Mein", chineseName: "客家炒面", category: "Noodles & Soups", price: 220, rating: 4.6, reviewsCount: 521, description: "Smoky wok-tossed noodles with crunchy julienned vegetables in a savoury soy & sesame glaze. The wok-hei is real.", ingredients: ["Hakka noodles", "Cabbage", "Capsicum", "Carrot", "Soy", "Sesame"], image: "https://images.pexels.com/photos/14853728/pexels-photo-14853728.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600", spicy: 1, veg: true, featured: true, prepTime: "12 min" },
  { name: "Schezwan Chicken Noodles", chineseName: "川味鸡肉面", category: "Noodles & Soups", price: 280, rating: 4.7, reviewsCount: 389, description: "Fiery Schezwan-style noodles tossed with shredded chicken, bell peppers and our house chilli-bean paste.", ingredients: ["Noodles", "Chicken", "Schezwan sauce", "Capsicum", "Garlic"], image: "https://images.pexels.com/photos/12737657/pexels-photo-12737657.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600", spicy: 3, veg: false, prepTime: "14 min" },
  { name: "Hot & Sour Soup", chineseName: "酸辣汤", category: "Noodles & Soups", price: 160, rating: 4.5, reviewsCount: 284, description: "The original — black pepper, vinegar, mushrooms, tofu and silken egg ribbons in a velvety broth.", ingredients: ["Vegetable stock", "Tofu", "Mushroom", "Egg", "Vinegar", "Pepper"], image: "https://images.pexels.com/photos/18698263/pexels-photo-18698263.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600", spicy: 2, veg: true, prepTime: "10 min" },
  { name: "Sweet Corn Chicken Soup", chineseName: "玉米鸡汤", category: "Noodles & Soups", price: 170, rating: 4.4, reviewsCount: 192, description: "Comfort in a bowl — silky corn soup with shredded chicken and a swirl of egg.", ingredients: ["Sweet corn", "Chicken", "Egg", "Cornflour", "Pepper"], image: "https://images.pexels.com/photos/10966377/pexels-photo-10966377.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600", spicy: 0, veg: false, prepTime: "10 min" },

  // Rice & Curry
  { name: "Veg Triple Schezwan Rice", chineseName: "三重川味饭", category: "Rice & Curry", price: 260, rating: 4.7, reviewsCount: 433, description: "Layered tower of fried rice, hakka noodles and Schezwan gravy crowned with crispy veggies. A meal in itself.", ingredients: ["Basmati rice", "Noodles", "Schezwan gravy", "Mixed veg"], image: "https://images.pexels.com/photos/24334865/pexels-photo-24334865.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600", spicy: 2, veg: true, featured: true, prepTime: "16 min" },
  { name: "Chicken Fried Rice", chineseName: "鸡肉炒饭", category: "Rice & Curry", price: 240, rating: 4.6, reviewsCount: 367, description: "Long-grain rice tossed with chicken, egg, spring onion and a kiss of dark soy. Simple, smoky, perfect.", ingredients: ["Basmati rice", "Chicken", "Egg", "Spring onion", "Soy"], image: "https://images.pexels.com/photos/343871/pexels-photo-343871.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600", spicy: 1, veg: false, prepTime: "12 min" },
  { name: "Chilli Chicken Gravy", chineseName: "辣子鸡", category: "Rice & Curry", price: 290, rating: 4.8, reviewsCount: 511, description: "Crispy chicken bites in a glossy, fiery sauce of green chilli, garlic and soy. Best with steamed rice.", ingredients: ["Chicken", "Green chilli", "Garlic", "Soy", "Vinegar", "Capsicum"], image: "https://images.pexels.com/photos/29631426/pexels-photo-29631426.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600", spicy: 3, veg: false, featured: true, prepTime: "15 min" },
  { name: "Veg Manchurian Dry", chineseName: "素满洲", category: "Rice & Curry", price: 220, rating: 4.6, reviewsCount: 298, description: "Golden-fried vegetable balls tossed in a tangy Indo-Chinese sauce with ginger, garlic and spring onion.", ingredients: ["Mixed vegetables", "Cornflour", "Soy", "Ginger", "Garlic"], image: "https://images.pexels.com/photos/28674543/pexels-photo-28674543.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600", spicy: 2, veg: true, prepTime: "14 min" },

  // Snacks
  { name: "Crispy Veg Spring Rolls", chineseName: "春卷", category: "Snacks", price: 160, rating: 4.5, reviewsCount: 276, description: "Paper-thin wrappers around a julienne of cabbage, carrot and noodles — fried until shatter-crisp.", ingredients: ["Spring roll sheets", "Cabbage", "Carrot", "Noodles", "Soy"], image: "https://images.pexels.com/photos/37106473/pexels-photo-37106473.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600", spicy: 1, veg: true, prepTime: "10 min" },
  { name: "Chilli Paneer Dry", chineseName: "辣椒奶酪", category: "Snacks", price: 250, rating: 4.7, reviewsCount: 341, description: "Cubes of soft paneer wok-tossed with bell peppers, soy, and green chilli — a vegetarian crowd-pleaser.", ingredients: ["Paneer", "Bell pepper", "Soy", "Green chilli", "Garlic"], image: "https://images.pexels.com/photos/29631468/pexels-photo-29631468.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600", spicy: 2, veg: true, prepTime: "12 min" },
  { name: "Honey Chilli Potato", chineseName: "蜜辣土豆", category: "Snacks", price: 180, rating: 4.6, reviewsCount: 412, description: "Twice-fried potato strips glazed in honey, chilli and sesame. Sticky, sweet, spicy — all at once.", ingredients: ["Potato", "Honey", "Red chilli", "Sesame seeds", "Soy"], image: "https://images.pexels.com/photos/30709506/pexels-photo-30709506.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=600&w=600", spicy: 2, veg: true, prepTime: "12 min" },

  // Drinks
  { name: "Jasmine Green Tea", chineseName: "茉莉绿茶", category: "Drinks", price: 90, rating: 4.6, reviewsCount: 156, description: "Hand-rolled jasmine pearls steeped to release a floral, calming aroma. The traditional accompaniment to dim sum.", ingredients: ["Jasmine green tea leaves", "Hot water"], image: "https://images.pexels.com/photos/36299339/pexels-photo-36299339.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=600", spicy: 0, veg: true, prepTime: "5 min" },
  { name: "Lychee Iced Cooler", chineseName: "荔枝冰饮", category: "Drinks", price: 140, rating: 4.5, reviewsCount: 198, description: "Sweet lychee pulp shaken with lime, mint and crushed ice. A summer favourite.", ingredients: ["Lychee", "Lime", "Mint", "Sugar syrup", "Ice"], image: "https://images.pexels.com/photos/37659704/pexels-photo-37659704.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=600", spicy: 0, veg: true, prepTime: "5 min" },
].map((p) => ({ ...p, slug: slugify(p.name) }));

async function seed() {
  await connectDB();
  console.log("🌱 Seeding database…");

  await Promise.all([
    Category.deleteMany({}),
    Product.deleteMany({}),
  ]);

  await Category.insertMany(CATEGORIES);
  console.log(`✓ Inserted ${CATEGORIES.length} categories`);

  await Product.insertMany(PRODUCTS);
  console.log(`✓ Inserted ${PRODUCTS.length} products`);

  // Create admin user (if not exists)
  const adminEmail = "admin@khang.com";
  const exists = await User.findOne({ email: adminEmail });
  if (!exists) {
    await User.create({
      name: "Admin",
      email: adminEmail,
      password: "admin123",
      role: "admin",
    });
    console.log(`✓ Admin created: ${adminEmail} / admin123`);
  }

  console.log("🎉 Done!");
  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
