import Review from "../models/Review.js";
import Product from "../models/Product.js";

// GET /api/reviews?product=slug — list reviews for a product
export async function listReviews(req, res, next) {
  try {
    const { product: slug, limit = 20 } = req.query;
    let filter = {};
    if (slug) {
      const product = await Product.findOne({ slug });
      if (!product) return res.status(404).json({ message: "Product not found" });
      filter.product = product._id;
    }
    const reviews = await Review.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate("user", "name");
    res.json({ count: reviews.length, reviews });
  } catch (err) {
    next(err);
  }
}

// POST /api/reviews — create a review (auth required)
export async function createReview(req, res, next) {
  try {
    const { productSlug, rating, text, location } = req.body;
    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({ message: "Rating must be 1-5" });
    if (!text?.trim())
      return res.status(400).json({ message: "Review text required" });

    const product = await Product.findOne({ slug: productSlug });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const review = await Review.create({
      user: req.user._id,
      product: product._id,
      rating,
      text: text.trim(),
      userName: req.user.name,
      location,
    });

    // Recalculate product aggregate rating
    const agg = await Review.aggregate([
      { $match: { product: product._id } },
      { $group: { _id: "$product", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    if (agg.length > 0) {
      product.rating = Math.round(agg[0].avg * 10) / 10;
      product.reviewsCount = agg[0].count;
      await product.save();
    }

    res.status(201).json({ review });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ message: "You already reviewed this dish" });
    next(err);
  }
}

// DELETE /api/reviews/:id — delete own review (or admin)
export async function deleteReview(req, res, next) {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });
    if (
      String(review.user) !== String(req.user._id) &&
      req.user.role !== "admin"
    )
      return res.status(403).json({ message: "Not allowed" });
    await review.deleteOne();
    res.json({ message: "Review deleted" });
  } catch (err) {
    next(err);
  }
}
