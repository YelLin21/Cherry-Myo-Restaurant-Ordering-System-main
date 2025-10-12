import express from "express";
import Order from "../models/Order.js";
import OrderCounter from "../models/OrderCounter.js";
const router = express.Router();

// Helper function to generate order number
const generateOrderNumber = async () => {
  const today = new Date();
  const dateStr = today.getFullYear().toString() + 
                  (today.getMonth() + 1).toString().padStart(2, '0') + 
                  today.getDate().toString().padStart(2, '0');

  try {
    // Find or create counter for today
    let counter = await OrderCounter.findOneAndUpdate(
      { date: dateStr },
      { $inc: { sequence: 1 } },
      { new: true, upsert: true }
    );

    const sequenceStr = counter.sequence.toString().padStart(3, '0');
    return `${dateStr}-${sequenceStr}`;
  } catch (error) {
    console.error("Error generating order number:", error);
    // Fallback to timestamp-based number if database fails
    return `${dateStr}-${Date.now().toString().slice(-3)}`;
  }
};

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
      $or: [{ paid: { $ne: true } }, { paid: { $exists: false } }],
    }).sort({ createdAt: -1 });

    console.log(
      ` Customer orders endpoint called - Total orders in DB: ${await Order.countDocuments()}`
    );
    console.log(
      ` Paid orders in DB: ${await Order.countDocuments({ paid: true })}`
    );
    console.log(` Unpaid orders returned: ${unpaidOrders.length}`);
    console.log(
      ` Order details:`,
      unpaidOrders.map((order) => ({
        id: order._id.toString(),
        orderNumber: order.orderNumber,
        table: order.tableNumber,
        paid: order.paid,
        status: order.status,
      }))
    );

    res.json(unpaidOrders);
  } catch (error) {
    console.error("Error fetching customer orders:", error);
    res.status(500).json({ error: "Failed to fetch customer orders" });
  }
});

router.get("/checkout", async (req, res) => {
  try {
    const orders = await Order.find({
      status: { $in: ["readyForCheckout", "sent", "declined"] },
      paid: { $ne: true },
    }).sort({ createdAt: -1 });

    console.log(
      ` Checkout endpoint called - Found ${orders.length} orders with status readyForCheckout or sent`
    );
    console.log(
      " Order statuses:",
      orders.map((o) => ({
        id: o._id.toString(),
        orderNumber: o.orderNumber,
        table: o.tableNumber,
        status: o.status,
        paid: o.paid,
      }))
    );

    res.json(orders);
  } catch (error) {
    console.error("Error fetching checkout orders:", error);
    res.status(500).json({ error: "Failed to fetch checkout orders" });
  }
});

// GET orders ready for waiter (to be delivered to tables)
router.get("/ready-for-waiter", async (req, res) => {
  try {
    const orders = await Order.find({
      status: "readyForWaiter",
      paid: { $ne: true },
    }).sort({ processedAt: -1 });

    console.log(
      ` Waiter orders endpoint called - Found ${orders.length} orders ready for waiter`
    );
    console.log(
      " Order details:",
      orders.map((o) => ({
        id: o._id.toString(),
        table: o.tableNumber,
        status: o.status,
        processedAt: o.processedAt,
      }))
    );

    res.json(orders);
  } catch (error) {
    console.error("Error fetching waiter orders:", error);
    res.status(500).json({ error: "Failed to fetch waiter orders" });
  }
});

// POST create a new order
router.post("/", async (req, res) => {
  try {
    const { tableNumber, items } = req.body;
    console.log(tableNumber, items);
    if (!tableNumber || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Invalid order format" });
    }

    // Generate custom order number
    const orderNumber = await generateOrderNumber();

    const newOrder = new Order({
      orderNumber,
      tableNumber,
      items,
      createdAt: new Date(),
      status: "pending",
    });

    await newOrder.save();
    console.log(`✅ Created order ${orderNumber} for Table ${tableNumber}`);

    const io = req.app.get("io");
    io.emit("order:new", newOrder);

    res.status(201).json(newOrder);
  } catch (error) {
    console.error("Error creating order:", error);
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

// PUT mark order as ready for waiter
router.put("/:id/process", async (req, res) => {
  try {
    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      {
        status: "readyForWaiter",
        processedAt: new Date(),
      },
      { new: true }
    );

    if (!updated) return res.status(404).send("Order not found");

    const io = req.app.get("io");
    io.emit("order:readyForWaiter", updated);
    io.emit("order:update", updated); // Also emit general update for fallback

    console.log(`✅ Order ${updated._id} marked as ready for waiter - status: ${updated.status}`);
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

router.put("/:id/paid", async (req, res) => {
  try {
    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      { paid: true, processedAt: new Date() },
      { new: true }
    );

    if (!updated) return res.status(404).send("Order not found");

    // Optional: notify frontend via Socket.IO
    const io = req.app.get("io");
    io.emit("order:paid", updated);

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
    console.log(` Marking order ${orderId} as paid...`);

    const existingOrder = await Order.findById(orderId);
    if (!existingOrder) {
      console.log(`❌ Order ${orderId} not found`);
      return res.status(404).json({ error: "Order not found" });
    }

    console.log(` Order ${orderId} current status:`, {
      table: existingOrder.tableNumber,
      paid: existingOrder.paid,
      status: existingOrder.status,
    });

    const updated = await Order.findByIdAndUpdate(
      orderId,
      { paid: true },
      { new: true }
    );

    console.log(`✅ Order ${orderId} marked as paid successfully:`, {
      table: updated.tableNumber,
      paid: updated.paid,
      status: updated.status,
    });

    const io = req.app.get("io");
    io.emit("order:paid", {
      orderId: orderId,
      tableNumber: existingOrder.tableNumber,
    });

    res.json({ message: "Order marked as paid", order: updated });
  } catch (err) {
    console.error(`❌ Error marking order ${orderId} as paid:`, err);
    res.status(500).json({ error: "Failed to mark as paid" });
  }
});

router.put("/decline/:id", async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: "declined", paid: false },
      { new: true }
    );

    if (!order) return res.status(404).json({ message: "Order not found" });

    const io = req.app.get("io");
    io.emit("order:declined", {
      orderId: order._id,
      tableNumber: order.tableNumber,
    });

    res.json({ message: "Order marked as declined", order });
  } catch (err) {
    console.error("❌ Error declining payment:", err);
    res.status(500).json({ message: "Failed to decline payment" });
  }
});


export default router;
