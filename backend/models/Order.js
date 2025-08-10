const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  tableNumber: String,
  items: [
    {
      name: String,
      price: Number,
      quantity: Number
    }
  ],
  status: String,
  createdAt: Date,
  paid: {
    type: Boolean,
    default: false
  },
  processedAt: Date

});

module.exports = mongoose.model("Order", OrderSchema);