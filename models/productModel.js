import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true, // Removes whitespace from both ends // Lim Yik Seng, A0338506B
      maxlength: 200, // FIX: Prevents extremely long strings 
      index: true, // Adds an index for faster search by name
    },
    slug: {
      type: String,
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 8000, // FIX: Prevents database bloat from massive text
    },
    price: {
      type: Number,
      required: true,
      min: 0, // FIX: Prevents negative prices 
    },
    category: {
      type: mongoose.ObjectId,
      ref: "Category",
      required: true,
      index: true, // Adds an index for faster queries by category
    },
    quantity: {
      type: Number,
      required: true,
      min: 0, // FIX: Prevents negative inventory 
    },
    photo: {
      data: Buffer,
      contentType: String,
    },
    shipping: {
      type: Boolean,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Products", productSchema);