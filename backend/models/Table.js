const mongoose = require("mongoose");

const tableSchema = new mongoose.Schema({
  number: Number,
  latitude: Number,
  longitude: Number,
});

module.exports = mongoose.model("Table", tableSchema);
