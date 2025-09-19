import mongoose from "mongoose";

const CheckoutSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
  },
  tableNumber: {
    type: String,
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ["cash", "scan"],
    required: true,
  },
  finalAmount: {
    type: Number,
    required: true,
  },
  cashReceived: Number, // only if paymentMethod = cash
  changeGiven: Number, // only if paymentMethod = cash
  slipImage: String, // file path or URL to uploaded image
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Checkout", CheckoutSchema);
