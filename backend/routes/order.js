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

// GET detailed orders for sales report (with date filtering)
router.get("/detailed", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    
    // If date range is provided, filter by dates
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      // Set end date to end of day (23:59:59.999)
      end.setHours(23, 59, 59, 999);
      
      dateFilter.createdAt = {
        $gte: start,
        $lte: end
      };
    }
    
    // Only fetch paid orders for the sales report
    const orders = await Order.find({
      ...dateFilter,
      paid: true
    }).sort({ createdAt: -1 });
    
    // Transform data to include detailed information
    const detailedOrders = orders.map(order => {
      const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
      const totalAmount = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      return {
        _id: order._id,
        orderNumber: order.orderNumber,
        tableNumber: order.tableNumber,
        paymentMethod: order.paymentMethod || 'Cash', // Default to Cash if not specified
        paidAt: order.processedAt || order.updatedAt || order.createdAt,
        totalAmount: totalAmount,
        totalItems: totalItems,
        items: order.items,
        createdAt: order.createdAt,
        status: order.status
      };
    });
    
    res.json(detailedOrders);
  } catch (error) {
    console.error("Error fetching detailed orders:", error);
    res.status(500).json({ error: "Failed to fetch detailed orders" });
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

// GET orders ready for checkout
router.get("/checkout", async (req, res) => {
  try {
    const orders = await Order.find({
      status: { $in: ["readyForCheckout", "sent"] },
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
    const { paymentMethod } = req.body;
    
    const updateData = { 
      paid: true, 
      processedAt: new Date() 
    };
    
    // Add payment method if provided
    if (paymentMethod) {
      updateData.paymentMethod = paymentMethod;
    }
    
    const updated = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
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
  const { orderId, paymentMethod } = req.body;
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

    const updateData = { paid: true };
    if (paymentMethod) {
      updateData.paymentMethod = paymentMethod;
    }

    const updated = await Order.findByIdAndUpdate(
      orderId,
      updateData,
      { new: true }
    );

    console.log(`✅ Order ${orderId} marked as paid successfully:`, {
      table: updated.tableNumber,
      paid: updated.paid,
      status: updated.status,
      paymentMethod: updated.paymentMethod,
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

export default router;
