const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

// ✅ Configure CORS properly
app.use(cors({
  origin: "http://localhost:5173", // ✅ Replace with your frontend URL if deployed
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());

// ✅ Set up Socket.io
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // ✅ Match this with frontend
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

app.set("io", io); // So we can access it in routes

// ✅ MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Socket.io connection
io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});

// ✅ API routes
app.use("/api/menu", require("./routes/menu"));
app.use("/api/orders", require("./routes/order")); // move after express.json()
 

// ✅ Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
