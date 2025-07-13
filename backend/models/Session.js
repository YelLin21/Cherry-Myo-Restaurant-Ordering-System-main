const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  tableId: { type: mongoose.Schema.Types.ObjectId, ref: "Table" },
  sessionToken: String,
  expiresAt: Date,
});

module.exports = mongoose.model("Session", sessionSchema);
