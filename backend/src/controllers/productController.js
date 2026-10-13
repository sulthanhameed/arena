import Product from "../models/Product.js";
import Review from "../models/Review.js";

// GET /api/products?category=&q=&featured=&sort=
export async function listProducts(req, res, next) {
  try {
    const { category, q, featured, sort } = req.query;
    const filter = {};
    if (category && category !== "All") filter.category = category;
    if (featured === "true") filter.featured = true;
    if (q) filter.$text = { $search: q };

    let cursor = Product.find(filter);
    if (sort === "popular") cursor = cursor.sort({ rating: -1, reviewsCount: -1 });
    else if (sort === "low") cursor = cursor.sort({ price: 1 });
    else if (sort === "high") cursor = cursor.sort({ price: -1 });
    else cursor = cursor.sort({ createdAt: -1 });

    const items = await cursor.lean();
    res.json({ count: items.length, items });
  } catch (err) {
    next(err);
  }
}

// GET /api/products/:slug
export async function getProduct(req, res, next) {
  try {
    const product = await Product.findOne({ slug: req.params.slug }).lean();
    if (!product) return res.status(404).json({ message: "Product not found" });

    const reviews = await Review.find({ product: product._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    res.json({ product, reviews });
  } catch (err) {
    next(err);
  }
}

// POST /api/products  (admin)
export async function createProduct(req, res, next) {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ product });
  } catch (err) {
    next(err);
  }
}

// PUT /api/products/:id  (admin)
export async function updateProduct(req, res, next) {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ product });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/products/:id  (admin)
export async function deleteProduct(req, res, next) {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted" });
  } catch (err) {
    next(err);
  }
}
