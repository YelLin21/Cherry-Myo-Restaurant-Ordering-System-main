import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema({
  tableNumber: String,
  items: [
    {
      name: String,
      price: Number,
      quantity: Number,
    },
  ],
  status: String,
  createdAt: Date,
  paid: {
    type: Boolean,
    default: false,
  },
  processedAt: Date,
});

export default mongoose.model("Order", OrderSchema);
