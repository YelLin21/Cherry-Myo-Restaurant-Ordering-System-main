import express from "express";
import QRCode from "qrcode";
import crypto from "crypto";
import Session from "../models/Session.js";

const router = express.Router();

const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || "http://localhost:5173";
// Default session lifetime Adjustable
const SESSION_LIFETIME_MS = Number(process.env.SESSION_LIFETIME_MS || 4 * 60 * 60 * 1000);

router.post("/table/:tableId", async (req, res) => {
  const { tableId } = req.params;

  try {
    const token = crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS);

    const session = await Session.create({
      tableId,
      sessionToken: token,
      expiresAt,
      status: "active",
    });

    const fullUrl = `${FRONTEND_BASE_URL}/table/${tableId}?session=${token}`;

    const qrCode = await QRCode.toDataURL(fullUrl); // base64 PNG
    return res.json({
      qrCode,
      url: fullUrl,
      token,
      sessionId: session._id,
      expiresAt,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to create session & QR" });
  }
});


router.get("/table/:tableId", async (req, res) => {
  const { tableId } = req.params;
  const fullUrl = `${FRONTEND_BASE_URL}/table/${tableId}`;

  try {
    const qrCode = await QRCode.toDataURL(fullUrl);
    res.json({ qrCode, url: fullUrl });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate QR code" });
  }
});


router.get("/table/:tableId/image-active", async (req, res) => {
  const { tableId } = req.params;

  try {
    const session = await Session.findOne({ tableId, status: "active" })
      .sort({ createdAt: -1 })
      .lean();

    if (!session) {
      return res.status(404).send("No active session for this table.");
    }

    const fullUrl = `${FRONTEND_BASE_URL}/table/${tableId}?session=${session.sessionToken}`;
    res.setHeader("Content-Type", "image/png");
    QRCode.toFileStream(res, fullUrl);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to stream QR image");
  }
});

/**
 * Admin: download PNG for a specific session token (optional helper)
 * GET /api/qr/session/:token/image
 */
router.get("/session/:token/image", async (req, res) => {
  const { token } = req.params;

  try {
    const session = await Session.findOne({ sessionToken: token }).lean();
    if (!session) return res.status(404).send("Session not found");

    const fullUrl = `${FRONTEND_BASE_URL}/table/${session.tableId}?session=${token}`;
    res.setHeader("Content-Type", "image/png");
    QRCode.toFileStream(res, fullUrl);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to stream QR image");
  }
});

export default router;
