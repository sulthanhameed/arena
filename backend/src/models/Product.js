import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, index: "text" },
    chineseName: { type: String, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    category: { type: String, required: true, index: true },
    price: { type: Number, required: true, min: 0 },
    description: { type: String, required: true },
    ingredients: [String],
    image: { type: String, required: true },
    images: [String],
    rating: { type: Number, default: 4.5, min: 0, max: 5 },
    reviewsCount: { type: Number, default: 0 },
    spicy: { type: Number, min: 0, max: 3, default: 0 },
    veg: { type: Boolean, default: true },
    featured: { type: Boolean, default: false, index: true },
    prepTime: { type: String, default: "15 min" },
    inStock: { type: Boolean, default: true },
  },
  { timestamps: true },
);

productSchema.index({ name: "text", description: "text", chineseName: "text" });

export default mongoose.model("Product", productSchema);
