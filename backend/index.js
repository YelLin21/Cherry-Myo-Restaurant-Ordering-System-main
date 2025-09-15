<<<<<<< Updated upstream
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config({ path: "../.env" });
 
=======
import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

>>>>>>> Stashed changes
const app = express();

const server = http.createServer(app);

app.get('/health', (_, res) => res.send('ok'));

const allowedOrigins = [
<<<<<<< Updated upstream
  "http://localhost:5173",
  "https://cherry-myo-restaurant-ordering-system-main.vercel.app"
  
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

=======
  "http://localhost:5173", // vite dev
  "http://127.0.0.1:5173", // sometimes vite uses 127.0.0.1
  "http://localhost:3000", // if you also run React on 3000
  "https://your-production-domain.com"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS: " + origin));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
>>>>>>> Stashed changes
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

app.set("io", io);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});

app.use("/api/menu", require("./routes/menu"));
app.use("/api/orders", require("./routes/order"));
app.use("/api/qr", require("./routes/qrCode"));
app.use("/api/session", require("./routes/session"));
app.use("/api/analytics", require("./routes/analytics"));
app.use("/api/feedback", require('./routes/feedback'));
app.use("/api/checkouts", require("./routes/checkout"));

const PORT = process.env.API_PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
