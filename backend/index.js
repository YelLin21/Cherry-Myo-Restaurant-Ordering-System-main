const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB is connected"))
  .catch((err) => console.error(err));

app.use("/api/menu", require("./routes/menu")); // update this if needed

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
