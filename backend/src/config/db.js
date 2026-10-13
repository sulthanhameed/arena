import mongoose from "mongoose";

export async function connectDB() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error("MONGO_URI is not defined in environment");

    mongoose.set("strictQuery", true);
    const conn = await mongoose.connect(uri, {
      autoIndex: process.env.NODE_ENV !== "production",
    });

    console.log(`🗄  MongoDB connected → ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠  MongoDB disconnected");
    });
    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB error:", err.message);
    });
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
}
