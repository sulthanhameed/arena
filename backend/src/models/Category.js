import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    icon: String, // emoji
    description: String,
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.model("Category", categorySchema);
