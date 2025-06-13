const express = require("express");
const router = express.Router();
const Order = require("../models/Order");

// Get all orders (newest first)
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Create a new order
router.post("/", async (req, res) => {
  try {
    const { tableNumber, items } = req.body;

    if (!tableNumber || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Invalid order format" });
    }

    const newOrder = new Order({
      tableNumber,
      items,
      status: "Pending",
      createdAt: new Date(),
    });

    await newOrder.save();

    const io = req.app.get("io");
    io.emit("order:new", newOrder);

    res.status(201).json(newOrder);
  } catch (error) {
    res.status(500).json({ error: "Failed to create order" });
  }
});

// Update order status
router.put("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Missing status value" });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ error: "Order not found" });
    }

    const io = req.app.get("io");
    io.emit("order:update", updatedOrder);

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ error: "Failed to update order status" });
  }
});

module.exports = router;
