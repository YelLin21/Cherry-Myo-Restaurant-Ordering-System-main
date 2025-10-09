import express from "express";
import Order from "../models/Order.js";
const router = express.Router();

// POST call waiter
router.post("/call", async (req, res) => {
  try {
    const { tableNumber, timestamp } = req.body;

    if (!tableNumber) {
      return res.status(400).json({ error: "Table number is required" });
    }

    console.log(`🔔 Waiter called for table ${tableNumber} at ${timestamp}`);

    // Emit the waiter call to all connected waiter clients
    const io = req.app.get("io");
    io.emit("waiter:called", {
      tableNumber,
      timestamp: timestamp || new Date().toISOString(),
    });

    res.json({ 
      message: "Waiter called successfully",
      tableNumber,
      timestamp: timestamp || new Date().toISOString()
    });
  } catch (error) {
    console.error("Error calling waiter:", error);
    res.status(500).json({ error: "Failed to call waiter" });
  }
});

export default router;