import mongoose from "mongoose";

const OrderCounterSchema = new mongoose.Schema({
  date: {
    type: String, // Format: YYYYMMDD
    required: true,
    unique: true,
  },
  sequence: {
    type: Number,
    default: 0,
  },
});

export default mongoose.model("OrderCounter", OrderCounterSchema);