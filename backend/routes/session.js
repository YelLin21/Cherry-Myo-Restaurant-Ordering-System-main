import express from "express";
import Table from "../models/Table.js";
import Session from "../models/Session.js";
import { nanoid } from "nanoid";

const router = express.Router();

// Helper: Calculate distance between lat/lon points
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

router.post("/create", async (req, res) => {
  const { tableId, latitude, longitude } = req.body;

  if (!tableId || !latitude || !longitude) {
    return res.status(400).json({ error: "Missing required parameters." });
  }

  const table = await Table.findById(tableId);
  if (!table) {
    return res.status(404).json({ error: "Table not found." });
  }

  const distance = getDistanceFromLatLonInMeters(
    latitude,
    longitude,
    table.latitude,
    table.longitude
  );

  if (distance > 20) {
    return res
      .status(403)
      .json({ error: "You must be near the table to order." });
  }

  const sessionToken = nanoid();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 15);

  const session = new Session({
    tableId,
    sessionToken,
    expiresAt,
  });

  await session.save();

  res.json({ session: sessionToken, expiresAt });
});

export default router;
