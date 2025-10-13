// backend/models/Session.js
import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    tableId: { type: mongoose.Schema.Types.ObjectId, ref: "Table", required: true, index: true },
    sessionToken: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ["active", "paid", "closed"], default: "active", index: true },
    paymentMethod: { type: String, enum: ["cash", "card", "promptpay", "none"], default: "none" },
    amountReceived: { type: Number, default: 0 },
    paidAt: { type: Date },
    closedAt: { type: Date },

    // Session lifetime (used both for auto-clean and optional client checks)
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Auto-delete the doc after expiresAt (MongoDB TTL index)
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Session", sessionSchema);