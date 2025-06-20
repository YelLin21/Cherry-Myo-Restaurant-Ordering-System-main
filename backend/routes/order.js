const express = require("express");
const router = express.Router();
const Order = require("../models/Order");

// GET all orders
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// POST create a new order
router.post("/", async (req, res) => {
  try {
    const { tableNumber, items } = req.body;

    if (!tableNumber || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Invalid order format" });
    }

    const newOrder = new Order({
      tableNumber,
      items,
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

// PUT update status
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

// PUT mark order as ready for checkout
router.put("/:id/process", async (req, res) => {
  try {
    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      { status: "readyForCheckout" },
      { new: true }
    );

    if (!updated) return res.status(404).send("Order not found");

    const io = req.app.get("io");
    io.emit("order:readyForCheckout", updated);

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

module.exports = router;
