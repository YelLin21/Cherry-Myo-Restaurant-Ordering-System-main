<<<<<<< Updated upstream
const express = require("express");
const QRCode = require("qrcode");
=======
import express from "express";
import QRCode from "qrcode";
import Order from "../models/Order.js";
import pkg from "promptpay-qr"; 
const { genQR } = pkg;
console.log("PromptPay ID from .env:", process.env.PROMPTPAY_ID);

>>>>>>> Stashed changes
const router = express.Router();

// Generate PromptPay QR (JSON)
router.get("/table/:tableId", async (req, res) => {
  const { tableId } = req.params;

  try {
    // Fetch latest order for this table
    const order = await Order.findOne({ tableNumber: tableId }).sort({ createdAt: -1 });

    if (!order) {
      return res.status(404).json({ error: "No order found for this table" });
    }

    const amount = order.totalAmount;
    const recipient = process.env.PROMPTPAY_ID; // phone number or tax ID
    const promptPayString = promptpay.genQR(recipient, { amount });

    // Generate QR code (base64)
    const qrCode = await QRCode.toDataURL(promptPayString);

    // Prevent caching
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");

    res.json({ qrCode, promptPayString });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate QR code" });
  }
});

// Generate QR as PNG image
router.get("/table/:tableId/image", async (req, res) => {
  const { tableId } = req.params;

  try {
    const order = await Order.findOne({ tableNumber: tableId }).sort({ createdAt: -1 });

    if (!order) {
      return res.status(404).send("No order found for this table");
    }

    const amount = order.totalAmount;
    const recipient = process.env.PROMPTPAY_ID;
    const promptPayString = promptpay.genQR(recipient, { amount });

    // Set headers for PNG
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");

    QRCode.toFileStream(res, promptPayString);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to generate QR code image");
  }
});

<<<<<<< Updated upstream
module.exports = router;

// router.get("/table/:tableId", async (req, res) => {
//   const { tableId } = req.params;

//   const baseUrl = "https://cherry-myo-restaurant-ordering-system-main.vercel.app/table";
//   const fullUrl = `${baseUrl}/${tableId}`;

//   try {
//     const qrCode = await QRCode.toDataURL(fullUrl); // base64 QR
//     res.json({ qrCode });
//   } catch (err) {
//     res.status(500).json({ error: "Failed to generate QR code" });
//   }
// });

// router.get("/table/:tableId/image", async (req, res) => {
//   const { tableId } = req.params;

//   const baseUrl = "https://cherry-myo-restaurant-ordering-system-main.vercel.app";
//   const fullUrl = `${baseUrl}/table/${tableId}`; // ← FIXED

//   res.setHeader("Content-Type", "image/png");
//   QRCode.toFileStream(res, fullUrl); 
// });

// module.exports = router;
=======
export default router;
>>>>>>> Stashed changes
