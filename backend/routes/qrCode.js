// controllers/qr.js
const express = require("express");
const QRCode = require("qrcode");
const router = express.Router();

// Generate QR Code as base64 data URL
router.get("/", async (req, res) => {
  const { text } = req.query;

  if (!text) {
    return res.status(400).json({ error: "Missing 'text' query parameter" });
  }

  try {
    const qrCode = await QRCode.toDataURL(text);
    res.json({ qrCode });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate QR code" });
  }
});

// Optional: Stream QR as PNG image
router.get("/image", async (req, res) => {
  const { text } = req.query;

  if (!text) {
    return res.status(400).send("Missing 'text' query parameter");
  }

  res.setHeader("Content-Type", "image/png");
  QRCode.toFileStream(res, text);
});

module.exports = router;
