import express from "express";
import QRCode from "qrcode";
const router = express.Router();

const FRONTEND_BASE_URL = "http://localhost:5173";

router.get("/table/:tableId", async (req, res) => {
  const { tableId } = req.params;
  const fullUrl = `${FRONTEND_BASE_URL}/table/${tableId}`;

  try {
    const qrCode = await QRCode.toDataURL(fullUrl); // base64 QR
    res.json({ qrCode, url: fullUrl });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate QR code" });
  }
});

router.get("/table/:tableId/image", async (req, res) => {
  const { tableId } = req.params;

  const fullUrl = `${FRONTEND_BASE_URL}/table/${tableId}`;

  res.setHeader("Content-Type", "image/png");
  QRCode.toFileStream(res, fullUrl);
});

export default router;

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
