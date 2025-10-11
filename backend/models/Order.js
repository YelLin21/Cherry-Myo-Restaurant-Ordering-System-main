import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true,
  },
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
