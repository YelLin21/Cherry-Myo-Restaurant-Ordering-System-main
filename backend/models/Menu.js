const mongoose = require("mongoose");

const menuSchema = new mongoose.Schema({
  name: String,
  price: Number,
  image: String,
  category: String,
});

module.exports = mongoose.model("Menu", menuSchema);
