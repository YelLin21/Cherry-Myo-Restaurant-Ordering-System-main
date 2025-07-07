// models/Order.js
import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  tableNumber: String,
  items: [
    {
      name: String,
      price: Number,
      quantity: Number,
    },
  ],
  processedAt: Date,
  paid: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Order", orderSchema);
