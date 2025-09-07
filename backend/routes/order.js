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

// GET customer orders (only unpaid orders - for customer view)
router.get("/customer", async (req, res) => {
  try {
    // Only return orders that are NOT paid - customers should never see paid orders
    const unpaidOrders = await Order.find({ 
      $or: [
        { paid: { $ne: true } },
        { paid: { $exists: false } }
      ]
    }).sort({ createdAt: -1 });
    
    console.log(`📋 Customer orders endpoint called - Total orders in DB: ${await Order.countDocuments()}`);
    console.log(`📋 Paid orders in DB: ${await Order.countDocuments({ paid: true })}`);
    console.log(`📋 Unpaid orders returned: ${unpaidOrders.length}`);
    console.log(`📋 Order details:`, unpaidOrders.map(order => ({
      id: order._id.toString(),
      table: order.tableNumber,
      paid: order.paid,
      status: order.status
    })));
    
    res.json(unpaidOrders);
  } catch (error) {
    console.error("Error fetching customer orders:", error);
    res.status(500).json({ error: "Failed to fetch customer orders" });
  }
});

// GET orders ready for checkout
router.get("/checkout", async (req, res) => {
  try {
    const orders = await Order.find({
      status: { $in: ["readyForCheckout", "sent"] },
      paid: { $ne: true },
    }).sort({ createdAt: -1 });

    console.log(`🧾 Checkout endpoint called - Found ${orders.length} orders with status readyForCheckout or sent`);
    console.log("🧾 Order statuses:", orders.map(o => ({ id: o._id.toString(), table: o.tableNumber, status: o.status, paid: o.paid })));

    res.json(orders);
  } catch (error) {
    console.error("Error fetching checkout orders:", error);
    res.status(500).json({ error: "Failed to fetch checkout orders" });
  }
});

// POST create a new order
router.post("/", async (req, res) => {
  try {
    const { tableNumber, items } = req.body;
    console.log(tableNumber, items)
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
    console.log(`💰 Marking order ${orderId} as paid...`);
    
    const existingOrder = await Order.findById(orderId);
    if (!existingOrder) {
      console.log(`❌ Order ${orderId} not found`);
      return res.status(404).json({ error: "Order not found" });
    }
    
    console.log(`📋 Order ${orderId} current status:`, {
      table: existingOrder.tableNumber,
      paid: existingOrder.paid,
      status: existingOrder.status
    });

    const updated = await Order.findByIdAndUpdate(
      orderId,
      { paid: true },
      { new: true }
    );

    console.log(`✅ Order ${orderId} marked as paid successfully:`, {
      table: updated.tableNumber,
      paid: updated.paid,
      status: updated.status
    });

    // Emit socket event for real-time updates
    const io = req.app.get("io");
    console.log(` Emitting order:paid event for order ${orderId}`);
    io.emit("order:paid", orderId);

    res.json({ message: "Order marked as paid", order: updated });
  } catch (err) {
    console.error(`❌ Error marking order ${orderId} as paid:`, err);
    res.status(500).json({ error: "Failed to mark as paid" });
  }
});

module.exports = router;
