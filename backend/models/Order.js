const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    tableNumber: String,
    items: [
      {
        name: String,
        price: Number,
        quantity: Number,
      },
    ],
    status: String,
    paid: {
      type: Boolean,
      default: false,
    },
    processedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
