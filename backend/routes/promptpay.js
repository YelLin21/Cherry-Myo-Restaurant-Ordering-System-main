// backend/routes/promptpay.js
import express from "express";
import QRCode from "qrcode";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// This guarantees we get the actual function, not an object
const generatePayload = require("promptpay-qr");

const router = express.Router();

router.get("/promptpay/info", (req, res) => {
  const id = process.env.PROMPTPAY_ID || "";
  const name = process.env.MERCHANT_NAME || "Cherry Myo";
  const masked = id ? id.replace(/.(?=.{4})/g, "•") : "";

  res.json({
    method: "PROMPTPAY",
    merchantName: name,
    promptPayIdMasked: masked,
    note:
      "Scan with a Thai banking app. Enter the amount manually if required.",
  });
});

router.get("/promptpay/qr", async (req, res) => {
  try {
    const id = process.env.PROMPTPAY_ID;
    if (!id) return res.status(500).json({ error: "PROMPTPAY_ID not configured" });

    // Static QR — no amount
    const payload = generatePayload(id, {});

    const pngBuffer = await QRCode.toBuffer(payload, {
      type: "png",
      width: 320,
      margin: 1,
      errorCorrectionLevel: "M",
    });

    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(pngBuffer);
  } catch (err) {
    console.error("PromptPay QR generation error:", err);
    res.status(500).json({ error: "Failed to generate PromptPay QR" });
  }
});

export default router;
