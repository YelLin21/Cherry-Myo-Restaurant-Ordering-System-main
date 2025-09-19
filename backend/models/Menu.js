import mongoose from "mongoose";

const menuSchema = new mongoose.Schema({
  name: String,
  price: Number,
  image: String,
  category: String,
  promotion: { type: Number, default: 0 },
  outofstock: { type: Boolean, default: false },
});

export default mongoose.model("Menu", menuSchema);
