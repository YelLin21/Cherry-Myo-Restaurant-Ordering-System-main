const mongoose = require("mongoose");

const menuSchema = new mongoose.Schema({
  name: String,
  price: Number,
  image: String,
  category: String,
  promotion: Number,
  outofstock: { type: Boolean, default: false },
});

module.exports = mongoose.model("Menu", menuSchema);
