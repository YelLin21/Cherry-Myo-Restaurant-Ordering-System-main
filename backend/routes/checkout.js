import express from "express";
import multer from "multer";
import path from "path";
import Checkout from "../models/Checkout.js";
import Order from "../models/Order.js";
import { createClient } from "@supabase/supabase-js";
//import { supabase } from "../../src/utils/supabaseClient.js";
const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
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

    // Upload to Supabase if file exists
    let slipImageUrl = null;
    if (req.file) {
      const fileExt = path.extname(req.file.originalname);
      const fileName = `${Date.now()}${fileExt}`;
      const filePath = fileName;

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from("slip-image")
        .upload(filePath, req.file.buffer);

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        return res.status(500).json({ error: "Failed to upload receipt" });
      }

      // Get public URL
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
    io.emit("checkout:new", newCheckout);

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

// ✅ Upload/replace slip for an existing checkout (QR flow) + notify admins
router.post("/:id/slip", upload.single("file"), async (req, res) => {
  try {
    const checkout = await Checkout.findById(req.params.id).populate("orderId");
    if (!checkout) return res.status(404).json({ error: "Checkout not found" });

    if (!req.file) return res.status(400).json({ error: "No file provided" });
    if (!req.file.mimetype?.startsWith("image/")) {
      return res.status(400).json({ error: "Only image files are allowed" });
    }
    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({ error: "File too large (max 5MB)" });
    }

    const fileExt = path.extname(req.file.originalname) || ".jpg";
    const objectKey = `slips/${checkout._id}-${Date.now()}${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("slip-image")
      .upload(objectKey, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return res.status(500).json({ error: "Failed to upload slip" });
    }

    const { data: pub } = supabase.storage.from("slip-image").getPublicUrl(objectKey);
    const slipUrl = pub?.publicUrl;

    // Save on checkout
    checkout.slipImage = slipUrl;
    checkout.slipUploadedAt = new Date();
    checkout.verificationStatus = "awaiting";
    await checkout.save();

    // 🔔 Notify admins in real-time
    const io = req.app.get("io");
    io.emit("payment:slipUploaded", {
      checkoutId: String(checkout._id),
      tableNumber: checkout.tableNumber,
      total: checkout.finalAmount,
      slipUrl,
      orderId: checkout.orderId?._id,
    });

    return res.json({
      ok: true,
      slipUrl,
      verificationStatus: checkout.verificationStatus,
      slipUploadedAt: checkout.slipUploadedAt,
    });
  } catch (err) {
    console.error("❌ Error uploading slip:", err);
    return res.status(500).json({ error: "Upload failed" });
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
