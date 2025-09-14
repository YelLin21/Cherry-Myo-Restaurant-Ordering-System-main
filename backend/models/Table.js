import mongoose from "mongoose";

const tableSchema = new mongoose.Schema({
  number: Number,
  latitude: Number,
  longitude: Number,
});

export default mongoose.model("Table", tableSchema);
