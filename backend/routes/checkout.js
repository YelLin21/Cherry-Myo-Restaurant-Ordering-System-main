import express from "express";
import multer from "multer";
import path from "path";
import Checkout from "../models/Checkout.js";
import Order from "../models/Order.js";
import { supabase } from "../../src/utils/supabaseClient.js";
const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get("/", async (req, res) => {
  try {
    const checkouts = await Checkout.find()
      .sort({ createdAt: -1 })
      .populate("orderId");
    res.json(checkouts);
  } catch (err) {
    console.error("❌ Error fetching checkouts:", err);
    res.status(500).json({ error: "Failed to fetch checkouts" });
  }
});

// ✅ GET checkouts by table number
router.get("/table/:tableNumber", async (req, res) => {
  try {
    const checkouts = await Checkout.find({
      tableNumber: req.params.tableNumber,
    })
      .sort({ createdAt: -1 })
      .populate("orderId");
    res.json(checkouts);
  } catch (err) {
    console.error("❌ Error fetching checkouts by table:", err);
    res.status(500).json({ error: "Failed to fetch checkouts by table" });
  }
});

router.get("/order/:orderId", async (req, res) => {
  try {
    const payment = await Checkout.findOne({ orderId: req.params.orderId });
    if (!payment) return res.status(404).json({ paid: false });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/decline/:id", async (req, res) => {
  try {
    const checkout = await Checkout.findByIdAndUpdate(
      req.params.id,
      { status: "declined" },
      { new: true }
    );
    if (!checkout) return res.status(404).json({ message: "Checkout not found" });
    const io = req.app.get("io");
    io.emit("checkout:declined", checkout);
    res.json({ message: "Payment declined successfully", checkout });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// // ✅ POST create checkout (with optional slip image)
// router.post("/", upload.single("slipImage"), async (req, res) => {
//   const { orderId, paymentMethod, finalAmount, cashReceived, changeGiven } = req.body;

//   if (!orderId || !paymentMethod || !finalAmount) {
//     return res.status(400).json({ error: "Missing required fields" });
//   }

//   try {
//     const order = await Order.findById(orderId);
//     if (!order) {
//       return res.status(404).json({ error: "Order not found" });
//     }

//     // // Mark order as paid
//     // order.paid = true;
//     // await order.save();

//     // Create new checkout
//     let slipImageUrl = null;
//     if (req.file) {
//         const fileExt = path.extname(req.file.originalname);
//         const fileName = `${Date.now()}${fileExt}`;

//         if (uploadError) {
//           console.error("Supabase upload error:", uploadError);
//           return res.status(500).json({ error: "Failed to upload receipt" });
//         }

//         const { data: publicData, error: publicError } = supabase.storage
//           .from("slip-image")
//           .getPublicUrl(filePath);

//         if (publicError) {
//           console.error("Supabase getPublicUrl error:", publicError);
//           return res.status(500).json({ error: "Failed to get receipt URL" });
//         }

//         slipImageUrl = publicData.publicUrl;
//       }

//     const newCheckout = new Checkout({
//       orderId,
//       tableNumber: order.tableNumber,
//       paymentMethod,
//       finalAmount,
//       cashReceived: paymentMethod === "cash" ? cashReceived : null,
//       changeGiven: paymentMethod === "cash" ? changeGiven : null,
//       slipImage: slipImageUrl
//     });

//     await newCheckout.save();

//     const io = req.app.get("io");
//     io.emit("checkout:new", newCheckout);

//     if (paymentMethod === "cash") {
//       io.emit("checkout:cash", {
//         checkoutId: newCheckout._id,
//         tableNumber: newCheckout.tableNumber,
//         finalAmount: newCheckout.finalAmount,
//         cashReceived: newCheckout.cashReceived,
//         changeGiven: newCheckout.changeGiven
//       });
//     }

//     res.status(201).json(newCheckout);
//   } catch (err) {
//     console.error("❌ Error creating checkout:", err);
//     res.status(500).json({ error: "Failed to create checkout" });
//   }
// });

router.post("/", upload.single("slipImage"), async (req, res) => {
  const { orderId, paymentMethod, finalAmount, cashReceived, changeGiven } =
    req.body;

  if (!orderId || !paymentMethod || !finalAmount) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    let slipImageUrl = null;
    if (req.file) {
      const fileExt = path.extname(req.file.originalname);
      const fileName = `${Date.now()}${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from("slip-image")
        .upload(filePath, req.file.buffer);

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        return res.status(500).json({ error: "Failed to upload receipt" });
      }

      const { data: publicData, error: publicError } = supabase.storage
        .from("slip-image")
        .getPublicUrl(filePath);

      if (publicError) {
        console.error("Supabase getPublicUrl error:", publicError);
        return res.status(500).json({ error: "Failed to get receipt URL" });
      }

      slipImageUrl = publicData.publicUrl;
    }

    const newCheckout = new Checkout({
      orderId,
      tableNumber: order.tableNumber,
      paymentMethod,
      finalAmount,
      cashReceived: paymentMethod === "cash" ? cashReceived : null,
      changeGiven: paymentMethod === "cash" ? changeGiven : null,
      slipImage: slipImageUrl,
    });

    await newCheckout.save();

    const io = req.app.get("io");
    if (!io) {
      console.error("❌ io not found on app instance!");
    } else {
      console.log("⚡ Preparing full checkout data for socket emit:", newCheckout._id);
    
      const fullOrderData = {
        ...newCheckout.toObject(),
        items: order.items,
        status: order.status,
        orderNumber: order.orderNumber,
      };
    
      io.emit("checkout:new", fullOrderData);
    
      console.log("⚡ Emitted checkout:new with merged order data:", fullOrderData._id);
      console.log("Active socket count:", io.engine.clientsCount);
    }
    

    if (paymentMethod === "cash") {
      io.emit("checkout:cash", {
        checkoutId: newCheckout._id,
        tableNumber: newCheckout.tableNumber,
        finalAmount: newCheckout.finalAmount,
        cashReceived: newCheckout.cashReceived,
        changeGiven: newCheckout.changeGiven,
      });
    }

    res.status(201).json(newCheckout);
  } catch (err) {
    console.error("❌ Error creating checkout:", err);
    res.status(500).json({ error: "Failed to create checkout" });
  }
});

// ✅ GET single checkout by ID
router.get("/:id", async (req, res) => {
  try {
    const checkout = await Checkout.findById(req.params.id).populate("orderId");
    if (!checkout) {
      return res.status(404).json({ error: "Checkout not found" });
    }
    res.json(checkout);
  } catch (err) {
    console.error("❌ Error fetching checkout:", err);
    res.status(500).json({ error: "Failed to fetch checkout" });
  }
});

export default router;
