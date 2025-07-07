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

// GET orders ready for checkout
router.get("/checkout", async (req, res) => {
  try {
    const orders = await Order.find({
      status: "readyForCheckout",
      paid: { $ne: true },
    }).sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch checkout orders" });
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
      status: "pending",
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
      {
        status: "readyForCheckout",
        processedAt: new Date(),
      },
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

// POST mark order as paid
router.post("/mark-paid", async (req, res) => {
  const { orderId } = req.body;
  if (!orderId) {
    return res.status(400).json({ error: "Missing orderId" });
  }

  try {
    const updated = await Order.findByIdAndUpdate(
      orderId,
      { paid: true },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Order not found" });
    }

    res.json({ message: "Order marked as paid", order: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to mark as paid" });
  }
});

module.exports = router;
