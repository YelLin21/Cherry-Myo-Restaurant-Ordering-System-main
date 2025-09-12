import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: "Table" },
  sessionToken: String,
  expiresAt: Date,
});

export default mongoose.model("Session", sessionSchema);
